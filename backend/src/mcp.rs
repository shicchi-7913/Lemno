use std::path::PathBuf;

use lemno_mcp::{ConnectionConfig, check_connection};
use tauri::State;

mod codex;

pub struct McpConnection {
    pub executable: PathBuf,
    pub database: PathBuf,
    pub codex_config: PathBuf,
}

impl McpConnection {
    fn config(&self) -> Result<ConnectionConfig, String> {
        ConnectionConfig::new(&self.executable, &self.database).map_err(|error| error.to_string())
    }
}

#[tauri::command]
pub(crate) fn get_codex_status(
    connection: State<'_, McpConnection>,
) -> Result<codex::CodexStatus, String> {
    codex::status(&connection.codex_config, &connection.config()?)
}

#[tauri::command]
pub(crate) async fn connect_codex(
    connection: State<'_, McpConnection>,
) -> Result<codex::CodexStatus, String> {
    let config = connection.config()?;
    let test_config = connection.config()?;
    let path = connection.codex_config.clone();
    check_connection(test_config).await.map_err(|error| {
        eprintln!("Lemno MCP connection failed: {error}");
        "mcpConnectionFailed".to_owned()
    })?;
    tauri::async_runtime::spawn_blocking(move || codex::register(&path, &config))
        .await
        .map_err(|_| "codexConfigWriteError".to_owned())?
}
