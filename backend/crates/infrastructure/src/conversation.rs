use lemno_domain::{
    Conversation, ConversationDetail, ConversationInput, ConversationRepository, Error, Expression,
    Topic, TopicInput,
};
use rusqlite::{Connection, OptionalExtension, params};
use uuid::Uuid;

use crate::{SqliteVocabularyRepository, create_vocabulary_in, storage};

const TOPIC_SELECT: &str = "SELECT id, category, title, scenario, learner_role, ai_role, objective, difficulty FROM topics";
const SESSION_SELECT: &str =
    "SELECT id, title, ai, duration_minutes, notes, occurred_at FROM conversation_sessions";

fn topic_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Topic> {
    Ok(Topic {
        id: row.get(0)?,
        input: TopicInput {
            category: row.get(1)?,
            title: row.get(2)?,
            scenario: row.get(3)?,
            learner_role: row.get(4)?,
            ai_role: row.get(5)?,
            objective: row.get(6)?,
            difficulty: row.get(7)?,
        },
    })
}

fn session_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Conversation> {
    Ok(Conversation {
        id: row.get(0)?,
        title: row.get(1)?,
        ai: row.get(2)?,
        duration_minutes: row.get(3)?,
        notes: row.get(4)?,
        occurred_at: row.get(5)?,
    })
}

fn get_topic(connection: &Connection, profile_id: &str, id: &str) -> Result<Topic, Error> {
    connection
        .query_row(
            &format!("{TOPIC_SELECT} WHERE profile_id = ?1 AND id = ?2"),
            params![profile_id, id],
            topic_row,
        )
        .optional()
        .map_err(storage)?
        .ok_or(Error::NotFound)
}

fn get_session(
    connection: &Connection,
    profile_id: &str,
    id: &str,
) -> Result<ConversationDetail, Error> {
    let conversation = connection
        .query_row(
            &format!("{SESSION_SELECT} WHERE profile_id = ?1 AND id = ?2 AND status = 'recorded'"),
            params![profile_id, id],
            session_row,
        )
        .optional()
        .map_err(storage)?
        .ok_or(Error::NotFound)?;
    let expressions = |table: &str, condition: &str| -> Result<Vec<Expression>, Error> {
        let mut statement = connection
            .prepare(&format!(
                "SELECT i.id, i.text, i.kind FROM learning_items i JOIN {table} r
             ON r.learning_item_id = i.id AND r.profile_id = i.profile_id
             WHERE r.session_id = ?1 AND r.profile_id = ?2 {condition} ORDER BY i.rowid"
            ))
            .map_err(storage)?;
        statement
            .query_map(params![id, profile_id], |row| {
                Ok(Expression {
                    id: row.get(0)?,
                    text: row.get(1)?,
                    kind: row.get(2)?,
                })
            })
            .map_err(storage)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(storage)
    };
    Ok(ConversationDetail {
        conversation,
        used_items: expressions(
            "usage_records",
            "AND COALESCE(r.manual_usage_count, r.ai_usage_count) > 0",
        )?,
        learned_items: expressions("session_learning_items", "")?,
    })
}

impl ConversationRepository for SqliteVocabularyRepository {
    fn topics(&self, profile_id: &str) -> Result<Vec<Topic>, Error> {
        let connection = self.connection.lock().map_err(storage)?;
        let mut statement = connection
            .prepare(&format!(
                "{TOPIC_SELECT} WHERE profile_id = ?1 ORDER BY rowid"
            ))
            .map_err(storage)?;
        statement
            .query_map([profile_id], topic_row)
            .map_err(storage)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(storage)
    }

    fn save_topic(
        &self,
        profile_id: &str,
        id: Option<&str>,
        input: &TopicInput,
    ) -> Result<Topic, Error> {
        let mut connection = self.connection.lock().map_err(storage)?;
        let tx = connection.transaction().map_err(storage)?;
        let id = if let Some(id) = id {
            get_topic(&tx, profile_id, id)?;
            tx.execute(
                "UPDATE topics SET category = ?1, title = ?2, scenario = ?3, learner_role = ?4,
                 ai_role = ?5, objective = ?6, difficulty = ?7,
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?8 AND profile_id = ?9",
                params![input.category, input.title, input.scenario, input.learner_role, input.ai_role,
                    input.objective, input.difficulty, id, profile_id],
            ).map_err(storage)?;
            id.to_owned()
        } else {
            let id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO topics (category, title, scenario, learner_role, ai_role, objective,
                 difficulty, id, profile_id, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9,
                    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
                params![
                    input.category,
                    input.title,
                    input.scenario,
                    input.learner_role,
                    input.ai_role,
                    input.objective,
                    input.difficulty,
                    id,
                    profile_id
                ],
            )
            .map_err(storage)?;
            id
        };
        let topic = get_topic(&tx, profile_id, &id)?;
        tx.commit().map_err(storage)?;
        Ok(topic)
    }

    fn delete_topic(&self, profile_id: &str, id: &str) -> Result<(), Error> {
        let connection = self.connection.lock().map_err(storage)?;
        let affected = connection
            .execute(
                "DELETE FROM topics WHERE profile_id = ?1 AND id = ?2",
                params![profile_id, id],
            )
            .map_err(storage)?;
        if affected == 0 {
            return Err(Error::NotFound);
        }
        Ok(())
    }

    fn conversations(&self, profile_id: &str) -> Result<Vec<Conversation>, Error> {
        let connection = self.connection.lock().map_err(storage)?;
        let mut statement = connection
            .prepare(&format!(
                "{SESSION_SELECT} WHERE profile_id = ?1 AND status = 'recorded'
             ORDER BY occurred_at DESC, rowid DESC"
            ))
            .map_err(storage)?;
        statement
            .query_map([profile_id], session_row)
            .map_err(storage)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(storage)
    }

    fn conversation(&self, profile_id: &str, id: &str) -> Result<ConversationDetail, Error> {
        let connection = self.connection.lock().map_err(storage)?;
        get_session(&connection, profile_id, id)
    }

    fn record(
        &self,
        profile_id: &str,
        input: &ConversationInput,
    ) -> Result<ConversationDetail, Error> {
        let mut connection = self.connection.lock().map_err(storage)?;
        let tx = connection
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(storage)?;
        let exists: bool = tx
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM conversation_sessions WHERE id = ?1)",
                [&input.id],
                |r| r.get(0),
            )
            .map_err(storage)?;
        // A retry of a successful save returns the same session and never duplicates learning items.
        if exists {
            return get_session(&tx, profile_id, &input.id);
        }
        let title = input
            .topic_id
            .as_deref()
            .map(|id| get_topic(&tx, profile_id, id).map(|topic| topic.input.title))
            .transpose()?
            .unwrap_or_default();
        tx.execute(
            "INSERT INTO conversation_sessions
             (id, profile_id, topic_id, status, occurred_at, title, ai, duration_minutes, notes)
             VALUES (?1, ?2, ?3, 'recorded', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), ?4, ?5, ?6, ?7)",
            params![input.id, profile_id, input.topic_id, title, input.ai, input.duration_minutes, input.notes],
        ).map_err(storage)?;
        for id in &input.used_item_ids {
            // The composite foreign key enforces membership in the same learning profile.
            tx.execute(
                "INSERT INTO usage_records
                 (session_id, learning_item_id, profile_id, manual_usage_count, recorded_at, manual_updated_at)
                 VALUES (?1, ?2, ?3, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
                params![input.id, id, profile_id],
            ).map_err(storage)?;
        }
        for item in &input.learned_items {
            let item = create_vocabulary_in(&tx, profile_id, item)?;
            tx.execute(
                "INSERT INTO session_learning_items (session_id, learning_item_id, profile_id) VALUES (?1, ?2, ?3)",
                params![input.id, item.id, profile_id],
            ).map_err(storage)?;
        }
        let detail = get_session(&tx, profile_id, &input.id)?;
        tx.commit().map_err(storage)?;
        Ok(detail)
    }
}
