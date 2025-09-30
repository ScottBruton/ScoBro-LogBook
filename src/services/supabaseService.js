import { supabase } from '../supabaseClient.js';

/**
 * Supabase service for cloud synchronization.
 * This service handles syncing local data to Supabase with proper
 * user authentication and row-level security.
 */

export class SupabaseService {
  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>}
   */
  static async isAuthenticated() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return !!user;
    } catch (error) {
      console.error('Failed to check authentication:', error);
      return false;
    }
  }

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Auth response
   */
  static async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to sign in:', error);
      throw error;
    }
  }

  /**
   * Sign up with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Auth response
   */
  static async signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to sign up:', error);
      throw error;
    }
  }

  /**
   * Sign out current user
   * @returns {Promise<void>}
   */
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Failed to sign out:', error);
      throw error;
    }
  }

  /**
   * Sync entries to Supabase
   * @param {Array} entries - Array of entries to sync
   * @returns {Promise<Object>} Sync result
   */
  static async syncEntries(entries) {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('User not authenticated');
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user.id;

      const syncResult = {
        synced: 0,
        errors: 0,
        errors: []
      };

      for (const entry of entries) {
        try {
          // Insert or update entry
          const { data: entryData, error: entryError } = await supabase
            .from('entries')
            .upsert({
              id: entry.id,
              user_id: userId,
              timestamp: entry.timestamp,
              created_at: entry.timestamp,
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (entryError) throw entryError;

          // Insert or update entry items
          for (const item of entry.items) {
            const { error: itemError } = await supabase
              .from('entry_items')
              .upsert({
                id: item.id,
                entry_id: entry.id,
                item_type: item.item_type,
                content: item.content,
                project: item.project,
                created_at: entry.timestamp,
                updated_at: new Date().toISOString()
              });

            if (itemError) throw itemError;

            // Handle tags
            for (const tagName of item.tags) {
              // Get or create tag
              const { data: tagData, error: tagError } = await supabase
                .from('tags')
                .upsert({ name: tagName })
                .select()
                .single();

              if (tagError) throw tagError;

              // Link tag to item
              const { error: linkError } = await supabase
                .from('item_tags')
                .upsert({
                  entry_item_id: item.id,
                  tag_id: tagData.id
                });

              if (linkError) throw linkError;
            }

            // Handle people
            for (const personName of item.people) {
              // Get or create person
              const { data: personData, error: personError } = await supabase
                .from('people')
                .upsert({ name: personName })
                .select()
                .single();

              if (personError) throw personError;

              // Link person to item
              const { error: linkError } = await supabase
                .from('item_people')
                .upsert({
                  entry_item_id: item.id,
                  person_id: personData.id
                });

              if (linkError) throw linkError;
            }

            // Handle Jira refs
            for (const jiraKey of item.jira) {
              const { error: jiraError } = await supabase
                .from('jira_refs')
                .upsert({
                  entry_item_id: item.id,
                  jira_key: jiraKey,
                  created_at: new Date().toISOString()
                });

              if (jiraError) throw jiraError;
            }
          }

          syncResult.synced++;
        } catch (error) {
          syncResult.errors++;
          syncResult.errors.push({
            entryId: entry.id,
            error: error.message
          });
        }
      }

      return syncResult;
    } catch (error) {
      console.error('Failed to sync entries:', error);
      throw error;
    }
  }

  /**
   * Fetch entries from Supabase
   * @returns {Promise<Array>} Array of entries
   */
  static async fetchEntries() {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('User not authenticated');
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user.id;

      // Fetch entries with items and metadata
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select(`
          *,
          entry_items (
            *,
            item_tags (
              tags (*)
            ),
            item_people (
              people (*)
            ),
            jira_refs (*)
          )
        `)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (entriesError) throw entriesError;

      // Transform the data to match our local format
      return entries.map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        items: entry.entry_items.map(item => ({
          id: item.id,
          item_type: item.item_type,
          content: item.content,
          project: item.project,
          tags: item.item_tags.map(it => it.tags.name),
          people: item.item_people.map(ip => ip.people.name),
          jira: item.jira_refs.map(jr => jr.jira_key)
        }))
      }));
    } catch (error) {
      console.error('Failed to fetch entries:', error);
      throw error;
    }
  }

  /**
   * Set up real-time subscription for entries
   * @param {Function} callback - Callback function for updates
   * @returns {Object} Subscription object
   */
  static subscribeToEntries(callback) {
    try {
      return supabase
        .channel('entries_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'entries'
          },
          callback
        )
        .subscribe();
    } catch (error) {
      console.error('Failed to subscribe to entries:', error);
      throw error;
    }
  }
}
