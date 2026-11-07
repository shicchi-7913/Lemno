use std::{path::Path, sync::Mutex, time::Duration};

use lemno_domain::{Error, Vocabulary, VocabularyInput, VocabularyRepository};
use rusqlite::{Connection, OptionalExtension, params};
use uuid::Uuid;

pub struct SqliteVocabularyRepository {
    connection: Mutex<Connection>,
}

fn storage(error: impl std::fmt::Display) -> Error {
    Error::Storage(error.to_string())
}

const SELECT: &str = "SELECT i.id, i.profile_id, i.text, i.explanation, i.example_text,
    COALESCE(s.memory_level, 0),
    (SELECT COUNT(*) FROM review_records r WHERE r.learning_item_id = i.id),
    COALESCE((SELECT SUM(COALESCE(u.manual_usage_count, u.ai_usage_count))
        FROM usage_records u JOIN conversation_sessions c ON c.id = u.session_id
        WHERE u.learning_item_id = i.id AND c.status = 'recorded'), 0),
    i.created_at, i.updated_at
    FROM learning_items i LEFT JOIN review_states s ON s.learning_item_id = i.id";

fn row_to_vocabulary(row: &rusqlite::Row<'_>) -> rusqlite::Result<Vocabulary> {
    Ok(Vocabulary {
        id: row.get(0)?,
        profile_id: row.get(1)?,
        text: row.get(2)?,
        explanation: row.get(3)?,
        example_text: row.get(4)?,
        memory_level: row.get(5)?,
        review_count: row.get(6)?,
        usage_count: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

fn get(connection: &Connection, profile_id: &str, id: &str) -> Result<Vocabulary, Error> {
    connection
        .query_row(
            &format!("{SELECT} WHERE i.profile_id = ?1 AND i.id = ?2 AND i.kind = 'word'"),
            params![profile_id, id],
            row_to_vocabulary,
        )
        .optional()
        .map_err(storage)?
        .ok_or(Error::NotFound)
}

impl SqliteVocabularyRepository {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, Error> {
        let mut connection = Connection::open(path).map_err(storage)?;
        connection
            .busy_timeout(Duration::from_secs(5))
            .map_err(storage)?;
        connection
            .pragma_update(None, "foreign_keys", "ON")
            .map_err(storage)?;
        connection
            .pragma_update(None, "journal_mode", "WAL")
            .map_err(storage)?;
        // The write lock also serializes migration against another process opening the DB.
        let tx = connection
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(storage)?;
        let version: i64 = tx
            .pragma_query_value(None, "user_version", |r| r.get(0))
            .map_err(storage)?;
        if version == 0 {
            tx.execute_batch(include_str!("../migrations/0001_initial.sql"))
                .map_err(storage)?;
            tx.pragma_update(None, "user_version", 1).map_err(storage)?;
        } else if version != 1 {
            return Err(Error::Storage("Unsupported database version".into()));
        }
        tx.commit().map_err(storage)?;
        Ok(Self {
            connection: Mutex::new(connection),
        })
    }
}

impl VocabularyRepository for SqliteVocabularyRepository {
    fn list(&self, profile_id: &str) -> Result<Vec<Vocabulary>, Error> {
        let connection = self.connection.lock().map_err(storage)?;
        let mut statement = connection.prepare(&format!(
            "{SELECT} WHERE i.profile_id = ?1 AND i.kind = 'word' ORDER BY i.created_at DESC, i.rowid DESC"
        )).map_err(storage)?;
        statement
            .query_map([profile_id], row_to_vocabulary)
            .map_err(storage)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(storage)
    }

    fn create(&self, profile_id: &str, input: &VocabularyInput) -> Result<Vocabulary, Error> {
        let mut connection = self.connection.lock().map_err(storage)?;
        let tx = connection.transaction().map_err(storage)?;
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO learning_items (id, profile_id, kind, text, explanation, example_text)
             VALUES (?1, ?2, 'word', ?3, ?4, ?5)",
            params![
                id,
                profile_id,
                input.text,
                input.explanation,
                input.example_text
            ],
        )
        .map_err(storage)?;
        tx.execute(
            "INSERT INTO review_states (learning_item_id) VALUES (?1)",
            [&id],
        )
        .map_err(storage)?;
        let item = get(&tx, profile_id, &id)?;
        tx.commit().map_err(storage)?;
        Ok(item)
    }

    fn update(
        &self,
        profile_id: &str,
        id: &str,
        input: &VocabularyInput,
    ) -> Result<Vocabulary, Error> {
        let mut connection = self.connection.lock().map_err(storage)?;
        let tx = connection.transaction().map_err(storage)?;
        let affected = tx
            .execute(
                "UPDATE learning_items SET text = ?1, explanation = ?2, example_text = ?3,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?4 AND profile_id = ?5 AND kind = 'word'",
                params![
                    input.text,
                    input.explanation,
                    input.example_text,
                    id,
                    profile_id
                ],
            )
            .map_err(storage)?;
        if affected == 0 {
            return Err(Error::NotFound);
        }
        let item = get(&tx, profile_id, id)?;
        tx.commit().map_err(storage)?;
        Ok(item)
    }

    fn delete(&self, profile_id: &str, id: &str) -> Result<(), Error> {
        let connection = self.connection.lock().map_err(storage)?;
        let affected = connection
            .execute(
                "DELETE FROM learning_items WHERE id = ?1 AND profile_id = ?2 AND kind = 'word'",
                params![id, profile_id],
            )
            .map_err(storage)?;
        if affected == 0 {
            return Err(Error::NotFound);
        }
        Ok(())
    }
}
