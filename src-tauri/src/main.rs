#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Main entrypoint for the Tauri backend. This file initializes the
// SQLite database and launches the application. You can extend this 
// file to expose additional commands to the frontend using the 
// `tauri::generate_handler!` macro.

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{
  Manager, GlobalShortcutManager, AppHandle
};

mod database;
mod commands;

use database::Database;
use commands::{AppState, create_entry, get_all_entries, delete_entry_item, delete_entry, export_entries_csv, export_entries_markdown};


#[tokio::main]
async fn main() {
  // Initialize database
  let database = Database::new().await.expect("Failed to initialize database");
  let app_state: AppState = Arc::new(Mutex::new(database));

  tauri::Builder::default()
    .manage(app_state)
    .invoke_handler(tauri::generate_handler![
      create_entry,
      get_all_entries,
      delete_entry_item,
      delete_entry,
      export_entries_csv,
      export_entries_markdown
    ])
    .setup(|app| {
      // Set up global shortcuts
      let app_handle = app.handle().clone();
      let mut shortcut_manager = app.global_shortcut_manager();
      shortcut_manager.register("Ctrl+Alt+N", move || {
        app_handle.emit_all("quick-add", ()).unwrap();
      }).unwrap();
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running Tauri application");
}