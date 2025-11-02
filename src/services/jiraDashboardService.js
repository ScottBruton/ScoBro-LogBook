import { supabase } from '../supabaseClient.js';
import { SupabaseService } from './supabaseService.js';

/**
 * Service for managing Jira data in the dashboard and Supabase sync
 */
export class JiraDashboardService {
  /**
   * Sync Jira projects and issues to Supabase
   * @param {Array} projects - Array of project objects
   * @param {Array} issues - Array of issue objects
   * @returns {Promise<Object>} Sync result
   */
  static async syncToDashboard(projects = [], issues = []) {
    try {
      const isAuthenticated = await SupabaseService.isAuthenticated();
      if (!isAuthenticated) {
        console.warn('⚠️ User not authenticated, skipping Supabase sync');
        return { success: false, error: 'Not authenticated' };
      }

      const { data: { user } } = await SupabaseService.getCurrentUser();
      if (!user) {
        throw new Error('User not found');
      }

      const userId = user.id;

      // Sync projects
      let projectsSynced = 0;
      if (projects.length > 0) {
        for (const project of projects) {
          const projectData = {
            id: `${userId}-${project.key}`,
            user_id: userId,
            project_key: project.key,
            project_name: project.name || project.key,
            project_type_key: project.projectTypeKey,
            description: project.description,
            lead: project.lead,
            url: project.url,
            is_selected: true,
            updated_at: new Date().toISOString(),
            last_sync_at: new Date().toISOString()
          };

          const { error } = await supabase
            .from('jira_projects')
            .upsert(projectData, { onConflict: 'id' });

          if (error) {
            console.error(`❌ Failed to sync project ${project.key}:`, error);
          } else {
            projectsSynced++;
          }
        }
      }

      // Sync issues
      let issuesSynced = 0;
      if (issues.length > 0) {
        for (const issue of issues) {
          const issueData = {
            id: `${userId}-${issue.key}`,
            user_id: userId,
            project_key: issue.projectKey || 'UNKNOWN',
            issue_key: issue.key,
            summary: issue.summary || 'No summary',
            description: issue.description,
            status: issue.status || 'Unknown',
            priority: issue.priority,
            issue_type: issue.issueType,
            assignee: issue.assignee,
            reporter: issue.reporter,
            created: issue.created,
            updated: issue.updated,
            due_date: issue.dueDate,
            original_estimate_seconds: this.parseTimeToSeconds(issue.originalEstimate),
            remaining_estimate_seconds: this.parseTimeToSeconds(issue.remainingEstimate),
            time_spent_seconds: this.parseTimeToSeconds(issue.timeSpent),
            labels: issue.labels || [],
            components: issue.components || [],
            fix_versions: issue.fixVersions || [],
            sprint: issue.sprint,
            epic: issue.epic,
            story_points: issue.storyPoints,
            url: issue.url,
            updated_at: new Date().toISOString(),
            last_sync_at: new Date().toISOString()
          };

          const { error } = await supabase
            .from('jira_issues')
            .upsert(issueData, { onConflict: 'id' });

          if (error) {
            console.error(`❌ Failed to sync issue ${issue.key}:`, error);
          } else {
            issuesSynced++;
          }
        }
      }

      console.log(`✅ Synced ${projectsSynced} projects and ${issuesSynced} issues to Supabase`);
      return {
        success: true,
        projectsSynced,
        issuesSynced
      };
    } catch (error) {
      console.error('❌ Failed to sync Jira data to dashboard:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse Jira time format to seconds
   * Examples: "2h" -> 7200, "30m" -> 1800, "1d 2h" -> 93600
   */
  static parseTimeToSeconds(timeString) {
    if (!timeString || typeof timeString !== 'string') return null;

    const parts = timeString.match(/(\d+[wdhm])/g);
    if (!parts) return null;

    let totalSeconds = 0;
    for (const part of parts) {
      const match = part.match(/(\d+)([wdhm])/);
      if (!match) continue;

      const value = parseInt(match[1], 10);
      const unit = match[2];

      switch (unit) {
        case 'w': totalSeconds += value * 7 * 24 * 60 * 60; break;
        case 'd': totalSeconds += value * 24 * 60 * 60; break;
        case 'h': totalSeconds += value * 60 * 60; break;
        case 'm': totalSeconds += value * 60; break;
      }
    }

    return totalSeconds;
  }

  /**
   * Format seconds to readable time
   */
  static formatSecondsToTime(seconds) {
    if (!seconds || seconds === 0) return '0h';

    const weeks = Math.floor(seconds / (7 * 24 * 60 * 60));
    const days = Math.floor((seconds % (7 * 24 * 60 * 60)) / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    const parts = [];
    if (weeks > 0) parts.push(`${weeks}w`);
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '0h';
  }

  /**
   * Load Jira projects from Supabase
   * @returns {Promise<Array>} Array of projects
   */
  static async loadProjectsFromDatabase() {
    try {
      const isAuthenticated = await SupabaseService.isAuthenticated();
      if (!isAuthenticated) {
        return [];
      }

      const { data: { user } } = await SupabaseService.getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('jira_projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_selected', true)
        .order('project_name');

      if (error) {
        console.error('❌ Failed to load projects from database:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error loading projects from database:', error);
      return [];
    }
  }

  /**
   * Load Jira issues from Supabase
   * @param {Array} projectKeys - Optional array of project keys to filter
   * @returns {Promise<Array>} Array of issues
   */
  static async loadIssuesFromDatabase(projectKeys = null) {
    try {
      const isAuthenticated = await SupabaseService.isAuthenticated();
      if (!isAuthenticated) {
        return [];
      }

      const { data: { user } } = await SupabaseService.getCurrentUser();
      if (!user) return [];

      let query = supabase
        .from('jira_issues')
        .select('*')
        .eq('user_id', user.id)
        .order('updated', { ascending: false });

      if (projectKeys && projectKeys.length > 0) {
        query = query.in('project_key', projectKeys);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to load issues from database:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error loading issues from database:', error);
      return [];
    }
  }

  /**
   * Clear all Jira data from Supabase
   * @returns {Promise<Object>} Result
   */
  static async clearAllData() {
    try {
      const isAuthenticated = await SupabaseService.isAuthenticated();
      if (!isAuthenticated) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data: { user } } = await SupabaseService.getCurrentUser();
      if (!user) return { success: false, error: 'User not found' };

      // Delete issues first (foreign key constraint)
      const { error: issuesError } = await supabase
        .from('jira_issues')
        .delete()
        .eq('user_id', user.id);

      if (issuesError) {
        console.error('❌ Failed to delete issues:', issuesError);
      }

      // Delete projects
      const { error: projectsError } = await supabase
        .from('jira_projects')
        .delete()
        .eq('user_id', user.id);

      if (projectsError) {
        console.error('❌ Failed to delete projects:', projectsError);
        return { success: false, error: projectsError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to clear Jira data:', error);
      return { success: false, error: error.message };
    }
  }
}


