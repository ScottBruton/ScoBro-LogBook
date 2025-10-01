use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::database::Database;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProjectRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTagRequest {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTagRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TagResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub category: Option<String>,
    pub created_at: String,
    pub updated_at: String,
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
        for tag_name in &item_req.tags {
            let tag = db.get_or_create_tag(tag_name)
                .await
                .map_err(|e| format!("Failed to create tag: {}", e))?;
            db.link_item_tag(&entry_item.id, &tag.id)
                .await
                .map_err(|e| format!("Failed to link tag: {}", e))?;
        }

        // Create and link people
        for person_name in &item_req.people {
            let person = db.get_or_create_person(person_name)
                .await
                .map_err(|e| format!("Failed to create person: {}", e))?;
            db.link_item_person(&entry_item.id, &person.id)
                .await
                .map_err(|e| format!("Failed to link person: {}", e))?;
        }

        // Create Jira refs
        for jira_key in &item_req.jira {
            db.create_jira_ref(&entry_item.id, jira_key)
                .await
                .map_err(|e| format!("Failed to create Jira ref: {}", e))?;
        }

        items.push(ItemResponse {
            id: entry_item.id,
            item_type: entry_item.item_type,
            content: entry_item.content,
            project: entry_item.project,
            tags: item_req.tags.clone(),
            jira: item_req.jira.clone(),
            people: item_req.people.clone(),
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

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateEntryItemRequest {
    pub content: Option<String>,
    pub project: Option<String>,
    pub tags: Option<Vec<String>>,
    pub jira: Option<Vec<String>>,
    pub people: Option<Vec<String>>,
}

#[tauri::command]
pub async fn update_entry_item(
    state: State<'_, AppState>,
    entry_item_id: String,
    updates: UpdateEntryItemRequest,
) -> Result<ItemResponse, String> {
    let db = state.lock().await;
    
    // Update the entry item content if provided
    if let Some(content) = updates.content {
        db.update_entry_item_content(&entry_item_id, &content)
            .await
            .map_err(|e| format!("Failed to update entry item content: {}", e))?;
    }
    
    // Update project if provided
    if let Some(project) = updates.project {
        db.update_entry_item_project(&entry_item_id, Some(&project))
            .await
            .map_err(|e| format!("Failed to update entry item project: {}", e))?;
    }
    
    // Update tags if provided
    if let Some(tags) = updates.tags {
        // First, remove existing tags
        db.remove_item_tags(&entry_item_id)
            .await
            .map_err(|e| format!("Failed to remove existing tags: {}", e))?;
        
        // Then add new tags
        for tag_name in tags {
            let tag = db.get_or_create_tag(&tag_name)
                .await
                .map_err(|e| format!("Failed to get or create tag: {}", e))?;
            db.link_item_tag(&entry_item_id, &tag.id)
                .await
                .map_err(|e| format!("Failed to link tag: {}", e))?;
        }
    }
    
    // Update people if provided
    if let Some(people) = updates.people {
        // First, remove existing people
        db.remove_item_people(&entry_item_id)
            .await
            .map_err(|e| format!("Failed to remove existing people: {}", e))?;
        
        // Then add new people
        for person_name in people {
            let person = db.get_or_create_person(&person_name)
                .await
                .map_err(|e| format!("Failed to get or create person: {}", e))?;
            db.link_item_person(&entry_item_id, &person.id)
                .await
                .map_err(|e| format!("Failed to link person: {}", e))?;
        }
    }
    
    // Update Jira refs if provided
    if let Some(jira_refs) = updates.jira {
        // First, remove existing Jira refs
        db.remove_item_jira_refs(&entry_item_id)
            .await
            .map_err(|e| format!("Failed to remove existing Jira refs: {}", e))?;
        
        // Then add new Jira refs
        for jira_key in jira_refs {
            db.create_jira_ref(&entry_item_id, &jira_key)
                .await
                .map_err(|e| format!("Failed to create Jira ref: {}", e))?;
        }
    }
    
    // Get the updated item with metadata
    let entry_with_items = db.get_entry_with_items(&entry_item_id)
        .await
        .map_err(|e| format!("Failed to get updated entry item: {}", e))?;
    
    if let Some(item_with_metadata) = entry_with_items.items.first() {
        Ok(ItemResponse {
            id: item_with_metadata.item.id.clone(),
            item_type: item_with_metadata.item.item_type.clone(),
            content: item_with_metadata.item.content.clone(),
            project: item_with_metadata.item.project.clone(),
            tags: item_with_metadata.tags.iter().map(|t| t.name.clone()).collect(),
            jira: item_with_metadata.jira_refs.iter().map(|j| j.jira_key.clone()).collect(),
            people: item_with_metadata.people.iter().map(|p| p.name.clone()).collect(),
        })
    } else {
        Err("Entry item not found".to_string())
    }
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

// Project management commands
#[tauri::command]
pub async fn create_project(
    state: State<'_, AppState>,
    request: CreateProjectRequest,
) -> Result<ProjectResponse, String> {
    let db = state.lock().await;
    
    let project = db.create_project(
        &request.name,
        request.description.as_deref(),
        request.color.as_deref(),
    )
    .await
    .map_err(|e| format!("Failed to create project: {}", e))?;

    Ok(ProjectResponse {
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        created_at: project.created_at.to_rfc3339(),
        updated_at: project.updated_at.to_rfc3339(),
    })
}

#[tauri::command]
pub async fn get_all_projects(state: State<'_, AppState>) -> Result<Vec<ProjectResponse>, String> {
    let db = state.lock().await;
    
    let projects = db.get_all_projects()
        .await
        .map_err(|e| format!("Failed to get projects: {}", e))?;

    let response = projects.into_iter().map(|project| ProjectResponse {
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        created_at: project.created_at.to_rfc3339(),
        updated_at: project.updated_at.to_rfc3339(),
    }).collect();

    Ok(response)
}

#[tauri::command]
pub async fn update_project(
    state: State<'_, AppState>,
    request: UpdateProjectRequest,
) -> Result<ProjectResponse, String> {
    let db = state.lock().await;
    
    let project = db.update_project(
        &request.id,
        request.name.as_deref(),
        request.description.as_deref(),
        request.color.as_deref(),
    )
    .await
    .map_err(|e| format!("Failed to update project: {}", e))?;

    Ok(ProjectResponse {
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        created_at: project.created_at.to_rfc3339(),
        updated_at: project.updated_at.to_rfc3339(),
    })
}

#[tauri::command]
pub async fn delete_project(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<(), String> {
    let db = state.lock().await;
    
    db.delete_project(&project_id)
        .await
        .map_err(|e| format!("Failed to delete project: {}", e))?;

    Ok(())
}

// Tag management commands
#[tauri::command]
pub async fn create_tag(
    state: State<'_, AppState>,
    request: CreateTagRequest,
) -> Result<TagResponse, String> {
    let db = state.lock().await;
    
    let tag = db.create_tag(
        &request.name,
        request.description.as_deref(),
        request.color.as_deref(),
        request.category.as_deref(),
    )
    .await
    .map_err(|e| format!("Failed to create tag: {}", e))?;

    Ok(TagResponse {
        id: tag.id,
        name: tag.name,
        description: tag.description,
        color: tag.color,
        category: tag.category,
        created_at: tag.created_at.to_rfc3339(),
        updated_at: tag.updated_at.to_rfc3339(),
    })
}

#[tauri::command]
pub async fn get_all_tags(state: State<'_, AppState>) -> Result<Vec<TagResponse>, String> {
    let db = state.lock().await;
    
    let tags = db.get_all_tags()
        .await
        .map_err(|e| format!("Failed to get tags: {}", e))?;

    let response = tags.into_iter().map(|tag| TagResponse {
        id: tag.id,
        name: tag.name,
        description: tag.description,
        color: tag.color,
        category: tag.category,
        created_at: tag.created_at.to_rfc3339(),
        updated_at: tag.updated_at.to_rfc3339(),
    }).collect();

    Ok(response)
}

#[tauri::command]
pub async fn update_tag(
    state: State<'_, AppState>,
    request: UpdateTagRequest,
) -> Result<TagResponse, String> {
    let db = state.lock().await;
    
    let tag = db.update_tag(
        &request.id,
        request.name.as_deref(),
        request.description.as_deref(),
        request.color.as_deref(),
        request.category.as_deref(),
    )
    .await
    .map_err(|e| format!("Failed to update tag: {}", e))?;

    Ok(TagResponse {
        id: tag.id,
        name: tag.name,
        description: tag.description,
        color: tag.color,
        category: tag.category,
        created_at: tag.created_at.to_rfc3339(),
        updated_at: tag.updated_at.to_rfc3339(),
    })
}

#[tauri::command]
pub async fn delete_tag(
    state: State<'_, AppState>,
    tag_id: String,
) -> Result<(), String> {
    let db = state.lock().await;
    
    db.delete_tag(&tag_id)
        .await
        .map_err(|e| format!("Failed to delete tag: {}", e))?;

    Ok(())
}

// Meeting-related structs
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMeetingRequest {
    pub title: String,
    pub description: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub location: Option<String>,
    pub meeting_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MeetingResponse {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub location: Option<String>,
    pub meeting_type: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddAttendeeRequest {
    pub meeting_id: String,
    pub name: String,
    pub email: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AttendeeResponse {
    pub id: String,
    pub meeting_id: String,
    pub name: String,
    pub email: Option<String>,
    pub role: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateActionRequest {
    pub meeting_id: String,
    pub title: String,
    pub description: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub priority: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActionResponse {
    pub id: String,
    pub meeting_id: String,
    pub entry_item_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub status: String,
    pub priority: String,
    pub created_at: String,
    pub updated_at: String,
}

// Meeting commands
#[tauri::command]
pub async fn create_meeting(
    state: State<'_, AppState>,
    request: CreateMeetingRequest,
) -> Result<MeetingResponse, String> {
    let db = state.lock().await;
    
    let start_time = request.start_time
        .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
        .map(|dt| dt.with_timezone(&Utc));
    let end_time = request.end_time
        .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let meeting = db.create_meeting(
        &request.title,
        request.description.as_deref(),
        start_time,
        end_time,
        request.location.as_deref(),
        request.meeting_type.as_deref(),
    )
    .await
    .map_err(|e| format!("Failed to create meeting: {}", e))?;

    Ok(MeetingResponse {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        start_time: meeting.start_time.map(|t| t.to_rfc3339()),
        end_time: meeting.end_time.map(|t| t.to_rfc3339()),
        location: meeting.location,
        meeting_type: meeting.meeting_type,
        status: meeting.status,
        created_at: meeting.created_at.to_rfc3339(),
        updated_at: meeting.updated_at.to_rfc3339(),
    })
}

#[tauri::command]
pub async fn get_all_meetings(state: State<'_, AppState>) -> Result<Vec<MeetingResponse>, String> {
    let db = state.lock().await;
    
    let meetings = db.get_all_meetings()
        .await
        .map_err(|e| format!("Failed to get meetings: {}", e))?;

    let response = meetings.into_iter().map(|meeting| MeetingResponse {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        start_time: meeting.start_time.map(|t| t.to_rfc3339()),
        end_time: meeting.end_time.map(|t| t.to_rfc3339()),
        location: meeting.location,
        meeting_type: meeting.meeting_type,
        status: meeting.status,
        created_at: meeting.created_at.to_rfc3339(),
        updated_at: meeting.updated_at.to_rfc3339(),
    }).collect();

    Ok(response)
}

#[tauri::command]
pub async fn add_meeting_attendee(
    state: State<'_, AppState>,
    request: AddAttendeeRequest,
) -> Result<AttendeeResponse, String> {
    let db = state.lock().await;
    
    let attendee = db.add_meeting_attendee(
        &request.meeting_id,
        &request.name,
        request.email.as_deref(),
        request.role.as_deref(),
    )
    .await
    .map_err(|e| format!("Failed to add attendee: {}", e))?;

    Ok(AttendeeResponse {
        id: attendee.id,
        meeting_id: attendee.meeting_id,
        name: attendee.name,
        email: attendee.email,
        role: attendee.role,
        status: attendee.status,
        created_at: attendee.created_at.to_rfc3339(),
    })
}

#[tauri::command]
pub async fn get_meeting_attendees(
    state: State<'_, AppState>,
    meeting_id: String,
) -> Result<Vec<AttendeeResponse>, String> {
    let db = state.lock().await;
    
    let attendees = db.get_meeting_attendees(&meeting_id)
        .await
        .map_err(|e| format!("Failed to get attendees: {}", e))?;

    let response = attendees.into_iter().map(|attendee| AttendeeResponse {
        id: attendee.id,
        meeting_id: attendee.meeting_id,
        name: attendee.name,
        email: attendee.email,
        role: attendee.role,
        status: attendee.status,
        created_at: attendee.created_at.to_rfc3339(),
    }).collect();

    Ok(response)
}

#[tauri::command]
pub async fn create_meeting_action(
    state: State<'_, AppState>,
    request: CreateActionRequest,
) -> Result<ActionResponse, String> {
    let db = state.lock().await;
    
    let due_date = request.due_date
        .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let action = db.create_meeting_action(
        &request.meeting_id,
        &request.title,
        request.description.as_deref(),
        request.assignee.as_deref(),
        due_date,
        request.priority.as_deref(),
    )
    .await
    .map_err(|e| format!("Failed to create action: {}", e))?;

    Ok(ActionResponse {
        id: action.id,
        meeting_id: action.meeting_id,
        entry_item_id: action.entry_item_id,
        title: action.title,
        description: action.description,
        assignee: action.assignee,
        due_date: action.due_date.map(|t| t.to_rfc3339()),
        status: action.status,
        priority: action.priority,
        created_at: action.created_at.to_rfc3339(),
        updated_at: action.updated_at.to_rfc3339(),
    })
}

#[tauri::command]
pub async fn get_meeting_actions(
    state: State<'_, AppState>,
    meeting_id: String,
) -> Result<Vec<ActionResponse>, String> {
    let db = state.lock().await;
    
    let actions = db.get_meeting_actions(&meeting_id)
        .await
        .map_err(|e| format!("Failed to get actions: {}", e))?;

    let response = actions.into_iter().map(|action| ActionResponse {
        id: action.id,
        meeting_id: action.meeting_id,
        entry_item_id: action.entry_item_id,
        title: action.title,
        description: action.description,
        assignee: action.assignee,
        due_date: action.due_date.map(|t| t.to_rfc3339()),
        status: action.status,
        priority: action.priority,
        created_at: action.created_at.to_rfc3339(),
        updated_at: action.updated_at.to_rfc3339(),
    }).collect();

    Ok(response)
}

#[tauri::command]
pub async fn delete_meeting(
    state: State<'_, AppState>,
    meeting_id: String,
) -> Result<(), String> {
    let db = state.lock().await;
    
    db.delete_meeting(&meeting_id)
        .await
        .map_err(|e| format!("Failed to delete meeting: {}", e))?;

    Ok(())
}
