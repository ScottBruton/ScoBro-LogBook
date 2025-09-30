#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Main entrypoint for the Tauri backend. This file wires up the
// required plugins (updater, notification, global shortcut, tray) and
// launches the application. You can extend this file to expose
// additional commands to the frontend using the `tauri::generate_handler!`
// macro.

use tauri::{Manager, CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu};
use std::sync::Arc;
use tokio::sync::Mutex;

mod database;
mod commands;

use database::Database;
use commands::{AppState, create_entry, get_all_entries, delete_entry_item, delete_entry, export_entries_csv, export_entries_markdown};

#[tokio::main]
async fn main() {
  // Initialize database
  let database = Database::new().await.expect("Failed to initialize database");
  let app_state: AppState = Arc::new(Mutex::new(database));

  // Build a simple tray menu with an update check and quit actions.
  let check_updates = CustomMenuItem::new("check_updates".to_string(), "Check for Updates");
  let quick_add = CustomMenuItem::new("quick_add".to_string(), "Quick Add Note");
  let quit = CustomMenuItem::new("quit".to_string(), "Quit");
  let tray_menu = SystemTrayMenu::new()
    .add_item(quick_add)
    .add_item(check_updates)
    .add_item(quit);
  let system_tray = SystemTray::new().with_menu(tray_menu);

  tauri::Builder::default()
    .manage(app_state)
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_global_shortcut::init())
    .plugin(tauri_plugin_tray::init())
    .plugin(tauri_plugin_autostart::init())
    .system_tray(system_tray)
    .invoke_handler(tauri::generate_handler![
      create_entry,
      get_all_entries,
      delete_entry_item,
      delete_entry,
      export_entries_csv,
      export_entries_markdown
    ])
    .on_system_tray_event(|app, event| match event {
      SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
        "quick_add" => {
          // Show the main window and focus on it
          if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
            // Emit event to frontend to open popup
            let _ = window.emit("quick-add", ());
          }
        }
        "check_updates" => {
          let app_handle = app.app_handle();
          tauri::async_runtime::spawn(async move {
            if let Ok(update) = app_handle.updater().unwrap().check().await {
              if let Some(update) = update {
                // Download and install update with progress notifications
                let _ = update.download_and_install(|downloaded, total| {
                  let percent = (downloaded as f64 / total as f64) * 100.0;
                  let _ = tauri_plugin_notification::Notification::new("scoBro-logbook-update")
                    .title("ScoBro Logbook")
                    .body(&format!("Downloading update… {:.0}%", percent))
                    .show();
                }).await;
                let _ = tauri_plugin_notification::Notification::new("scoBro-logbook-update")
                  .title("ScoBro Logbook")
                  .body("Update installed. Restarting…")
                  .show();
                let _ = app_handle.restart();
              } else {
                let _ = tauri_plugin_notification::Notification::new("scoBro-logbook-update")
                  .title("ScoBro Logbook")
                  .body("No updates available.")
                  .show();
              }
            }
          });
        }
        "quit" => {
          std::process::exit(0);
        }
        _ => {}
      },
      _ => {}
    })
    .run(tauri::generate_context!())
    .expect("error while running Tauri application");
}