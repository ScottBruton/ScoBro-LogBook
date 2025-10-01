use sqlx::{sqlite::SqlitePool, Row};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Entry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EntryItem {
    pub id: String,
    pub entry_id: String,
    pub item_type: String,
    pub content: String,
    pub project: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub category: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Person {
    pub id: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JiraRef {
    pub id: String,
    pub entry_item_id: String,
    pub jira_key: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ItemTag {
    pub entry_item_id: String,
    pub tag_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ItemPerson {
    pub entry_item_id: String,
    pub person_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Meeting {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub location: Option<String>,
    pub meeting_type: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MeetingAttendee {
    pub id: String,
    pub meeting_id: String,
    pub name: String,
    pub email: Option<String>,
    pub role: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MeetingAction {
    pub id: String,
    pub meeting_id: String,
    pub entry_item_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: String,
    pub priority: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EntryWithItems {
    pub entry: Entry,
    pub items: Vec<EntryItemWithMetadata>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EntryItemWithMetadata {
    pub item: EntryItem,
    pub tags: Vec<Tag>,
    pub people: Vec<Person>,
    pub jira_refs: Vec<JiraRef>,
}

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new() -> Result<Self, sqlx::Error> {
        // Use in-memory database for now to avoid file permission issues
        let database_url = "sqlite::memory:";
        println!("Database URL: {}", database_url);
        
        let pool = SqlitePool::connect(database_url).await?;
        
        let db = Database { pool };
        db.init().await?;
        Ok(db)
    }

    async fn init(&self) -> Result<(), sqlx::Error> {
        // Create tables
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS entry_items (
                id TEXT PRIMARY KEY,
                entry_id TEXT NOT NULL,
                item_type TEXT NOT NULL,
                content TEXT NOT NULL,
                project TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (entry_id) REFERENCES entries (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                color TEXT DEFAULT '#6c757d',
                category TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS people (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS jira_refs (
                id TEXT PRIMARY KEY,
                entry_item_id TEXT NOT NULL,
                jira_key TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (entry_item_id) REFERENCES entry_items (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS item_tags (
                entry_item_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                PRIMARY KEY (entry_item_id, tag_id),
                FOREIGN KEY (entry_item_id) REFERENCES entry_items (id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS item_people (
                entry_item_id TEXT NOT NULL,
                person_id TEXT NOT NULL,
                PRIMARY KEY (entry_item_id, person_id),
                FOREIGN KEY (entry_item_id) REFERENCES entry_items (id) ON DELETE CASCADE,
                FOREIGN KEY (person_id) REFERENCES people (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                color TEXT DEFAULT '#0275d8',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                start_time TEXT,
                end_time TEXT,
                location TEXT,
                meeting_type TEXT DEFAULT 'meeting',
                status TEXT DEFAULT 'scheduled',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS meeting_attendees (
                id TEXT PRIMARY KEY,
                meeting_id TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                role TEXT DEFAULT 'attendee',
                status TEXT DEFAULT 'invited',
                created_at TEXT NOT NULL,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS meeting_actions (
                id TEXT PRIMARY KEY,
                meeting_id TEXT NOT NULL,
                entry_item_id TEXT,
                title TEXT NOT NULL,
                description TEXT,
                assignee TEXT,
                due_date TEXT,
                status TEXT DEFAULT 'open',
                priority TEXT DEFAULT 'medium',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE,
                FOREIGN KEY (entry_item_id) REFERENCES entry_items (id) ON DELETE SET NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn create_entry(&self, timestamp: DateTime<Utc>) -> Result<Entry, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        sqlx::query(
            "INSERT INTO entries (id, timestamp, created_at, updated_at) VALUES (?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(timestamp.to_rfc3339())
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(Entry {
            id,
            timestamp,
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn create_entry_item(
        &self,
        entry_id: &str,
        item_type: &str,
        content: &str,
        project: Option<&str>,
    ) -> Result<EntryItem, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        sqlx::query(
            "INSERT INTO entry_items (id, entry_id, item_type, content, project, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(entry_id)
        .bind(item_type)
        .bind(content)
        .bind(project)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(EntryItem {
            id,
            entry_id: entry_id.to_string(),
            item_type: item_type.to_string(),
            content: content.to_string(),
            project: project.map(|s| s.to_string()),
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn get_or_create_tag(&self, name: &str) -> Result<Tag, sqlx::Error> {
        // Try to get existing tag
        let result = sqlx::query("SELECT id, name, description, color, category, created_at, updated_at FROM tags WHERE name = ?")
            .bind(name)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = result {
            let created_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);
            let updated_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);

            return Ok(Tag {
                id: row.get("id"),
                name: row.get("name"),
                description: row.get("description"),
                color: row.get("color"),
                category: row.get("category"),
                created_at,
                updated_at,
            });
        }

        // Create new tag with default values
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        sqlx::query("INSERT INTO tags (id, name, description, color, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(&id)
            .bind(name)
            .bind(None::<String>)
            .bind("#6c757d")
            .bind(None::<String>)
            .bind(now.to_rfc3339())
            .bind(now.to_rfc3339())
            .execute(&self.pool)
            .await?;

        Ok(Tag {
            id,
            name: name.to_string(),
            description: None,
            color: "#6c757d".to_string(),
            category: None,
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn get_or_create_person(&self, name: &str) -> Result<Person, sqlx::Error> {
        // Try to get existing person
        let result = sqlx::query("SELECT id, name, created_at FROM people WHERE name = ?")
            .bind(name)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = result {
            return Ok(Person {
                id: row.get("id"),
                name: row.get("name"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                    .unwrap()
                    .with_timezone(&Utc),
            });
        }

        // Create new person
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        sqlx::query("INSERT INTO people (id, name, created_at) VALUES (?, ?, ?)")
            .bind(&id)
            .bind(name)
            .bind(now.to_rfc3339())
            .execute(&self.pool)
            .await?;

        Ok(Person {
            id,
            name: name.to_string(),
            created_at: now,
        })
    }

    pub async fn create_jira_ref(&self, entry_item_id: &str, jira_key: &str) -> Result<JiraRef, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        sqlx::query("INSERT INTO jira_refs (id, entry_item_id, jira_key, created_at) VALUES (?, ?, ?, ?)")
            .bind(&id)
            .bind(entry_item_id)
            .bind(jira_key)
            .bind(now.to_rfc3339())
            .execute(&self.pool)
            .await?;

        Ok(JiraRef {
            id,
            entry_item_id: entry_item_id.to_string(),
            jira_key: jira_key.to_string(),
            created_at: now,
        })
    }

    pub async fn link_item_tag(&self, entry_item_id: &str, tag_id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT OR IGNORE INTO item_tags (entry_item_id, tag_id) VALUES (?, ?)")
            .bind(entry_item_id)
            .bind(tag_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn link_item_person(&self, entry_item_id: &str, person_id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT OR IGNORE INTO item_people (entry_item_id, person_id) VALUES (?, ?)")
            .bind(entry_item_id)
            .bind(person_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn get_all_entries_with_items(&self) -> Result<Vec<EntryWithItems>, sqlx::Error> {
        let entries = sqlx::query("SELECT id, timestamp, created_at, updated_at FROM entries ORDER BY timestamp DESC")
            .fetch_all(&self.pool)
            .await?;

        let mut result = Vec::new();
        
        for row in entries {
            let entry = Entry {
                id: row.get("id"),
                timestamp: DateTime::parse_from_rfc3339(&row.get::<String, _>("timestamp"))
                    .unwrap()
                    .with_timezone(&Utc),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
                    .unwrap()
                    .with_timezone(&Utc),
            };

            let items = self.get_entry_items_with_metadata(&entry.id).await?;
            result.push(EntryWithItems { entry, items });
        }

        Ok(result)
    }

    async fn get_entry_items_with_metadata(&self, entry_id: &str) -> Result<Vec<EntryItemWithMetadata>, sqlx::Error> {
        let items = sqlx::query("SELECT id, entry_id, item_type, content, project, created_at, updated_at FROM entry_items WHERE entry_id = ? ORDER BY created_at")
            .bind(entry_id)
            .fetch_all(&self.pool)
            .await?;

        let mut result = Vec::new();
        
        for row in items {
            let item = EntryItem {
                id: row.get("id"),
                entry_id: row.get("entry_id"),
                item_type: row.get("item_type"),
                content: row.get("content"),
                project: row.get("project"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
                    .unwrap()
                    .with_timezone(&Utc),
            };

            let tags = self.get_item_tags(&item.id).await?;
            let people = self.get_item_people(&item.id).await?;
            let jira_refs = self.get_item_jira_refs(&item.id).await?;

            result.push(EntryItemWithMetadata {
                item,
                tags,
                people,
                jira_refs,
            });
        }

        Ok(result)
    }

    async fn get_item_tags(&self, entry_item_id: &str) -> Result<Vec<Tag>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT t.id, t.name, t.description, t.color, t.category, t.created_at, t.updated_at FROM tags t 
             JOIN item_tags it ON t.id = it.tag_id 
             WHERE it.entry_item_id = ?"
        )
        .bind(entry_item_id)
        .fetch_all(&self.pool)
        .await?;

        let mut tags = Vec::new();
        for row in rows {
            let created_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);
            let updated_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);

            tags.push(Tag {
                id: row.get("id"),
                name: row.get("name"),
                description: row.get("description"),
                color: row.get("color"),
                category: row.get("category"),
                created_at,
                updated_at,
            });
        }
        Ok(tags)
    }

    async fn get_item_people(&self, entry_item_id: &str) -> Result<Vec<Person>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT p.id, p.name, p.created_at FROM people p 
             JOIN item_people ip ON p.id = ip.person_id 
             WHERE ip.entry_item_id = ?"
        )
        .bind(entry_item_id)
        .fetch_all(&self.pool)
        .await?;

        let mut people = Vec::new();
        for row in rows {
            people.push(Person {
                id: row.get("id"),
                name: row.get("name"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                    .unwrap()
                    .with_timezone(&Utc),
            });
        }
        Ok(people)
    }

    async fn get_item_jira_refs(&self, entry_item_id: &str) -> Result<Vec<JiraRef>, sqlx::Error> {
        let rows = sqlx::query("SELECT id, entry_item_id, jira_key, created_at FROM jira_refs WHERE entry_item_id = ?")
            .bind(entry_item_id)
            .fetch_all(&self.pool)
            .await?;

        let mut jira_refs = Vec::new();
        for row in rows {
            jira_refs.push(JiraRef {
                id: row.get("id"),
                entry_item_id: row.get("entry_item_id"),
                jira_key: row.get("jira_key"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                    .unwrap()
                    .with_timezone(&Utc),
            });
        }
        Ok(jira_refs)
    }

    pub async fn update_entry_item_content(&self, entry_item_id: &str, content: &str) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        sqlx::query("UPDATE entry_items SET content = ?, updated_at = ? WHERE id = ?")
            .bind(content)
            .bind(now.to_rfc3339())
            .bind(entry_item_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn update_entry_item_project(&self, entry_item_id: &str, project: Option<&str>) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        sqlx::query("UPDATE entry_items SET project = ?, updated_at = ? WHERE id = ?")
            .bind(project)
            .bind(now.to_rfc3339())
            .bind(entry_item_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn remove_item_tags(&self, entry_item_id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM item_tags WHERE entry_item_id = ?")
            .bind(entry_item_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn remove_item_people(&self, entry_item_id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM item_people WHERE entry_item_id = ?")
            .bind(entry_item_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn remove_item_jira_refs(&self, entry_item_id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM jira_refs WHERE entry_item_id = ?")
            .bind(entry_item_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn get_entry_with_items(&self, entry_item_id: &str) -> Result<EntryWithItems, sqlx::Error> {
        // First get the entry_id from the entry_item
        let entry_id: String = sqlx::query_scalar("SELECT entry_id FROM entry_items WHERE id = ?")
            .bind(entry_item_id)
            .fetch_one(&self.pool)
            .await?;

        // Get the entry
        let entry_row = sqlx::query("SELECT id, timestamp, created_at, updated_at FROM entries WHERE id = ?")
            .bind(&entry_id)
            .fetch_one(&self.pool)
            .await?;

        let timestamp: String = entry_row.get("timestamp");
        let created_at: String = entry_row.get("created_at");
        let updated_at: String = entry_row.get("updated_at");

        let timestamp = DateTime::parse_from_rfc3339(&timestamp)
            .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
            .with_timezone(&Utc);
        let created_at = DateTime::parse_from_rfc3339(&created_at)
            .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
            .with_timezone(&Utc);
        let updated_at = DateTime::parse_from_rfc3339(&updated_at)
            .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
            .with_timezone(&Utc);

        let entry = Entry {
            id: entry_row.get("id"),
            timestamp,
            created_at,
            updated_at,
        };

        // Get items with metadata
        let items = self.get_entry_items_with_metadata(&entry_id).await?;

        Ok(EntryWithItems { entry, items })
    }

    pub async fn delete_entry_item(&self, entry_item_id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM entry_items WHERE id = ?")
            .bind(entry_item_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_entry(&self, entry_id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM entries WHERE id = ?")
            .bind(entry_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // Project management methods
    pub async fn create_project(&self, name: &str, description: Option<&str>, color: Option<&str>) -> Result<Project, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let color = color.unwrap_or("#0275d8");
        
        sqlx::query(
            "INSERT INTO projects (id, name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(name)
        .bind(description)
        .bind(color)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(Project {
            id,
            name: name.to_string(),
            description: description.map(|s| s.to_string()),
            color: color.to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn get_all_projects(&self) -> Result<Vec<Project>, sqlx::Error> {
        let rows = sqlx::query("SELECT id, name, description, color, created_at, updated_at FROM projects ORDER BY name")
            .fetch_all(&self.pool)
            .await?;

        let mut projects = Vec::new();
        for row in rows {
            let created_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);
            let updated_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);

            projects.push(Project {
                id: row.get("id"),
                name: row.get("name"),
                description: row.get("description"),
                color: row.get("color"),
                created_at,
                updated_at,
            });
        }

        Ok(projects)
    }

    pub async fn get_project_by_name(&self, name: &str) -> Result<Option<Project>, sqlx::Error> {
        let row = sqlx::query("SELECT id, name, description, color, created_at, updated_at FROM projects WHERE name = ?")
            .bind(name)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            let created_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);
            let updated_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);

            Ok(Some(Project {
                id: row.get("id"),
                name: row.get("name"),
                description: row.get("description"),
                color: row.get("color"),
                created_at,
                updated_at,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn update_project(&self, id: &str, name: Option<&str>, description: Option<&str>, color: Option<&str>) -> Result<Project, sqlx::Error> {
        let now = Utc::now();
        
        // Build dynamic update query
        let mut query_parts = vec!["updated_at = ?".to_string()];
        
        if let Some(_) = name {
            query_parts.push("name = ?".to_string());
        }
        if let Some(_) = description {
            query_parts.push("description = ?".to_string());
        }
        if let Some(_) = color {
            query_parts.push("color = ?".to_string());
        }
        
        let query_str = format!("UPDATE projects SET {} WHERE id = ?", query_parts.join(", "));
        let mut query = sqlx::query(&query_str);
        
        query = query.bind(now.to_rfc3339());
        
        if let Some(name) = name {
            query = query.bind(name);
        }
        if let Some(description) = description {
            query = query.bind(description);
        }
        if let Some(color) = color {
            query = query.bind(color);
        }
        
        query = query.bind(id);
        query.execute(&self.pool).await?;

        // Return updated project
        let row = sqlx::query("SELECT id, name, description, color, created_at, updated_at FROM projects WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await?;

        let created_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
            .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
            .with_timezone(&Utc);
        let updated_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
            .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
            .with_timezone(&Utc);

        Ok(Project {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            color: row.get("color"),
            created_at,
            updated_at,
        })
    }

    pub async fn delete_project(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM projects WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // Tag management methods
    pub async fn create_tag(&self, name: &str, description: Option<&str>, color: Option<&str>, category: Option<&str>) -> Result<Tag, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let color = color.unwrap_or("#6c757d");
        
        sqlx::query(
            "INSERT INTO tags (id, name, description, color, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(name)
        .bind(description)
        .bind(color)
        .bind(category)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(Tag {
            id,
            name: name.to_string(),
            description: description.map(|s| s.to_string()),
            color: color.to_string(),
            category: category.map(|s| s.to_string()),
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn get_all_tags(&self) -> Result<Vec<Tag>, sqlx::Error> {
        let rows = sqlx::query("SELECT id, name, description, color, category, created_at, updated_at FROM tags ORDER BY name")
            .fetch_all(&self.pool)
            .await?;

        let mut tags = Vec::new();
        for row in rows {
            let created_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);
            let updated_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);

            tags.push(Tag {
                id: row.get("id"),
                name: row.get("name"),
                description: row.get("description"),
                color: row.get("color"),
                category: row.get("category"),
                created_at,
                updated_at,
            });
        }

        Ok(tags)
    }

    pub async fn update_tag(&self, id: &str, name: Option<&str>, description: Option<&str>, color: Option<&str>, category: Option<&str>) -> Result<Tag, sqlx::Error> {
        let now = Utc::now();
        
        // Build dynamic update query
        let mut query_parts = vec!["updated_at = ?".to_string()];
        
        if let Some(_) = name {
            query_parts.push("name = ?".to_string());
        }
        if let Some(_) = description {
            query_parts.push("description = ?".to_string());
        }
        if let Some(_) = color {
            query_parts.push("color = ?".to_string());
        }
        if let Some(_) = category {
            query_parts.push("category = ?".to_string());
        }
        
        let query_str = format!("UPDATE tags SET {} WHERE id = ?", query_parts.join(", "));
        let mut query = sqlx::query(&query_str);
        
        query = query.bind(now.to_rfc3339());
        
        if let Some(name) = name {
            query = query.bind(name);
        }
        if let Some(description) = description {
            query = query.bind(description);
        }
        if let Some(color) = color {
            query = query.bind(color);
        }
        if let Some(category) = category {
            query = query.bind(category);
        }
        
        query = query.bind(id);
        query.execute(&self.pool).await?;

        // Return updated tag
        let row = sqlx::query("SELECT id, name, description, color, category, created_at, updated_at FROM tags WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await?;

        let created_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
            .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
            .with_timezone(&Utc);
        let updated_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
            .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
            .with_timezone(&Utc);

        Ok(Tag {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            color: row.get("color"),
            category: row.get("category"),
            created_at,
            updated_at,
        })
    }

    pub async fn delete_tag(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM tags WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // Meeting management methods
    pub async fn create_meeting(
        &self,
        title: &str,
        description: Option<&str>,
        start_time: Option<DateTime<Utc>>,
        end_time: Option<DateTime<Utc>>,
        location: Option<&str>,
        meeting_type: Option<&str>,
    ) -> Result<Meeting, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let meeting_type = meeting_type.unwrap_or("meeting");

        sqlx::query(
            "INSERT INTO meetings (id, title, description, start_time, end_time, location, meeting_type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(title)
        .bind(description)
        .bind(start_time.map(|t| t.to_rfc3339()))
        .bind(end_time.map(|t| t.to_rfc3339()))
        .bind(location)
        .bind(meeting_type)
        .bind("scheduled")
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(Meeting {
            id,
            title: title.to_string(),
            description: description.map(|s| s.to_string()),
            start_time,
            end_time,
            location: location.map(|s| s.to_string()),
            meeting_type: meeting_type.to_string(),
            status: "scheduled".to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn get_all_meetings(&self) -> Result<Vec<Meeting>, sqlx::Error> {
        let rows = sqlx::query("SELECT id, title, description, start_time, end_time, location, meeting_type, status, created_at, updated_at FROM meetings ORDER BY start_time DESC")
            .fetch_all(&self.pool)
            .await?;

        let mut meetings = Vec::new();
        for row in rows {
            let created_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);
            let updated_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);

            let start_time = row.get::<Option<String>, _>("start_time")
                .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc));
            let end_time = row.get::<Option<String>, _>("end_time")
                .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc));

            meetings.push(Meeting {
                id: row.get("id"),
                title: row.get("title"),
                description: row.get("description"),
                start_time,
                end_time,
                location: row.get("location"),
                meeting_type: row.get("meeting_type"),
                status: row.get("status"),
                created_at,
                updated_at,
            });
        }

        Ok(meetings)
    }

    pub async fn add_meeting_attendee(
        &self,
        meeting_id: &str,
        name: &str,
        email: Option<&str>,
        role: Option<&str>,
    ) -> Result<MeetingAttendee, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let role = role.unwrap_or("attendee");

        sqlx::query(
            "INSERT INTO meeting_attendees (id, meeting_id, name, email, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(meeting_id)
        .bind(name)
        .bind(email)
        .bind(role)
        .bind("invited")
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(MeetingAttendee {
            id,
            meeting_id: meeting_id.to_string(),
            name: name.to_string(),
            email: email.map(|s| s.to_string()),
            role: role.to_string(),
            status: "invited".to_string(),
            created_at: now,
        })
    }

    pub async fn get_meeting_attendees(&self, meeting_id: &str) -> Result<Vec<MeetingAttendee>, sqlx::Error> {
        let rows = sqlx::query("SELECT id, meeting_id, name, email, role, status, created_at FROM meeting_attendees WHERE meeting_id = ? ORDER BY name")
            .bind(meeting_id)
            .fetch_all(&self.pool)
            .await?;

        let mut attendees = Vec::new();
        for row in rows {
            let created_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);

            attendees.push(MeetingAttendee {
                id: row.get("id"),
                meeting_id: row.get("meeting_id"),
                name: row.get("name"),
                email: row.get("email"),
                role: row.get("role"),
                status: row.get("status"),
                created_at,
            });
        }

        Ok(attendees)
    }

    pub async fn create_meeting_action(
        &self,
        meeting_id: &str,
        title: &str,
        description: Option<&str>,
        assignee: Option<&str>,
        due_date: Option<DateTime<Utc>>,
        priority: Option<&str>,
    ) -> Result<MeetingAction, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let priority = priority.unwrap_or("medium");

        sqlx::query(
            "INSERT INTO meeting_actions (id, meeting_id, title, description, assignee, due_date, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(meeting_id)
        .bind(title)
        .bind(description)
        .bind(assignee)
        .bind(due_date.map(|t| t.to_rfc3339()))
        .bind("open")
        .bind(priority)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(MeetingAction {
            id,
            meeting_id: meeting_id.to_string(),
            entry_item_id: None,
            title: title.to_string(),
            description: description.map(|s| s.to_string()),
            assignee: assignee.map(|s| s.to_string()),
            due_date,
            status: "open".to_string(),
            priority: priority.to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn get_meeting_actions(&self, meeting_id: &str) -> Result<Vec<MeetingAction>, sqlx::Error> {
        let rows = sqlx::query("SELECT id, meeting_id, entry_item_id, title, description, assignee, due_date, status, priority, created_at, updated_at FROM meeting_actions WHERE meeting_id = ? ORDER BY created_at DESC")
            .bind(meeting_id)
            .fetch_all(&self.pool)
            .await?;

        let mut actions = Vec::new();
        for row in rows {
            let created_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);
            let updated_at = DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
                .with_timezone(&Utc);

            let due_date = row.get::<Option<String>, _>("due_date")
                .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc));

            actions.push(MeetingAction {
                id: row.get("id"),
                meeting_id: row.get("meeting_id"),
                entry_item_id: row.get("entry_item_id"),
                title: row.get("title"),
                description: row.get("description"),
                assignee: row.get("assignee"),
                due_date,
                status: row.get("status"),
                priority: row.get("priority"),
                created_at,
                updated_at,
            });
        }

        Ok(actions)
    }

    pub async fn delete_meeting(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM meetings WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
