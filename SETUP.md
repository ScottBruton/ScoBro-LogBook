# ScoBro Logbook - Setup Instructions

## Phase 1 MVP Features Implemented

✅ **SQLite Local Storage** - All data is stored locally in SQLite database
✅ **Tauri Backend Commands** - Full CRUD operations via Tauri commands
✅ **Export Functionality** - CSV and Markdown export with download
✅ **Enhanced Tray Menu** - Quick add note, check updates, quit
✅ **Autostart Support** - App starts automatically at login
✅ **Offline-First Architecture** - Works without internet connection
✅ **Update System** - Progress tracking in banner and tray notifications

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Supabase Setup (Optional for Phase 1)

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Run Development Mode

```bash
npm run tauri
```

This will start both the Vite dev server and Tauri app.

### 4. Build for Production

```bash
npm run build
```

## Database Schema

The app uses SQLite with the following tables:
- `entries` - Main entry sessions
- `entry_items` - Individual items within entries
- `tags` - Reusable tags
- `people` - People mentioned in entries
- `jira_refs` - Jira issue references
- `item_tags` - Many-to-many relationship between items and tags
- `item_people` - Many-to-many relationship between items and people

## Features

### Core Functionality
- **Multi-item Entry Creation** - Add multiple items (Action, Decision, Note, Meeting) in one session
- **Daily Log View** - Expandable sessions grouped by date
- **Item View** - Flat list of all items across sessions
- **Search & Filter** - Search across content, tags, Jira refs, and people
- **Export** - Download as CSV or Markdown

### Tray Integration
- **Quick Add Note** - Right-click tray icon to quickly add a note
- **Check Updates** - Manual update check with progress notifications
- **Quit** - Exit the application

### Keyboard Shortcuts
- **Ctrl+Alt+N** - Open new entry popup

### Auto-updater
- **Background Updates** - Automatic update checking
- **Progress Tracking** - Visual progress in dashboard banner
- **Tray Notifications** - Update progress shown in system tray

## Architecture

### Frontend (React)
- `App.jsx` - Main application component with state management
- `Dashboard.jsx` - Entry display with daily/item view toggle
- `EntryPopup.jsx` - Multi-item entry creation form
- `UpdateBanner.jsx` - Update progress and notifications
- `services/dataService.js` - Tauri command interface
- `services/supabaseService.js` - Supabase sync (Phase 2+)

### Backend (Tauri/Rust)
- `main.rs` - Application entry point with plugin setup
- `database.rs` - SQLite database operations
- `commands.rs` - Tauri commands exposed to frontend

## Next Steps (Phase 2)

- [ ] Supabase authentication and sync
- [ ] Projects management
- [ ] Custom tags interface
- [ ] Jira integration
- [ ] Meetings module
- [ ] Inline editing
- [ ] Real-time sync

## Development Notes

- The app gracefully falls back to localStorage when Tauri commands are not available (web development)
- All database operations are wrapped in try-catch blocks with fallbacks
- The UI maintains the fun, emoji-rich design with pill-style metadata
- Export functionality works offline and downloads files directly
