import React, { useState, useEffect } from 'react';
import { JiraDashboardService } from '../services/jiraDashboardService.js';
import { JiraApiService } from '../services/jiraApiService.js';
import { useTheme } from '../contexts/ThemeContext';

/**
 * JiraDashboardPanel - Right-hand panel showing Jira projects and issues
 */
export default function JiraDashboardPanel({ refreshTrigger = 0, isOpen = false, onClose = null }) {
  const theme = useTheme();
  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [lastSync, setLastSync] = useState(null);
  const [statusFilters, setStatusFilters] = useState(new Set(['In Progress', 'To Do'])); // Default filter

  useEffect(() => {
    loadDataFromDatabase();
  }, [refreshTrigger]);

  useEffect(() => {
    // Set up sync interval (every 30 minutes)
    const syncInterval = setInterval(() => {
      syncFromJira();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(syncInterval);
  }, []);

  const loadDataFromDatabase = async () => {
    try {
      setIsLoading(true);
      const [loadedProjects, loadedIssues] = await Promise.all([
        JiraDashboardService.loadProjectsFromDatabase(),
        JiraDashboardService.loadIssuesFromDatabase()
      ]);

      setProjects(loadedProjects);
      setIssues(loadedIssues);
      
      // Get last sync time from most recent issue/project
      if (loadedIssues.length > 0) {
        const mostRecent = loadedIssues.reduce((latest, issue) => {
          if (!latest || !issue.last_sync_at) return issue;
          return new Date(issue.last_sync_at) > new Date(latest.last_sync_at) ? issue : latest;
        }, null);
        if (mostRecent?.last_sync_at) {
          setLastSync(new Date(mostRecent.last_sync_at));
        }
      }
    } catch (error) {
      console.error('❌ Failed to load Jira data from database:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncFromJira = async () => {
    try {
      console.log('🔄 Syncing Jira data from API...');
      const config = JiraApiService.getJiraConfig();
      if (!config?.enabled) {
        console.log('⚠️ Jira not configured, skipping sync');
        return;
      }

      // Fetch latest issues from Jira
      const latestIssues = await JiraApiService.getAssignedIssues();
      const projectKeys = [...new Set(latestIssues.map(i => i.projectKey).filter(Boolean))];
      
      // Get project details for these keys
      const allProjects = await JiraApiService.getProjects();
      const relevantProjects = allProjects.filter(p => projectKeys.includes(p.key));

      // Sync to database
      const result = await JiraDashboardService.syncToDashboard(relevantProjects, latestIssues);
      
      if (result.success) {
        console.log('✅ Successfully synced from Jira API');
        // Reload from database
        await loadDataFromDatabase();
      }
    } catch (error) {
      console.error('❌ Failed to sync from Jira:', error);
    }
  };

  const toggleProject = (projectKey) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectKey)) {
      newExpanded.delete(projectKey);
    } else {
      newExpanded.add(projectKey);
    }
    setExpandedProjects(newExpanded);
  };

  // Helper to check if status matches a filter (case-insensitive, flexible matching)
  const statusMatchesFilter = (status, filter) => {
    const statusLower = (status || '').toLowerCase().trim();
    const filterLower = (filter || '').toLowerCase().trim();
    
    // Exact match
    if (statusLower === filterLower) return true;
    
    // Special cases for common status variations
    if (filterLower === 'in progress') {
      return statusLower.includes('progress');
    }
    if (filterLower === 'to do' || filterLower === 'todo') {
      return statusLower.includes('todo') || statusLower.includes('to do');
    }
    
    // Partial match
    return statusLower.includes(filterLower) || filterLower.includes(statusLower);
  };

  const getIssuesForProject = (projectKey) => {
    return issues.filter(issue => {
      if (issue.project_key !== projectKey) return false;
      
      // Filter by status
      if (statusFilters.size > 0) {
        const matchesFilter = Array.from(statusFilters).some(filterStatus => 
          statusMatchesFilter(issue.status, filterStatus)
        );
        return matchesFilter;
      }
      
      return true; // If no filters selected, show all
    });
  };

  // Get all unique statuses from issues for filter options
  const getAllStatuses = () => {
    const statusSet = new Set();
    issues.forEach(issue => {
      if (issue.status) {
        statusSet.add(issue.status);
      }
    });
    return Array.from(statusSet).sort();
  };

  const toggleStatusFilter = (status) => {
    const newFilters = new Set(statusFilters);
    
    // Check if status is already in filters (using flexible matching)
    const existingFilter = Array.from(newFilters).find(f => statusMatchesFilter(status, f));
    
    if (existingFilter) {
      newFilters.delete(existingFilter);
    } else {
      // Add the actual status from issues (normalized)
      newFilters.add(status);
    }
    setStatusFilters(newFilters);
  };

  // Initialize default filters based on available issues
  useEffect(() => {
    if (issues.length > 0) {
      // Check if we're still on the initial default filters
      const currentFilters = Array.from(statusFilters).sort();
      const isDefaultFilters = currentFilters.length === 2 && 
                               currentFilters.join(',') === 'In Progress,To Do';
      
      if (isDefaultFilters) {
        // Get all statuses from issues
        const statusSet = new Set();
        issues.forEach(issue => {
          if (issue.status) {
            statusSet.add(issue.status);
          }
        });
        const allStatuses = Array.from(statusSet);
        
        // Find statuses that match "In Progress" and "To Do"
        const defaultFilters = new Set();
        allStatuses.forEach(status => {
          if (statusMatchesFilter(status, 'In Progress') || statusMatchesFilter(status, 'To Do')) {
            defaultFilters.add(status);
          }
        });
        
        // Only update if we found matching statuses and they're different from current
        if (defaultFilters.size > 0) {
          const defaultFiltersArray = Array.from(defaultFilters).sort();
          const currentFiltersArray = Array.from(statusFilters).sort();
          if (defaultFiltersArray.join(',') !== currentFiltersArray.join(',')) {
            setStatusFilters(defaultFilters);
          }
        }
      }
    }
  }, [issues]);

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('done') || statusLower.includes('closed')) return '#28a745';
    if (statusLower.includes('progress') || statusLower.includes('in progress')) return '#007bff';
    if (statusLower.includes('todo') || statusLower.includes('to do')) return '#6c757d';
    if (statusLower.includes('blocked') || statusLower.includes('block')) return '#dc3545';
    return '#ffc107';
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0h';
    return JiraDashboardService.formatSecondsToTime(seconds);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && onClose && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.colors.overlay,
            zIndex: 998,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Right Sidebar */}
      <div style={{
        position: 'fixed',
        top: '50px', // Below the header
        right: isOpen ? '0' : '-350px',
        width: '350px',
        height: 'calc(100vh - 50px)',
        backgroundColor: theme.colors.menuBackground || theme.colors.cardBackground,
        boxShadow: theme.colors.cardShadow || '0 0 20px rgba(0,0,0,0.3)',
        zIndex: 999,
        transition: 'right 0.3s ease',
        padding: '20px 0',
        overflowY: 'auto',
        borderLeft: `1px solid ${theme.colors.border}`
      }}>
        <div style={{ padding: '0 20px' }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px',
            borderBottom: `1px solid ${theme.colors.borderLight || theme.colors.border}`,
            paddingBottom: '10px'
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '16px', 
              color: theme.colors.text,
              textAlign: 'center',
              flex: 1
            }}>
              📋 Jira Tasks
            </h3>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: theme.colors.textSecondary,
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
                title="Close Menu"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sync Button and Last Sync Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button
              onClick={syncFromJira}
              disabled={isLoading}
              style={{
                padding: '8px 12px',
                backgroundColor: theme.colors.info || '#17a2b8',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: isLoading ? 0.6 : 1
              }}
              title="Sync from Jira API"
            >
              🔄 Sync
            </button>
            {lastSync && (
              <div style={{ fontSize: '10px', color: theme.colors.textSecondary }}>
                Last: {lastSync.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Status Filter */}
          {issues.length > 0 && (
            <div style={{ 
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: theme.colors.surface,
              borderRadius: '6px',
              border: `1px solid ${theme.colors.border}`
            }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 'bold', 
                color: theme.colors.text,
                marginBottom: '8px'
              }}>
                🔍 Filter by Status:
              </div>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {getAllStatuses().map(status => {
                  const isChecked = Array.from(statusFilters).some(filterStatus => 
                    statusMatchesFilter(status, filterStatus)
                  );
                  
                  return (
                    <label
                      key={status}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: theme.colors.text,
                        userSelect: 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStatusFilter(status)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '12px',
                        backgroundColor: isChecked ? getStatusColor(status) : 'transparent',
                        color: isChecked ? '#fff' : theme.colors.text,
                        fontSize: '10px',
                        fontWeight: isChecked ? 'bold' : 'normal',
                        border: isChecked ? 'none' : `1px solid ${theme.colors.border}`
                      }}>
                        {status}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && projects.length === 0 && (
            <div style={{ textAlign: 'center', color: theme.colors.textSecondary, padding: '20px' }}>
              Loading Jira data...
            </div>
          )}

          {/* Empty State */}
          {!isLoading && projects.length === 0 && issues.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              color: theme.colors.textSecondary, 
              padding: '20px',
              fontSize: '12px'
            }}>
              <p style={{ margin: 0, marginBottom: '8px' }}>No Jira projects or tasks added to dashboard yet.</p>
              <p style={{ margin: 0, fontSize: '11px', opacity: 0.7 }}>
                Go to Jira API settings to add projects and issues.
              </p>
            </div>
          )}

          {/* Projects and Issues */}
          {projects.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {projects
                .map(project => {
                  const projectIssues = getIssuesForProject(project.project_key);
                  return { project, projectIssues };
                })
                .filter(({ projectIssues }) => projectIssues.length > 0)
                .map(({ project, projectIssues }) => {
                const isExpanded = expandedProjects.has(project.project_key);

                return (
                  <div key={project.id} style={{
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}>
                    {/* Project Header */}
                    <div
                      onClick={() => toggleProject(project.project_key)}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: theme.colors.surface,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          {project.project_name} ({projectIssues.length})
                        </span>
                      </div>
                    </div>

                    {/* Issues */}
                    {isExpanded && projectIssues.length > 0 && (
                      <div style={{ padding: '8px' }}>
                        {projectIssues.map(issue => (
                          <div
                            key={issue.id}
                            style={{
                              padding: '8px',
                              marginBottom: '6px',
                              backgroundColor: theme.colors.cardBackground,
                              border: `1px solid ${theme.colors.border}`,
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          >
                            {/* Issue Key and Summary */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                              <div style={{ flex: 1 }}>
                                <a
                                  href={issue.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontWeight: 'bold',
                                    color: theme.colors.primary,
                                    textDecoration: 'none',
                                    fontSize: '13px'
                                  }}
                                >
                                  {issue.issue_key}
                                </a>
                                <div style={{ fontSize: '11px', color: theme.colors.text, marginTop: '2px' }}>
                                  {issue.summary?.substring(0, 60)}
                                  {issue.summary?.length > 60 ? '...' : ''}
                                </div>
                              </div>
                            </div>

                            {/* Status Pill */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '12px',
                                backgroundColor: getStatusColor(issue.status),
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 'bold'
                              }}>
                                {issue.status}
                              </span>

                              {/* Time Tracking Info */}
                              {issue.original_estimate_seconds && (
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '12px',
                                  backgroundColor: theme.colors.surface,
                                  color: theme.colors.text,
                                  fontSize: '10px',
                                  border: `1px solid ${theme.colors.border}`
                                }}>
                                  Est: {formatTime(issue.original_estimate_seconds)}
                                </span>
                              )}

                              {issue.time_spent_seconds && issue.time_spent_seconds > 0 && (
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '12px',
                                  backgroundColor: theme.colors.info || '#17a2b8',
                                  color: '#fff',
                                  fontSize: '10px',
                                  fontWeight: 'bold'
                                }}>
                                  Worked: {formatTime(issue.time_spent_seconds)}
                                </span>
                              )}

                              {issue.due_date && (
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '12px',
                                  backgroundColor: theme.colors.warning || '#ffc107',
                                  color: '#fff',
                                  fontSize: '10px',
                                  fontWeight: 'bold'
                                }}>
                                  Due: {formatDate(issue.due_date)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

