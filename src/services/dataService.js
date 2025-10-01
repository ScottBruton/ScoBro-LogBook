import { invoke } from '@tauri-apps/api/tauri';

/**
 * Data service for interacting with the Tauri backend SQLite database.
 * This service provides an offline-first approach where data is stored
 * locally in SQLite and can be synced to Supabase later.
 */

export class DataService {
  /**
   * Create a new entry with multiple items
   * @param {string} timestamp - ISO timestamp string
   * @param {Array} items - Array of item objects with type, content, project, tags, jira, people
   * @returns {Promise<Object>} Created entry with items
   */
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

  /**
   * Get all entries with their items
   * @returns {Promise<Array>} Array of entries with items
   */
  static async getAllEntries() {
    try {
      return await invoke('get_all_entries');
    } catch (error) {
      console.error('Failed to get entries:', error);
      throw error;
    }
  }

  /**
   * Update an entry item
   * @param {string} entryItemId - ID of the entry item to update
   * @param {Object} updates - Object containing fields to update
   * @returns {Promise<Object>} Updated entry item
   */
  static async updateEntryItem(entryItemId, updates) {
    try {
      return await invoke('update_entry_item', { entryItemId, updates });
    } catch (error) {
      console.error('Failed to update entry item:', error);
      throw error;
    }
  }

  /**
   * Delete a specific entry item
   * @param {string} entryItemId - ID of the entry item to delete
   * @returns {Promise<void>}
   */
  static async deleteEntryItem(entryItemId) {
    try {
      return await invoke('delete_entry_item', { entryItemId });
    } catch (error) {
      console.error('Failed to delete entry item:', error);
      throw error;
    }
  }

  /**
   * Delete an entire entry
   * @param {string} entryId - ID of the entry to delete
   * @returns {Promise<void>}
   */
  static async deleteEntry(entryId) {
    try {
      return await invoke('delete_entry', { entryId });
    } catch (error) {
      console.error('Failed to delete entry:', error);
      throw error;
    }
  }

  /**
   * Export all entries as CSV
   * @returns {Promise<string>} CSV content
   */
  static async exportEntriesCSV() {
    try {
      return await invoke('export_entries_csv');
    } catch (error) {
      console.error('Failed to export CSV:', error);
      throw error;
    }
  }

  /**
   * Export all entries as Markdown
   * @returns {Promise<string>} Markdown content
   */
  static async exportEntriesMarkdown() {
    try {
      return await invoke('export_entries_markdown');
    } catch (error) {
      console.error('Failed to export Markdown:', error);
      throw error;
    }
  }

  /**
   * Download exported content as a file
   * @param {string} content - File content
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   */
  static downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export entries as CSV and download
   */
  static async exportAndDownloadCSV() {
    try {
      const csvContent = await this.exportEntriesCSV();
      const timestamp = new Date().toISOString().split('T')[0];
      this.downloadFile(csvContent, `scobro-logbook-${timestamp}.csv`, 'text/csv');
    } catch (error) {
      console.error('Failed to export and download CSV:', error);
      throw error;
    }
  }

  /**
   * Export entries as Markdown and download
   */
  static async exportAndDownloadMarkdown() {
    try {
      const markdownContent = await this.exportEntriesMarkdown();
      const timestamp = new Date().toISOString().split('T')[0];
      this.downloadFile(markdownContent, `scobro-logbook-${timestamp}.md`, 'text/markdown');
    } catch (error) {
      console.error('Failed to export and download Markdown:', error);
      throw error;
    }
  }

  // Project management methods
  /**
   * Create a new project
   * @param {Object} project - Project object with name, description, color
   * @returns {Promise<Object>} Created project
   */
  static async createProject(project) {
    try {
      return await invoke('create_project', { request: project });
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }

  /**
   * Get all projects
   * @returns {Promise<Array>} Array of projects
   */
  static async getAllProjects() {
    try {
      return await invoke('get_all_projects');
    } catch (error) {
      console.error('Failed to get projects:', error);
      throw error;
    }
  }

  /**
   * Update a project
   * @param {Object} project - Project object with id and fields to update
   * @returns {Promise<Object>} Updated project
   */
  static async updateProject(project) {
    try {
      return await invoke('update_project', { request: project });
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  }

  /**
   * Delete a project
   * @param {string} projectId - ID of the project to delete
   * @returns {Promise<void>}
   */
  static async deleteProject(projectId) {
    try {
      return await invoke('delete_project', { projectId });
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }

  // Tag management methods
  /**
   * Create a new tag
   * @param {Object} tag - Tag object with name, description, color, category
   * @returns {Promise<Object>} Created tag
   */
  static async createTag(tag) {
    try {
      return await invoke('create_tag', { request: tag });
    } catch (error) {
      console.error('Failed to create tag:', error);
      throw error;
    }
  }

  /**
   * Get all tags
   * @returns {Promise<Array>} Array of tags
   */
  static async getAllTags() {
    try {
      return await invoke('get_all_tags');
    } catch (error) {
      console.error('Failed to get tags:', error);
      throw error;
    }
  }

  /**
   * Update a tag
   * @param {Object} tag - Tag object with id and fields to update
   * @returns {Promise<Object>} Updated tag
   */
  static async updateTag(tag) {
    try {
      return await invoke('update_tag', { request: tag });
    } catch (error) {
      console.error('Failed to update tag:', error);
      throw error;
    }
  }

  /**
   * Delete a tag
   * @param {string} tagId - ID of the tag to delete
   * @returns {Promise<void>}
   */
  static async deleteTag(tagId) {
    try {
      return await invoke('delete_tag', { tagId });
    } catch (error) {
      console.error('Failed to delete tag:', error);
      throw error;
    }
  }

  // Meeting management methods
  /**
   * Create a new meeting
   * @param {Object} meeting - Meeting object with title, description, start_time, end_time, location, meeting_type
   * @returns {Promise<Object>} Created meeting
   */
  static async createMeeting(meeting) {
    try {
      return await invoke('create_meeting', { request: meeting });
    } catch (error) {
      console.error('Failed to create meeting:', error);
      throw error;
    }
  }

  /**
   * Get all meetings
   * @returns {Promise<Array>} Array of meetings
   */
  static async getAllMeetings() {
    try {
      return await invoke('get_all_meetings');
    } catch (error) {
      console.error('Failed to get meetings:', error);
      throw error;
    }
  }

  /**
   * Add attendee to a meeting
   * @param {Object} attendee - Attendee object with meeting_id, name, email, role
   * @returns {Promise<Object>} Created attendee
   */
  static async addMeetingAttendee(attendee) {
    try {
      return await invoke('add_meeting_attendee', { request: attendee });
    } catch (error) {
      console.error('Failed to add attendee:', error);
      throw error;
    }
  }

  /**
   * Get attendees for a meeting
   * @param {string} meetingId - ID of the meeting
   * @returns {Promise<Array>} Array of attendees
   */
  static async getMeetingAttendees(meetingId) {
    try {
      return await invoke('get_meeting_attendees', { meeting_id: meetingId });
    } catch (error) {
      console.error('Failed to get attendees:', error);
      throw error;
    }
  }

  /**
   * Create a meeting action
   * @param {Object} action - Action object with meeting_id, title, description, assignee, due_date, priority
   * @returns {Promise<Object>} Created action
   */
  static async createMeetingAction(action) {
    try {
      return await invoke('create_meeting_action', { request: action });
    } catch (error) {
      console.error('Failed to create action:', error);
      throw error;
    }
  }

  /**
   * Get actions for a meeting
   * @param {string} meetingId - ID of the meeting
   * @returns {Promise<Array>} Array of actions
   */
  static async getMeetingActions(meetingId) {
    try {
      return await invoke('get_meeting_actions', { meeting_id: meetingId });
    } catch (error) {
      console.error('Failed to get actions:', error);
      throw error;
    }
  }

  /**
   * Delete a meeting
   * @param {string} meetingId - ID of the meeting to delete
   * @returns {Promise<void>}
   */
  static async deleteMeeting(meetingId) {
    try {
      return await invoke('delete_meeting', { meeting_id: meetingId });
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      throw error;
    }
  }
}
