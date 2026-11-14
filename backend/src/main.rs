// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let mut args = std::env::args_os().skip(1);
    if args.next().as_deref() == Some(std::ffi::OsStr::new("--mcp")) {
        if let Err(error) = lemno_mcp::run_cli(args) {
            eprintln!("Lemno MCP error: {error}");
            std::process::exit(1);
        }
        return;
    }
    lemno_lib::run()
}
