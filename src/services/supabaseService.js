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
      if (!supabase) {
        console.log('Supabase not configured, returning false for authentication');
        return false;
      }
      const { data: { user } } = await supabase.auth.getUser();
      return !!user;
    } catch (error) {
      console.error('Failed to check authentication:', error);
      return false;
    }
  }

  /**
   * Get current user
   * @returns {Promise<Object>} User object
   */
  static async getCurrentUser() {
    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }
      return await supabase.auth.getUser();
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
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
      if (!supabase) {
        throw new Error('Supabase not configured');
      }
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
      if (!supabase) {
        console.log('Supabase not configured, skipping sync');
        return { synced: 0, errors: 0, errors: [] };
      }
      
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
      if (!supabase) {
        console.log('Supabase not configured, cannot set up real-time subscription');
        return { unsubscribe: () => {} };
      }

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
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'entry_items'
          },
          callback
        )
        .subscribe();
    } catch (error) {
      console.error('Failed to subscribe to entries:', error);
      throw error;
    }
  }

  /**
   * Sync local entries to Supabase (bidirectional sync)
   * @param {Array} localEntries - Local entries to sync
   * @returns {Promise<Array>} Synced entries
   */
  static async syncEntriesBidirectional(localEntries) {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('User not authenticated');
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user.id;

      // Fetch remote entries
      const { data: remoteEntries, error: fetchError } = await supabase
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

      if (fetchError) throw fetchError;

      // Merge local and remote entries
      const mergedEntries = this.mergeEntries(localEntries, remoteEntries || []);

      // Upload merged entries to Supabase
      for (const entry of mergedEntries) {
        await this.uploadEntry(entry, userId);
      }

      return mergedEntries;
    } catch (error) {
      console.error('Failed to sync entries bidirectionally:', error);
      throw error;
    }
  }

  /**
   * Merge local and remote entries, resolving conflicts
   * @param {Array} localEntries - Local entries
   * @param {Array} remoteEntries - Remote entries
   * @returns {Array} Merged entries
   */
  static mergeEntries(localEntries, remoteEntries) {
    const merged = new Map();

    // Add remote entries first (they have priority for conflicts)
    remoteEntries.forEach(entry => {
      merged.set(entry.id, entry);
    });

    // Add local entries, only if they don't exist remotely or are newer
    localEntries.forEach(localEntry => {
      const remoteEntry = merged.get(localEntry.id);
      if (!remoteEntry || new Date(localEntry.timestamp) > new Date(remoteEntry.timestamp)) {
        merged.set(localEntry.id, localEntry);
      }
    });

    return Array.from(merged.values());
  }

  /**
   * Upload a single entry to Supabase
   * @param {Object} entry - Entry to upload
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  static async uploadEntry(entry, userId) {
    try {
      // Upload entry
      const { data: uploadedEntry, error: entryError } = await supabase
        .from('entries')
        .upsert({
          id: entry.id,
          user_id: userId,
          timestamp: entry.timestamp,
          created_at: entry.created_at,
          updated_at: entry.updated_at
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Upload entry items
      for (const item of entry.items) {
        const { data: uploadedItem, error: itemError } = await supabase
          .from('entry_items')
          .upsert({
            id: item.id,
            entry_id: uploadedEntry.id,
            item_type: item.type,
            content: item.content,
            project: item.project,
            created_at: item.created_at,
            updated_at: item.updated_at
          })
          .select()
          .single();

        if (itemError) throw itemError;

        // Upload tags
        for (const tagName of item.tags || []) {
          const { data: tag, error: tagError } = await supabase
            .from('tags')
            .upsert({
              name: tagName,
              user_id: userId
            })
            .select()
            .single();

          if (tagError) throw tagError;

          // Link tag to item
          await supabase
            .from('item_tags')
            .upsert({
              entry_item_id: uploadedItem.id,
              tag_id: tag.id
            });
        }

        // Upload people
        for (const personName of item.people || []) {
          const { data: person, error: personError } = await supabase
            .from('people')
            .upsert({
              name: personName,
              user_id: userId
            })
            .select()
            .single();

          if (personError) throw personError;

          // Link person to item
          await supabase
            .from('item_people')
            .upsert({
              entry_item_id: uploadedItem.id,
              person_id: person.id
            });
        }

        // Upload Jira refs
        for (const jiraKey of item.jira || []) {
          await supabase
            .from('jira_refs')
            .upsert({
              entry_item_id: uploadedItem.id,
              jira_key: jiraKey,
              user_id: userId
            });
        }
      }
    } catch (error) {
      console.error('Failed to upload entry:', error);
      throw error;
    }
  }
}
