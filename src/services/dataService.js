import { invoke } from '@tauri-apps/api/core';

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
}
