use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::database::{Database, EntryWithItems, EntryItemWithMetadata};

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEntryRequest {
    pub timestamp: String,
    pub items: Vec<CreateItemRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateItemRequest {
    pub item_type: String,
    pub content: String,
    pub project: Option<String>,
    pub tags: Vec<String>,
    pub jira: Vec<String>,
    pub people: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EntryResponse {
    pub id: String,
    pub timestamp: String,
    pub items: Vec<ItemResponse>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ItemResponse {
    pub id: String,
    pub item_type: String,
    pub content: String,
    pub project: Option<String>,
    pub tags: Vec<String>,
    pub jira: Vec<String>,
    pub people: Vec<String>,
}

pub type AppState = Arc<Mutex<Database>>;

#[tauri::command]
pub async fn create_entry(
    state: State<'_, AppState>,
    request: CreateEntryRequest,
) -> Result<EntryResponse, String> {
    let db = state.lock().await;
    
    let timestamp = DateTime::parse_from_rfc3339(&request.timestamp)
        .map_err(|e| format!("Invalid timestamp: {}", e))?
        .with_timezone(&Utc);

    let entry = db.create_entry(timestamp)
        .await
        .map_err(|e| format!("Failed to create entry: {}", e))?;

    let mut items = Vec::new();
    
    for item_req in request.items {
        let entry_item = db.create_entry_item(
            &entry.id,
            &item_req.item_type,
            &item_req.content,
            item_req.project.as_deref(),
        )
        .await
        .map_err(|e| format!("Failed to create entry item: {}", e))?;

        // Create and link tags
        for tag_name in item_req.tags {
            let tag = db.get_or_create_tag(&tag_name)
                .await
                .map_err(|e| format!("Failed to create tag: {}", e))?;
            db.link_item_tag(&entry_item.id, &tag.id)
                .await
                .map_err(|e| format!("Failed to link tag: {}", e))?;
        }

        // Create and link people
        for person_name in item_req.people {
            let person = db.get_or_create_person(&person_name)
                .await
                .map_err(|e| format!("Failed to create person: {}", e))?;
            db.link_item_person(&entry_item.id, &person.id)
                .await
                .map_err(|e| format!("Failed to link person: {}", e))?;
        }

        // Create Jira refs
        for jira_key in item_req.jira {
            db.create_jira_ref(&entry_item.id, &jira_key)
                .await
                .map_err(|e| format!("Failed to create Jira ref: {}", e))?;
        }

        items.push(ItemResponse {
            id: entry_item.id,
            item_type: entry_item.item_type,
            content: entry_item.content,
            project: entry_item.project,
            tags: item_req.tags,
            jira: item_req.jira,
            people: item_req.people,
        });
    }

    Ok(EntryResponse {
        id: entry.id,
        timestamp: entry.timestamp.to_rfc3339(),
        items,
    })
}

#[tauri::command]
pub async fn get_all_entries(state: State<'_, AppState>) -> Result<Vec<EntryResponse>, String> {
    let db = state.lock().await;
    
    let entries_with_items = db.get_all_entries_with_items()
        .await
        .map_err(|e| format!("Failed to get entries: {}", e))?;

    let mut result = Vec::new();
    
    for entry_with_items in entries_with_items {
        let items: Vec<ItemResponse> = entry_with_items.items
            .into_iter()
            .map(|item_with_metadata| ItemResponse {
                id: item_with_metadata.item.id,
                item_type: item_with_metadata.item.item_type,
                content: item_with_metadata.item.content,
                project: item_with_metadata.item.project,
                tags: item_with_metadata.tags.into_iter().map(|t| t.name).collect(),
                jira: item_with_metadata.jira_refs.into_iter().map(|j| j.jira_key).collect(),
                people: item_with_metadata.people.into_iter().map(|p| p.name).collect(),
            })
            .collect();

        result.push(EntryResponse {
            id: entry_with_items.entry.id,
            timestamp: entry_with_items.entry.timestamp.to_rfc3339(),
            items,
        });
    }

    Ok(result)
}

#[tauri::command]
pub async fn delete_entry_item(
    state: State<'_, AppState>,
    entry_item_id: String,
) -> Result<(), String> {
    let db = state.lock().await;
    
    db.delete_entry_item(&entry_item_id)
        .await
        .map_err(|e| format!("Failed to delete entry item: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_entry(
    state: State<'_, AppState>,
    entry_id: String,
) -> Result<(), String> {
    let db = state.lock().await;
    
    db.delete_entry(&entry_id)
        .await
        .map_err(|e| format!("Failed to delete entry: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn export_entries_csv(state: State<'_, AppState>) -> Result<String, String> {
    let db = state.lock().await;
    
    let entries_with_items = db.get_all_entries_with_items()
        .await
        .map_err(|e| format!("Failed to get entries: {}", e))?;

    let mut csv = String::from("Date,Time,Type,Content,Project,Tags,Jira,People\n");
    
    for entry_with_items in entries_with_items {
        let date = entry_with_items.entry.timestamp.format("%Y-%m-%d").to_string();
        let time = entry_with_items.entry.timestamp.format("%H:%M:%S").to_string();
        
        for item_with_metadata in entry_with_items.items {
            let tags = item_with_metadata.tags.into_iter().map(|t| t.name).collect::<Vec<_>>().join(";");
            let jira = item_with_metadata.jira_refs.into_iter().map(|j| j.jira_key).collect::<Vec<_>>().join(";");
            let people = item_with_metadata.people.into_iter().map(|p| p.name).collect::<Vec<_>>().join(";");
            
            csv.push_str(&format!(
                "{},{},{},\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n",
                date,
                time,
                item_with_metadata.item.item_type,
                item_with_metadata.item.content.replace("\"", "\"\""),
                item_with_metadata.item.project.unwrap_or_default(),
                tags,
                jira,
                people
            ));
        }
    }
    
    Ok(csv)
}

#[tauri::command]
pub async fn export_entries_markdown(state: State<'_, AppState>) -> Result<String, String> {
    let db = state.lock().await;
    
    let entries_with_items = db.get_all_entries_with_items()
        .await
        .map_err(|e| format!("Failed to get entries: {}", e))?;

    let mut markdown = String::from("# ScoBro Logbook Export\n\n");
    
    for entry_with_items in entries_with_items {
        let date = entry_with_items.entry.timestamp.format("%Y-%m-%d").to_string();
        let time = entry_with_items.entry.timestamp.format("%H:%M:%S").to_string();
        
        markdown.push_str(&format!("## {} {}\n\n", date, time));
        
        for item_with_metadata in entry_with_items.items {
            let type_emoji = match item_with_metadata.item.item_type.as_str() {
                "Action" => "🔴",
                "Decision" => "🔵", 
                "Note" => "🟢",
                "Meeting" => "🟣",
                _ => "📝",
            };
            
            markdown.push_str(&format!("### {} {}\n", type_emoji, item_with_metadata.item.item_type));
            markdown.push_str(&format!("{}\n\n", item_with_metadata.item.content));
            
            if let Some(project) = &item_with_metadata.item.project {
                if !project.is_empty() {
                    markdown.push_str(&format!("**Project:** 📂 {}\n\n", project));
                }
            }
            
            if !item_with_metadata.tags.is_empty() {
                let tags = item_with_metadata.tags.into_iter().map(|t| t.name).collect::<Vec<_>>().join(", ");
                markdown.push_str(&format!("**Tags:** 🏷 {}\n\n", tags));
            }
            
            if !item_with_metadata.jira_refs.is_empty() {
                let jira = item_with_metadata.jira_refs.into_iter().map(|j| j.jira_key).collect::<Vec<_>>().join(", ");
                markdown.push_str(&format!("**Jira:** 🧩 {}\n\n", jira));
            }
            
            if !item_with_metadata.people.is_empty() {
                let people = item_with_metadata.people.into_iter().map(|p| p.name).collect::<Vec<_>>().join(", ");
                markdown.push_str(&format!("**People:** 👤 {}\n\n", people));
            }
            
            markdown.push_str("---\n\n");
        }
    }
    
    Ok(markdown)
}
