use std::{ffi::OsString, path::Path, time::Duration};

use rmcp::{ServiceExt, model::CallToolRequestParams, transport::TokioChildProcess};
use serde::Serialize;

mod server;
pub use server::LearningServer;

pub type McpResult<T> = Result<T, Box<dyn std::error::Error + Send + Sync>>;

#[derive(Debug, Serialize)]
pub struct ConnectionConfig {
    pub command: String,
    pub args: Vec<String>,
}

impl ConnectionConfig {
    pub fn new(executable: &Path, database: &Path) -> McpResult<Self> {
        Ok(Self {
            command: executable.to_str().ok_or("Invalid executable path")?.into(),
            args: vec![
                "--mcp".into(),
                "--database".into(),
                database.to_str().ok_or("Invalid database path")?.into(),
            ],
        })
    }
}

/// Runs before Tauri starts, so MCP clients never launch a second application window.
pub fn run_stdio(database: &Path) -> McpResult<()> {
    let server = LearningServer::open(database)?;
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?
        .block_on(async move {
            let service = server.serve(rmcp::transport::stdio()).await?;
            service.waiting().await?;
            Ok(())
        })
}

pub fn run_cli(args: impl IntoIterator<Item = OsString>) -> McpResult<()> {
    let mut args = args.into_iter();
    let mut database = None;
    let mut legacy_profile = false;
    while let Some(arg) = args.next() {
        match arg.to_str() {
            Some("--database") if database.is_none() => {
                database = Some(args.next().ok_or("Missing --database value")?);
            }
            // Keep old registrations working, but always use Lemno's current language.
            Some("--profile") if !legacy_profile => {
                let profile = args.next().ok_or("Missing --profile value")?;
                if !matches!(profile.to_str(), Some("default-en" | "default-ja")) {
                    return Err("Unsupported learning profile".into());
                }
                legacy_profile = true;
            }
            _ => {
                return Err("Usage: lemno --mcp --database <path>".into());
            }
        }
    }
    let database = database.ok_or("Missing --database")?;
    run_stdio(Path::new(&database))
}

/// Test the actual executable, handshake, tool discovery and a read-only database query.
pub async fn check_connection(config: ConnectionConfig) -> McpResult<usize> {
    tokio::time::timeout(Duration::from_secs(15), async move {
        let mut command = tokio::process::Command::new(&config.command);
        command.args(&config.args).kill_on_drop(true);
        let client = ().serve(TokioChildProcess::new(command)?).await?;
        let result = async {
            let tools = client.list_all_tools().await?;
            let topics = client
                .call_tool(CallToolRequestParams::new("list_topics"))
                .await?;
            if topics.is_error == Some(true) {
                return Err("Could not read learning data".into());
            }
            Ok(tools.len())
        }
        .await;
        client.cancel().await?;
        result
    })
    .await?
}
