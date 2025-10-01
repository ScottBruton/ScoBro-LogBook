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
    pub created_at: DateTime<Utc>,
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
                created_at TEXT NOT NULL
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
        let result = sqlx::query("SELECT id, name, created_at FROM tags WHERE name = ?")
            .bind(name)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = result {
            return Ok(Tag {
                id: row.get("id"),
                name: row.get("name"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                    .unwrap()
                    .with_timezone(&Utc),
            });
        }

        // Create new tag
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        sqlx::query("INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)")
            .bind(&id)
            .bind(name)
            .bind(now.to_rfc3339())
            .execute(&self.pool)
            .await?;

        Ok(Tag {
            id,
            name: name.to_string(),
            created_at: now,
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
            "SELECT t.id, t.name, t.created_at FROM tags t 
             JOIN item_tags it ON t.id = it.tag_id 
             WHERE it.entry_item_id = ?"
        )
        .bind(entry_item_id)
        .fetch_all(&self.pool)
        .await?;

        let mut tags = Vec::new();
        for row in rows {
            tags.push(Tag {
                id: row.get("id"),
                name: row.get("name"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                    .unwrap()
                    .with_timezone(&Utc),
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
}
