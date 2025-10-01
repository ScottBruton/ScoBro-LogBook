#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Main entrypoint for the Tauri backend. This file initializes the
// SQLite database and launches the application. You can extend this 
// file to expose additional commands to the frontend using the 
// `tauri::generate_handler!` macro.

use std::sync::Arc;
use tokio::sync::Mutex;
// use tauri::Manager; // Not needed for now

mod database;
mod commands;

use database::Database;
use commands::{AppState, create_entry, get_all_entries, delete_entry_item, delete_entry, export_entries_csv, export_entries_markdown, create_project, get_all_projects, update_project, delete_project, create_tag, get_all_tags, update_tag, delete_tag, create_meeting, get_all_meetings, add_meeting_attendee, get_meeting_attendees, create_meeting_action, get_meeting_actions, delete_meeting};


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
          export_entries_markdown,
          create_project,
          get_all_projects,
          update_project,
          delete_project,
          create_tag,
          get_all_tags,
          update_tag,
          delete_tag,
          create_meeting,
          get_all_meetings,
          add_meeting_attendee,
          get_meeting_attendees,
          create_meeting_action,
          get_meeting_actions,
          delete_meeting
        ])
    .setup(|_app| {
      // Note: Global shortcuts are not available in Tauri 1.x
      // Users can use the tray menu or the New Entry button instead
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running Tauri application");
}