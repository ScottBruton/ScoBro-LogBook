# Entry Flow Trace: From Save Button to Dashboard Display

This document traces the complete flow of what happens when you click "Save" on a new entry, all the way to it appearing on the dashboard.

## 1. User Clicks "Save" Button

**Location:** `src/components/EntryPopup.jsx` - Line 896

```389:412:src/components/EntryPopup.jsx
  const handleSave = () => {
    // Filter out empty content items
      const prepared = items
        .filter((item) => item.content.trim() !== '')
        .map((item) => ({
          ...item,
          tags: item.tags ? (Array.isArray(item.tags) ? item.tags : [item.tags]).filter((t) => t && t.trim().length > 0) : [],
          people: item.people
            .split(',')
            .map((p) => p.trim())
            .filter((p) => p.length > 0),
          jira: item.jira
            .split(',')
            .map((j) => j.trim())
            .filter((j) => j.length > 0),
          hours: item.hours ? parseFloat(item.hours) || 0 : 0,
        }));
    if (prepared.length > 0) {
      onSave(prepared);
    }
    // reset
    setItems([]);
    onClose();
  };
```

**What happens:**
- Filters out items with empty content
- Prepares each item with:
  - `type`: Item type (Action, Decision, Note, Meeting)
  - `content`: The main content text
  - `project`: Selected project name
  - `tags`: Array of Jira issue keys (e.g., ["CMC-123", "CMC-456"])
  - `people`: Array of people names (e.g., ["John Doe", "Jane Smith"])
  - `jira`: Array of Jira references (legacy field, may be empty)
  - `hours`: Parsed float value (NOTE: Currently not stored in database schema)
- Calls `onSave(prepared)` with the prepared array
- Resets the form and closes the popup

---

## 2. App.jsx Receives the Save Callback

**Location:** `src/App.jsx` - Line 218

```218:249:src/App.jsx
  const handleSaveItems = async (items) => {
    try {
      const timestamp = new Date().toISOString();
      const newEntry = await DataService.createEntry(timestamp, items);
      setEntries((prev) => [newEntry, ...prev]);
      
      // Try to sync to Supabase in background if authenticated
      if (isAuthenticated) {
        try {
          await SupabaseService.syncEntries([newEntry]);
          setSyncStatus('synced');
        } catch (syncErr) {
          console.warn('Failed to sync to Supabase:', syncErr);
          setSyncStatus('pending');
        }
      }
    } catch (err) {
      console.error('Failed to save entry:', err);
      // Fallback to localStorage for development
      const fallbackEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        items: items.map((item) => ({
          ...item,
          tags: item.tags || [],
          jira: item.jira || [],
          people: item.people || [],
        })),
      };
      setEntries((prev) => [fallbackEntry, ...prev]);
    }
  };
```

**What happens:**
- Creates a timestamp (ISO string) for the entry
- Calls `DataService.createEntry(timestamp, items)` to save to local database
- Immediately adds the returned entry to React state: `setEntries((prev) => [newEntry, ...prev])`
  - **This makes it appear on the dashboard instantly (optimistic update)**
- If authenticated with Supabase, syncs the entry in the background
- On error, falls back to localStorage (development mode)

---

## 3. DataService Creates Entry in Local Database

**Location:** `src/services/dataService.js` - Line 16

```16:35:src/services/dataService.js
  static async createEntry(timestamp, items) {
    try {
      const request = {
        timestamp,
        items: items.map(item => ({
          item_type: item.type,
          content: item.content,
          project: item.project || null,
          tags: item.tags || [],
          jira: item.jira || [],
          people: item.people || [],
        }))
      };
      
      return await invoke('create_entry', { request });
    } catch (error) {
      console.error('Failed to create entry:', error);
      throw error;
    }
  }
```

**What happens:**
- Transforms the items array to match the database schema:
  - `item_type`: Item type (Action, Decision, Note, Meeting)
  - `content`: Content text
  - `project`: Project name (nullable)
  - `tags`: Array of tag/issue keys
  - `jira`: Array of Jira references
  - `people`: Array of people names
- Calls Tauri backend command `create_entry` via `invoke()`
- Returns the created entry object with all metadata

**Note:** `hours` field is NOT included in the database request (field doesn't exist in schema yet)

---

## 4. Tauri Backend Saves to SQLite Database

**Location:** `src-tauri/src/commands.rs` - Line 72+

**What happens:**
- Receives the `create_entry` command from frontend
- Creates a new entry record in `entries` table with:
  - `id`: UUID
  - `timestamp`: ISO timestamp
  - `created_at`: Current timestamp
  - `updated_at`: Current timestamp
- For each item:
  - Creates an `entry_items` record with:
    - `id`: UUID
    - `entry_id`: Links to parent entry
    - `item_type`: Type (Action, Decision, Note, Meeting)
    - `content`: Content text
    - `project`: Project name (nullable)
  - Creates/links tags in `tags` table and `item_tags` junction table
  - Creates/links people in `people` table and `item_people` junction table
  - Creates/links Jira references in `jira_refs` table
- Returns the complete entry object with all nested items and metadata

---

## 5. Entry Appears in Dashboard React State

**Location:** `src/App.jsx` - Line 222

```222:222:src/App.jsx
      setEntries((prev) => [newEntry, ...prev]);
```

**What happens:**
- The new entry is added to the beginning of the entries array (most recent first)
- React re-renders the Dashboard component with the updated entries
- **The entry appears on the dashboard immediately**

---

## 6. Dashboard Component Renders the Entry

**Location:** `src/components/Dashboard.jsx` - Multiple sections

### Entry Structure Displayed:

```939:1054:src/components/Dashboard.jsx
                      {entry.items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            borderBottom: idx === entry.items.length - 1 ? 'none' : '1px solid #eee',
                            paddingBottom: '6px',
                            marginBottom: '6px',
                          }}
                        >
                          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                            {item.type}
                          </div>
                          {editingItem && editingItem.id === item.id ? (
                            <div style={{ marginBottom: '4px' }}>
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                style={{
                                  width: '100%',
                                  minHeight: '60px',
                                  padding: '8px',
                                  border: '1px solid #007bff',
                                  borderRadius: '4px',
                                  fontSize: '14px',
                                  fontFamily: 'inherit',
                                  resize: 'vertical'
                                }}
                                autoFocus
                              />
                              <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={saveEditing}
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#28a745',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#6c757d',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              style={{ 
                                marginBottom: '4px', 
                                whiteSpace: 'pre-wrap',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                transition: 'background-color 0.2s'
                              }}
                              onClick={() => startEditing(item)}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              title="Click to edit"
                            >
                              {item.content}
                            </div>
                          )}
                          <div style={{ fontSize: '12px', color: '#555' }}>
                            {item.project && (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                marginRight: '8px',
                                borderRadius: '12px',
                                backgroundColor: projects.find(p => p.name === item.project)?.color || '#0275d8',
                                color: '#fff',
                                fontSize: '11px'
                              }}>
                                📂 {item.project}
                              </span>
                            )}
                            {item.tags.length > 0 && (
                              <span style={{ marginRight: '8px' }}>
                                🏷 {item.tags.map((tagName, idx) => {
                                  const isLast = idx === item.tags.length - 1;
                                  return (
                                    <span key={idx}>
                                      <span style={{
                                        display: 'inline-block',
                                        padding: '2px 6px',
                                        marginRight: '4px',
                                        borderRadius: '8px',
                                        backgroundColor: '#6c757d',
                                        color: '#fff',
                                        fontSize: '10px'
                                      }}>
                                        {tagName}
                                      </span>
                                      {!isLast && ', '}
                                    </span>
                                  );
                                })}
                              </span>
                            )}
                            {item.people.length > 0 && <span>👤 {item.people.join(', ')}</span>}
                          </div>
```

**What is displayed for each item:**

1. **Item Type** (bold, 14px): Action, Decision, Note, or Meeting
2. **Content** (clickable to edit): The main content text
3. **Project** (pill badge): 📂 Project name (if provided)
   - Color from projects table if available, otherwise blue (#0275d8)
4. **Tags** (pill badges): 🏷️ Jira issue keys (e.g., CMC-123, CMC-456)
   - Gray background (#6c757d)
   - Comma-separated
5. **People** (text): 👤 Comma-separated list of people names

**What is NOT displayed:**
- ❌ `hours` field (not stored in database, not displayed)
- ❌ `jira` field (legacy field, not displayed in UI)

---

## 7. Background Sync to Supabase (if authenticated)

**Location:** `src/App.jsx` - Line 225-232

```225:232:src/App.jsx
      if (isAuthenticated) {
        try {
          await SupabaseService.syncEntries([newEntry]);
          setSyncStatus('synced');
        } catch (syncErr) {
          console.warn('Failed to sync to Supabase:', syncErr);
          setSyncStatus('pending');
        }
      }
```

**What happens:**
- If user is authenticated with Supabase:
  - Uploads the entry to Supabase in the background
  - Syncs entry, items, tags, people, and Jira refs
  - Updates sync status to 'synced' or 'pending' on error
- This happens asynchronously and doesn't block the UI

---

## Summary: Complete Flow

1. **User clicks Save** → `EntryPopup.handleSave()`
2. **Data preparation** → Filters empty items, formats arrays
3. **Callback to App** → `App.handleSaveItems(items)`
4. **Local DB save** → `DataService.createEntry()` → Tauri `create_entry` command
5. **Database insert** → SQLite tables: entries, entry_items, tags, people, jira_refs
6. **React state update** → `setEntries([newEntry, ...prev])`
7. **Dashboard renders** → Entry appears immediately (optimistic update)
8. **Background sync** → Supabase sync (if authenticated)

**Time to appear on dashboard:** ~10-50ms (depending on database write speed)

**Fields displayed:**
- ✅ Type (Action/Decision/Note/Meeting)
- ✅ Content (clickable to edit)
- ✅ Project (pill badge)
- ✅ Tags (Jira issue keys as pills)
- ✅ People (comma-separated names)
- ❌ Hours (not stored/displayed)
- ❌ Jira refs (not displayed in UI)

---

## Known Issues

1. **Hours field**: Currently captured in EntryPopup but NOT stored in database schema or displayed on dashboard
2. **Jira refs**: Legacy field, not displayed in UI (tags are used instead)

