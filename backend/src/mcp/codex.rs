use std::{
    fs::{self, OpenOptions},
    io::{ErrorKind, Write},
    path::Path,
    sync::Mutex,
};

use lemno_mcp::ConnectionConfig;
use serde::Serialize;
use toml_edit::{Array, DocumentMut, Item, Table, value};

static CONFIG_WRITE: Mutex<()> = Mutex::new(());

#[derive(Serialize)]
pub(crate) struct CodexStatus {
    registered: bool,
    current: bool,
}

fn read(path: &Path) -> Result<(String, DocumentMut), String> {
    let source = match fs::read_to_string(path) {
        Ok(source) => source,
        Err(error) if error.kind() == ErrorKind::NotFound => String::new(),
        Err(_) => return Err("codexConfigReadError".into()),
    };
    let document = source
        .parse()
        .map_err(|_| "codexConfigInvalid".to_owned())?;
    Ok((source, document))
}

pub(super) fn status(path: &Path, config: &ConnectionConfig) -> Result<CodexStatus, String> {
    let (_, document) = read(path)?;
    let server = document
        .get("mcp_servers")
        .and_then(|servers| servers.get("lemno"));
    let current = server.is_some_and(|server| {
        server.get("command").and_then(Item::as_str) == Some(config.command.as_str())
            && server
                .get("args")
                .and_then(Item::as_array)
                .is_some_and(|args| {
                    let expected = config.args.len();
                    let compatible = args.len() == expected
                        || (args.len() == expected + 2
                            && args.get(expected).and_then(|arg| arg.as_str())
                                == Some("--profile")
                            && matches!(
                                args.get(expected + 1).and_then(|arg| arg.as_str()),
                                Some("default-en" | "default-ja")
                            ));
                    compatible
                        && args
                            .iter()
                            .take(expected)
                            .zip(&config.args)
                            .all(|(value, expected)| value.as_str() == Some(expected.as_str()))
                })
            && server
                .get("enabled")
                .is_none_or(|enabled| enabled.as_bool() == Some(true))
            && server.get("url").is_none()
            && server
                .get("environment_id")
                .is_none_or(|environment| environment.as_str() == Some("local"))
    });
    Ok(CodexStatus {
        registered: server.is_some(),
        current,
    })
}

pub(super) fn register(path: &Path, config: &ConnectionConfig) -> Result<CodexStatus, String> {
    let _lock = CONFIG_WRITE
        .lock()
        .map_err(|_| "codexConfigWriteError".to_owned())?;
    // Follow an existing symlink rather than replacing the user's linked config file.
    let path = match fs::symlink_metadata(path) {
        Ok(_) => fs::canonicalize(path).map_err(|_| "codexConfigReadError".to_owned())?,
        Err(error) if error.kind() == ErrorKind::NotFound => path.to_path_buf(),
        Err(_) => return Err("codexConfigReadError".into()),
    };
    let (source, mut document) = read(&path)?;
    let mut table = Table::new();
    table.set_implicit(true);
    let servers = document
        .as_table_mut()
        .entry("mcp_servers")
        .or_insert(Item::Table(table))
        .as_table_like_mut()
        .ok_or("codexConfigInvalid")?;
    if servers.get("lemno").is_none() {
        servers.insert("lemno", Item::Table(Table::new()));
    }
    let server = servers
        .get_mut("lemno")
        .and_then(Item::as_table_like_mut)
        .ok_or("codexConfigInvalid")?;
    // Replace only Lemno's launch settings, retaining tool policies and other servers.
    for key in [
        "url",
        "auth",
        "bearer_token_env_var",
        "http_headers",
        "env_http_headers",
        "http_headers_helper",
        "cwd",
    ] {
        server.remove(key);
    }
    server.insert("command", value(config.command.as_str()));
    let mut args = Array::new();
    for arg in &config.args {
        args.push(arg.as_str());
    }
    server.insert("args", value(args));
    server.insert("enabled", value(true));
    server.insert("environment_id", value("local"));

    let parent = path.parent().ok_or("codexConfigWriteError")?;
    fs::create_dir_all(parent).map_err(|_| "codexConfigWriteError".to_owned())?;
    let temporary = parent.join(format!(".lemno-{}.tmp", uuid::Uuid::new_v4()));
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options
        .open(&temporary)
        .map_err(|_| "codexConfigWriteError".to_owned())?;
    let saved = (|| -> Result<(), String> {
        if let Ok(metadata) = fs::metadata(&path) {
            file.set_permissions(metadata.permissions())
                .map_err(|_| "codexConfigWriteError".to_owned())?;
        }
        file.write_all(document.to_string().as_bytes())
            .map_err(|_| "codexConfigWriteError".to_owned())?;
        file.sync_all()
            .map_err(|_| "codexConfigWriteError".to_owned())?;
        if read(&path)?.0 != source {
            return Err("codexConfigChanged".into());
        }
        drop(file);
        fs::rename(&temporary, &path).map_err(|_| "codexConfigWriteError".to_owned())
    })();
    if saved.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    saved?;
    status(&path, config)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registration_replaces_stale_launch_settings_and_preserves_other_configuration() {
        let dir = std::env::temp_dir().join(format!("lemno-codex-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("config.toml");
        fs::write(
            &path,
            r#"# Keep my settings
model = 'my-model'
[mcp_servers.other]
command = 'other-server'
[mcp_servers.lemno]
command = 'node'
args = ['missing.mjs']
enabled = false
url = 'https://old.example/mcp'
disabled_tools = ['create_vocabulary']
"#,
        )
        .unwrap();
        let config = ConnectionConfig::new(
            Path::new("/Applications/Lemno App/lemno"),
            &dir.join("lemno.sqlite3"),
        )
        .unwrap();
        assert!(!status(&path, &config).unwrap().current);
        assert!(register(&path, &config).unwrap().current);
        let (source, mut document) = read(&path).unwrap();
        assert!(source.contains("# Keep my settings"));
        assert_eq!(document["model"].as_str(), Some("my-model"));
        assert_eq!(
            document["mcp_servers"]["other"]["command"].as_str(),
            Some("other-server")
        );
        assert_eq!(
            document["mcp_servers"]["lemno"]["disabled_tools"][0].as_str(),
            Some("create_vocabulary")
        );
        assert!(document["mcp_servers"]["lemno"].get("url").is_none());
        let legacy_args = document["mcp_servers"]["lemno"]["args"]
            .as_array_mut()
            .unwrap();
        legacy_args.push("--profile");
        legacy_args.push("default-en");
        fs::write(&path, document.to_string()).unwrap();
        assert!(status(&path, &config).unwrap().current);
        fs::write(dir.join("learning-language.json"), r#"{"language":"ja"}"#).unwrap();
        assert!(status(&path, &config).unwrap().current);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn registration_creates_missing_config_and_does_not_overwrite_invalid_toml() {
        let dir = std::env::temp_dir().join(format!("lemno-codex-{}", uuid::Uuid::new_v4()));
        let path = dir.join("config.toml");
        let config = ConnectionConfig {
            command: "lemno".into(),
            args: vec!["--mcp".into()],
        };
        assert!(!status(&path, &config).unwrap().registered);
        assert!(register(&path, &config).unwrap().current);
        fs::write(&path, "[broken").unwrap();
        assert!(register(&path, &config).is_err());
        assert_eq!(fs::read_to_string(&path).unwrap(), "[broken");
        fs::remove_dir_all(dir).unwrap();
    }
}
