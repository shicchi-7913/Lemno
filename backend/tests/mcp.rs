use std::{path::Path, time::SystemTime};

use lemno_mcp::{ConnectionConfig, check_connection};

#[test]
fn desktop_executable_serves_mcp_without_opening_a_window() {
    let directory = std::env::temp_dir().join(format!(
        "lemno-stdio-{}-{}",
        std::process::id(),
        SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    std::fs::create_dir_all(&directory).unwrap();
    let database = directory.join("lemno.sqlite3");
    let runtime = tokio::runtime::Runtime::new().unwrap();
    for language in ["en", "ja"] {
        std::fs::write(
            directory.join("learning-language.json"),
            format!("{{\"language\":\"{language}\"}}"),
        )
        .unwrap();
        let config =
            ConnectionConfig::new(Path::new(env!("CARGO_BIN_EXE_lemno")), &database).unwrap();
        assert_eq!(runtime.block_on(check_connection(config)).unwrap(), 1);
    }
    std::fs::remove_dir_all(directory).unwrap();
}

#[test]
fn connection_test_reports_an_unlaunchable_server() {
    let config = ConnectionConfig {
        command: "/nonexistent/lemno-mcp-test".into(),
        args: vec![],
    };
    assert!(
        tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(check_connection(config))
            .is_err()
    );
}
