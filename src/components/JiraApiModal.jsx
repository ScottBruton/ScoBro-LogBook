import React, { useState, useEffect } from 'react';
import { JiraApiService } from '../services/jiraApiService.js';
import { JiraDashboardService } from '../services/jiraDashboardService.js';
import { useTheme } from '../contexts/ThemeContext';

/**
 * JiraApiModal - Jira API configuration and management interface
 * Provides functionality to configure Jira API settings and manage issue synchronization
 */
export default function JiraApiModal({ isOpen, onClose, onIssuesSynced }) {
  const theme = useTheme();
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [jiraStats, setJiraStats] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [recentIssues, setRecentIssues] = useState([]);
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({
    connectionStatus: false,
    configuration: false,
    availableProjects: false,
    actions: false,
    statistics: false
  });

  useEffect(() => {
    if (isOpen) {
      loadJiraConfig();
    }
  }, [isOpen]);

  // Load data after config is loaded
  useEffect(() => {
    if (isOpen && config?.enabled) {
      console.log('📋 Config loaded, now loading Jira data...');
      loadJiraData();
    }
  }, [isOpen, config?.enabled]);

  // Reload assigned tasks when selected projects change (but only once, not on every render)
  useEffect(() => {
    if (isOpen && config?.enabled && selectedProjects.length > 0) {
      // Only reload if we have tasks loaded, otherwise it will load on initial mount anyway
      if (assignedTasks.length > 0) {
        loadAssignedTasks();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjects.join(',')]);

  const loadJiraConfig = () => {
    try {
      const jiraConfig = JiraApiService.getJiraConfig();
      setConfig(jiraConfig);
      setSelectedProjects(jiraConfig.projectKeys || []);
      setSyncStatus(JiraApiService.getSyncStatus());
    } catch (error) {
      console.error('Failed to load Jira config:', error);
    }
  };

  const loadJiraData = async () => {
    if (!config?.enabled) return;

    try {
      setIsLoading(true);
      
      const [stats, recent, assigned, projectsData] = await Promise.all([
        JiraApiService.getJiraStats(),
        JiraApiService.getRecentIssues(),
        JiraApiService.getAssignedIssues(),
        JiraApiService.getProjects()
      ]);

      setJiraStats(stats);
      setRecentIssues(recent);
      setAssignedIssues(assigned);
      setAssignedTasks(assigned); // Set assigned tasks for the new panel
      setProjects(projectsData);
      
      // Log if assigned tasks loaded successfully
      console.log('📋 Jira data loaded:', {
        stats: !!stats,
        recentIssues: recent?.length || 0,
        assignedIssues: assigned?.length || 0,
        projects: projectsData?.length || 0
      });
      
      if (assigned && assigned.length > 0) {
        console.log('📋 Sample assigned task project keys:', assigned.slice(0, 5).map(t => t.projectKey));
      } else if (assigned && assigned.length === 0) {
        console.warn('⚠️ Assigned tasks loaded but array is empty - check backend logs for errors');
      }
      
      // Update lastSync when data is successfully loaded
      if (stats || recent || assigned || projectsData) {
        const newConfig = { 
          ...config, 
          lastSync: new Date().toISOString()
        };
        setConfig(newConfig);
        JiraApiService.saveJiraConfig(newConfig);
        setSyncStatus(JiraApiService.getSyncStatus());
      }
    } catch (error) {
      console.error('Failed to load Jira data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const projectsData = await JiraApiService.getProjects();
      setProjects(projectsData);
      
      // Update lastSync when projects are successfully loaded
      if (projectsData && projectsData.length > 0) {
        const newConfig = { 
          ...config, 
          lastSync: new Date().toISOString()
        };
        setConfig(newConfig);
        JiraApiService.saveJiraConfig(newConfig);
        setSyncStatus(JiraApiService.getSyncStatus());
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      setTestResult({
        success: false,
        message: `Failed to load projects: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignedTasks = async () => {
    try {
      setIsLoading(true);
      console.log('📋 Starting to load assigned tasks...');
      const tasks = await JiraApiService.getAssignedIssues();
      
      console.log('📋 Loaded assigned tasks:', {
        count: tasks.length,
        tasks: tasks.slice(0, 10).map(t => ({
          key: t.key,
          projectKey: t.projectKey,
          project: t.project,
          summary: t.summary?.substring(0, 50) || 'No summary'
        })),
        allProjectKeys: [...new Set(tasks.map(t => t.projectKey).filter(Boolean))]
      });
      
      if (tasks.length === 0) {
        console.warn('⚠️ No assigned tasks returned from API. Check backend logs for errors.');
      }
      
      setAssignedTasks(tasks);
      
      // Update lastSync when assigned tasks are successfully loaded
      if (tasks && tasks.length >= 0) {
        const newConfig = { 
          ...config, 
          lastSync: new Date().toISOString()
        };
        setConfig(newConfig);
        JiraApiService.saveJiraConfig(newConfig);
        setSyncStatus(JiraApiService.getSyncStatus());
      }
    } catch (error) {
      console.error('❌ Failed to load assigned tasks:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setTestResult({
        success: false,
        message: `Failed to load assigned tasks: ${error.message}`
      });
      // Still set empty array so UI doesn't break
      setAssignedTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const result = await JiraApiService.testConnection(config);
      setTestResult(result);
      
      if (result.success) {
        // Update config with successful connection and set lastSync
        const newConfig = { 
          ...config, 
          enabled: true,
          lastSync: new Date().toISOString() // Set lastSync when connection succeeds
        };
        setConfig(newConfig);
        JiraApiService.saveJiraConfig(newConfig);
        setSyncStatus(JiraApiService.getSyncStatus());
        
        // Load projects after successful connection
        await loadProjects();
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = () => {
    try {
      JiraApiService.saveJiraConfig(config);
      setTestResult({
        success: true,
        message: 'Configuration saved successfully!'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Failed to save configuration: ${error.message}`
      });
    }
  };

  const handleAddToDashboard = async () => {
    try {
      setIsLoading(true);
      
      // Get selected projects and their issues
      const selectedProjectObjects = projects.filter(p => 
        selectedProjects.includes(p.key)
      );
      
      const tasksToAdd = getTasksBySelectedProjects();
      const allIssues = [];
      Object.values(tasksToAdd).forEach(projectIssues => {
        allIssues.push(...projectIssues);
      });

      console.log('📊 Adding to dashboard:', {
        projects: selectedProjectObjects.length,
        issues: allIssues.length
      });

      // Sync to Supabase
      const result = await JiraDashboardService.syncToDashboard(
        selectedProjectObjects,
        allIssues
      );

      if (result.success) {
        setTestResult({
          success: true,
          message: `Successfully added ${result.projectsSynced} projects and ${result.issuesSynced} issues to dashboard!`
        });
        
        // Trigger callback to refresh dashboard if provided
        if (onIssuesSynced) {
          onIssuesSynced();
        }
      } else {
        setTestResult({
          success: false,
          message: `Failed to add to dashboard: ${result.error || 'Unknown error'}`
        });
      }
    } catch (error) {
      console.error('❌ Failed to add to dashboard:', error);
      setTestResult({
        success: false,
        message: `Failed to add to dashboard: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncIssues = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, you would pass the actual entries
      // For now, we'll simulate the sync process
      const mockEntries = [
        {
          items: [
            { jira: ['PROJ-123', 'TASK-456'] }
          ]
        }
      ];

      const result = await JiraApiService.syncJiraIssues(mockEntries, config);
      setSyncStatus(JiraApiService.getSyncStatus());
      
      if (onIssuesSynced) {
        onIssuesSynced(result.issues);
      }
      
      setTestResult({
        success: true,
        message: `Successfully synced ${result.synced} Jira issues!`
      });
      
      // Reload data
      await loadJiraData();
    } catch (error) {
      setTestResult({
        success: false,
        message: `Failed to sync issues: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = () => {
    if (confirm('Are you sure you want to disable Jira API integration?')) {
      JiraApiService.disableJiraApi();
      setConfig(JiraApiService.getJiraConfig());
      setSyncStatus(JiraApiService.getSyncStatus());
      setJiraStats(null);
      setRecentIssues([]);
      setAssignedIssues([]);
      setTestResult(null);
    }
  };

  const handleConfigChange = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
  };

  const handleProjectSelection = (projectKey, isSelected) => {
    let newSelectedProjects;
    if (isSelected) {
      newSelectedProjects = [...selectedProjects, projectKey];
    } else {
      newSelectedProjects = selectedProjects.filter(key => key !== projectKey);
    }
    setSelectedProjects(newSelectedProjects);
    handleConfigChange('projectKeys', newSelectedProjects);
  };

  const handleRemoveProject = (projectKey) => {
    const newSelectedProjects = selectedProjects.filter(key => key !== projectKey);
    setSelectedProjects(newSelectedProjects);
    handleConfigChange('projectKeys', newSelectedProjects);
  };

  const getProjectName = (projectKey) => {
    const project = projects.find(p => p.key === projectKey);
    return project ? project.name : projectKey;
  };

  // Filter projects based on search query
  const getFilteredProjects = () => {
    if (!projectSearchQuery.trim()) {
      return projects;
    }
    const query = projectSearchQuery.toLowerCase().trim();
    return projects.filter(project => 
      project.key.toLowerCase().includes(query) ||
      project.name.toLowerCase().includes(query) ||
      (project.description && project.description.toLowerCase().includes(query))
    );
  };

  const handleProjectKeyChange = (value) => {
    const projectKeys = value.split(',').map(key => key.trim()).filter(key => key);
    setSelectedProjects(projectKeys);
    handleConfigChange('projectKeys', projectKeys);
  };

  // Get all unique project keys from loaded tasks
  const getAllTaskProjectKeys = () => {
    const allKeys = assignedTasks.map(t => t.projectKey).filter(Boolean);
    const uniqueKeys = [...new Set(allKeys)];
    console.log('🔍 All unique project keys in loaded tasks:', uniqueKeys);
    return uniqueKeys;
  };

  // Get tasks grouped by selected projects
  const getTasksBySelectedProjects = () => {
    const allTaskProjectKeys = getAllTaskProjectKeys();
    
    console.log('🔍 Filtering tasks by selected projects:', {
      selectedProjects,
      totalTasks: assignedTasks.length,
      uniqueTaskProjectKeys: allTaskProjectKeys,
      taskProjectKeysSample: assignedTasks.slice(0, 5).map(t => ({
        key: t.key,
        projectKey: t.projectKey,
        project: t.project
      }))
    });
    
    // Filter tasks to only those from selected projects (case-insensitive)
    const filteredTasks = assignedTasks.filter(task => {
      const taskProjectKey = (task.projectKey || '').toUpperCase();
      const matches = selectedProjects.some(selectedKey => 
        selectedKey.toUpperCase() === taskProjectKey
      );
      
      if (!matches && task.projectKey) {
        console.log(`⚠️ Task ${task.key} has projectKey "${task.projectKey}" but it's not in selected projects:`, selectedProjects);
      }
      
      return matches;
    });
    
    console.log('🔍 Filtered tasks count:', filteredTasks.length);
    console.log('🔍 Filtered tasks breakdown by project:', 
      filteredTasks.reduce((acc, task) => {
        const key = task.projectKey || 'UNKNOWN';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    );
    
    // Group by project (case-insensitive matching)
    const grouped = {};
    selectedProjects.forEach(projectKey => {
      const projectTasks = filteredTasks.filter(task => 
        (task.projectKey || '').toUpperCase() === projectKey.toUpperCase()
      );
      console.log(`🔍 Project ${projectKey}: ${projectTasks.length} tasks`);
      
      // Always include selected projects in the grouped structure, even if no tasks
      grouped[projectKey] = projectTasks;
    });
    
    return grouped;
  };

  // Filter assigned tasks by status
  const getFilteredTasks = (tasks) => {
    if (!tasks) return [];
    if (taskStatusFilter === 'all') {
      return tasks;
    }
    return tasks.filter(task => task.status === taskStatusFilter);
  };

  // Get unique statuses for filter dropdown (from selected projects only)
  const getUniqueStatuses = () => {
    const filteredTasks = assignedTasks.filter(task => {
      const taskProjectKey = (task.projectKey || '').toUpperCase();
      return selectedProjects.some(selectedKey => 
        selectedKey.toUpperCase() === taskProjectKey
      );
    });
    const statuses = [...new Set(filteredTasks.map(task => task.status))];
    return statuses.sort();
  };

  // Get total count of tasks in selected projects
  const getTotalSelectedProjectTasks = () => {
    return assignedTasks.filter(task => {
      const taskProjectKey = (task.projectKey || '').toUpperCase();
      return selectedProjects.some(selectedKey => 
        selectedKey.toUpperCase() === taskProjectKey
      );
    }).length;
  };

  // Toggle section collapse state
  const toggleSection = (sectionName) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Collapsible section component
  const CollapsibleSection = ({ title, isCollapsed, onToggle, children, icon = null }) => (
    <div style={{ marginBottom: '20px', border: `1px solid ${theme.colors.border}`, borderRadius: '6px', overflow: 'hidden' }}>
      <div
        onClick={onToggle}
        style={{
          padding: '12px 16px',
          backgroundColor: theme.colors.menuItemHover,
          borderBottom: isCollapsed ? 'none' : `1px solid ${theme.colors.border}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.surface;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.menuItemHover;
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▶
          </span>
          {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: theme.colors.text }}>
            {title}
          </h3>
        </div>
        <span style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
          {isCollapsed ? '▼' : '▲'}
        </span>
      </div>
      {!isCollapsed && (
        <div style={{ padding: '16px', backgroundColor: theme.colors.cardBackground }}>
          {children}
        </div>
      )}
    </div>
  );

  // Format time duration
  const formatTime = (timeString) => {
    if (!timeString) return 'Not set';
    // Jira time format is usually like "1d 2h 30m" or "2h 30m"
    return timeString;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'synced': return '#28a745';
      case 'stale': return '#ffc107';
      case 'disabled': return '#6c757d';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'synced': return '✅';
      case 'stale': return '⚠️';
      case 'disabled': return '❌';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: theme.colors.overlay,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.cardBackground,
          color: theme.colors.text,
          padding: '24px',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: `1px solid ${theme.colors.border}`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔗 Jira API Integration
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: theme.colors.textSecondary
            }}
          >
            ✕
          </button>
        </div>

        {/* Connection Status */}
        {syncStatus && (
          <CollapsibleSection
            title="Connection Status"
            isCollapsed={collapsedSections.connectionStatus}
            onToggle={() => toggleSection('connectionStatus')}
            icon="🔌"
          >
            <div style={{
              padding: '12px',
              backgroundColor: theme.colors.surface,
              border: `2px solid ${getStatusColor(syncStatus.status)}`,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>{getStatusIcon(syncStatus.status)}</span>
              <div>
                <div style={{ fontWeight: 'bold', color: getStatusColor(syncStatus.status) }}>
                  {syncStatus.status.charAt(0).toUpperCase() + syncStatus.status.slice(1).replace('_', ' ')}
                </div>
                <div style={{ fontSize: '14px', color: theme.colors.textSecondary }}>
                  {syncStatus.message}
                </div>
                {syncStatus.lastSync && (
                  <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                    Last sync: {new Date(syncStatus.lastSync).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Configuration */}
        <CollapsibleSection
          title="Configuration"
          isCollapsed={collapsedSections.configuration}
          onToggle={() => toggleSection('configuration')}
          icon="⚙️"
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '16px' }}>
            {config?.enabled && (
              <button
                onClick={handleDisable}
                style={{
                  padding: '6px 12px',
                  backgroundColor: theme.colors.error,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Disable
              </button>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Jira Base URL *
              </label>
              <input
                type="url"
                value={config?.baseUrl || ''}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                placeholder="https://yourcompany.atlassian.net"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: `1px solid ${theme.colors.inputBorder}`,
                  backgroundColor: theme.colors.inputBackground,
                  color: theme.colors.text,
                  borderRadius: '4px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Username/Email *
              </label>
              <input
                type="email"
                value={config?.username || ''}
                onChange={(e) => handleConfigChange('username', e.target.value)}
                placeholder="your.email@company.com"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: `1px solid ${theme.colors.inputBorder}`,
                  backgroundColor: theme.colors.inputBackground,
                  color: theme.colors.text,
                  borderRadius: '4px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                API Token *
              </label>
              <input
                type="password"
                value={config?.apiToken || ''}
                onChange={(e) => handleConfigChange('apiToken', e.target.value)}
                placeholder="Your Jira API token"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: `1px solid ${theme.colors.inputBorder}`,
                  backgroundColor: theme.colors.inputBackground,
                  color: theme.colors.text,
                  borderRadius: '4px'
                }}
              />
              <div style={{ fontSize: '12px', color: theme.colors.textSecondary, marginTop: '4px' }}>
                Generate at: <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer">Atlassian Account Settings</a>
              </div>
            </div>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <CollapsibleSection
                title={`Available Projects ${projects.length > 0 ? `(${projects.length} total)` : ''}`}
                isCollapsed={collapsedSections.availableProjects}
                onToggle={() => toggleSection('availableProjects')}
                icon="📁"
              >
              {projects.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    placeholder="Search projects by key or name..."
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: `1px solid ${theme.colors.inputBorder}`,
                      backgroundColor: theme.colors.inputBackground,
                      color: theme.colors.text,
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              )}
              {projects.length > 0 ? (
                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '4px',
                  padding: '8px',
                  backgroundColor: theme.colors.surface
                }}>
                  {getFilteredProjects().length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                      {getFilteredProjects().map(project => (
                      <label
                        key={project.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          backgroundColor: selectedProjects.includes(project.key) ? theme.colors.menuItemHover : theme.colors.cardBackground,
                          border: `1px solid ${selectedProjects.includes(project.key) ? theme.colors.primary : theme.colors.border}`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(project.key)}
                          onChange={(e) => handleProjectSelection(project.key, e.target.checked)}
                          style={{ margin: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                            {project.key}
                          </div>
                          <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                            {project.name}
                          </div>
                        </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: theme.colors.textSecondary,
                      fontStyle: 'italic'
                    }}>
                      No projects match "{projectSearchQuery}"
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: theme.colors.textSecondary,
                  border: `1px dashed ${theme.colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: theme.colors.surface
                }}>
                  {config?.enabled ? 'No projects found. Click "Test Connection" to load projects.' : 'Connect to Jira to see available projects.'}
                </div>
              )}
              {selectedProjects.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: theme.colors.textSecondary, 
                    marginBottom: '8px',
                    fontWeight: 'bold'
                  }}>
                    Selected Projects:
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '6px',
                    padding: '8px',
                    backgroundColor: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '4px',
                    minHeight: '36px'
                  }}>
                    {selectedProjects.map(projectKey => {
                      const project = projects.find(p => p.key === projectKey);
                      const isInList = !!project;
                      return (
                        <div
                          key={projectKey}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            backgroundColor: isInList ? theme.colors.primary : theme.colors.warning,
                            color: '#fff',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          <span>{projectKey}</span>
                          {project && (
                            <span style={{ fontSize: '10px', opacity: 0.8 }}>
                              ({project.name})
                            </span>
                          )}
                          <button
                            onClick={() => handleRemoveProject(projectKey)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#fff',
                              cursor: 'pointer',
                              padding: '0 2px',
                              fontSize: '14px',
                              lineHeight: '1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                            }}
                            title={`Remove ${projectKey} from selected projects`}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </CollapsibleSection>
            </div>
            
            {/* Assigned Tasks Panel - Grouped by Selected Projects */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: 'bold' }}>
                  Assigned Tasks {selectedProjects.length > 0 && `(${getTotalSelectedProjectTasks()} task${getTotalSelectedProjectTasks() !== 1 ? 's' : ''} in ${selectedProjects.length} project${selectedProjects.length !== 1 ? 's' : ''})`}
                </label>
                
                {/* Debug info - show all project keys in loaded tasks */}
                {assignedTasks.length > 0 && (
                  <div style={{ 
                    fontSize: '10px', 
                    color: theme.colors.textSecondary,
                    padding: '4px 8px',
                    backgroundColor: theme.colors.surface,
                    borderRadius: '4px',
                    border: `1px solid ${theme.colors.border}`
                  }}>
                    Loaded: {assignedTasks.length} tasks from {getAllTaskProjectKeys().length} projects
                    {getAllTaskProjectKeys().length > 0 && (
                      <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                        ({getAllTaskProjectKeys().join(', ')})
                      </span>
                    )}
                  </div>
                )}
                {getTotalSelectedProjectTasks() > 0 && (
                  <select
                    value={taskStatusFilter}
                    onChange={(e) => setTaskStatusFilter(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      border: `1px solid ${theme.colors.inputBorder}`,
                      backgroundColor: theme.colors.inputBackground,
                      color: theme.colors.text,
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <option value="all">All Statuses ({getTotalSelectedProjectTasks()})</option>
                    {getUniqueStatuses().map(status => {
                      const count = assignedTasks.filter(task => 
                        selectedProjects.includes(task.projectKey) && task.status === status
                      ).length;
                      return (
                        <option key={status} value={status}>
                          {status} ({count})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
              
              {selectedProjects.length === 0 ? (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: theme.colors.textSecondary,
                  border: `1px dashed ${theme.colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: theme.colors.surface
                }}>
                  Select projects above to see assigned tasks
                </div>
              ) : (
                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: theme.colors.surface,
                  padding: '8px'
                }}>
                  {Object.entries(getTasksBySelectedProjects()).map(([projectKey, projectTasks]) => {
                    const project = projects.find(p => p.key === projectKey);
                    const filteredTasks = getFilteredTasks(projectTasks);
                    const projectName = project ? project.name : projectKey;
                    
                    return (
                      <div
                        key={projectKey}
                        style={{
                          marginBottom: '12px',
                          border: `1px solid ${theme.colors.border}`,
                          borderRadius: '4px',
                          backgroundColor: theme.colors.cardBackground,
                          overflow: 'hidden'
                        }}
                      >
                        {/* Project Header (Folder-like) */}
                        <div style={{
                          padding: '10px 12px',
                          backgroundColor: theme.colors.menuItemHover,
                          borderBottom: `1px solid ${theme.colors.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer'
                        }}>
                          <span style={{ fontSize: '14px' }}>📁</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', color: theme.colors.primary, fontSize: '14px' }}>
                              {projectKey}
                            </div>
                            <div style={{ fontSize: '11px', color: theme.colors.textSecondary }}>
                              {projectName}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '11px',
                            color: theme.colors.textSecondary,
                            padding: '2px 6px',
                            backgroundColor: theme.colors.surface,
                            borderRadius: '12px'
                          }}>
                            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {/* Tasks List (Nested under project) */}
                        <div style={{ padding: '0' }}>
                          {filteredTasks.length > 0 ? (
                            filteredTasks.map(task => (
                              <div
                                key={task.key}
                                style={{
                                  padding: '10px 12px 10px 32px',
                                  borderBottom: `1px solid ${theme.colors.border}`,
                                  backgroundColor: theme.colors.cardBackground,
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = theme.colors.surface;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = theme.colors.cardBackground;
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                      <span style={{ fontWeight: 'bold', color: theme.colors.primary, fontSize: '13px' }}>
                                        {task.key}
                                      </span>
                                      <span style={{
                                        padding: '2px 6px',
                                        backgroundColor: JiraApiService.getStatusColor(task.status),
                                        color: '#fff',
                                        borderRadius: '3px',
                                        fontSize: '10px'
                                      }}>
                                        {task.status}
                                      </span>
                                      <span style={{
                                        padding: '2px 6px',
                                        backgroundColor: JiraApiService.getPriorityColor(task.priority),
                                        color: '#fff',
                                        borderRadius: '3px',
                                        fontSize: '10px'
                                      }}>
                                        {task.priority}
                                      </span>
                                    </div>
                                    <div style={{ fontWeight: '500', marginBottom: '2px', fontSize: '13px' }}>
                                      {task.summary}
                                    </div>
                                    {task.sprint && task.sprint !== 'No Sprint' && (
                                      <div style={{ fontSize: '11px', color: theme.colors.textSecondary }}>
                                        Sprint: {task.sprint}
                                      </div>
                                    )}
                                  </div>
                                  <a
                                    href={task.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      padding: '4px 8px',
                                      backgroundColor: theme.colors.primary,
                                      color: '#fff',
                                      textDecoration: 'none',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      whiteSpace: 'nowrap',
                                      marginLeft: '8px'
                                    }}
                                  >
                                    Open
                                  </a>
                                </div>
                                
                                {/* Compact time tracking */}
                                {(task.originalEstimate || task.timeSpent || task.remainingEstimate || task.storyPoints) && (
                                  <div style={{ display: 'flex', gap: '8px', fontSize: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    {task.originalEstimate && (
                                      <span style={{ color: theme.colors.textSecondary }}>
                                        Est: {formatTime(task.originalEstimate)}
                                      </span>
                                    )}
                                    {task.timeSpent && (
                                      <span style={{ color: theme.colors.textSecondary }}>
                                        Spent: {formatTime(task.timeSpent)}
                                      </span>
                                    )}
                                    {task.remainingEstimate && (
                                      <span style={{ color: theme.colors.textSecondary }}>
                                        Remaining: {formatTime(task.remainingEstimate)}
                                      </span>
                                    )}
                                    {task.storyPoints && (
                                      <span style={{ color: theme.colors.textSecondary }}>
                                        SP: {task.storyPoints}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div style={{
                              padding: '12px 12px 12px 32px',
                              color: theme.colors.textSecondary,
                              fontSize: '12px',
                              fontStyle: 'italic'
                            }}>
                              No assigned tasks for this project
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {Object.keys(getTasksBySelectedProjects()).length === 0 && (
                    <div style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: theme.colors.textSecondary,
                      fontSize: '12px'
                    }}>
                      {assignedTasks.length === 0 ? (
                        <div>
                          <div style={{ marginBottom: '8px' }}>No assigned tasks loaded yet.</div>
                          <div style={{ fontSize: '11px', opacity: 0.7 }}>Click "Load Assigned Tasks" to fetch tasks from Jira.</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ marginBottom: '8px' }}>No tasks found for selected projects.</div>
                          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '8px', padding: '8px', backgroundColor: theme.colors.surface, borderRadius: '4px' }}>
                            <div><strong>Selected Projects:</strong> {selectedProjects.join(', ') || 'None'}</div>
                            <div style={{ marginTop: '4px' }}><strong>Available in loaded tasks:</strong> {getAllTaskProjectKeys().join(', ') || 'None'}</div>
                            {getAllTaskProjectKeys().length > 0 && selectedProjects.length > 0 && (
                              <div style={{ marginTop: '4px', color: theme.colors.warning }}>
                                ⚠️ Project keys don't match. Make sure selected project keys match the keys in loaded tasks.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Sync Interval (minutes)
              </label>
              <select
                value={config?.syncInterval || 30}
                onChange={(e) => handleConfigChange('syncInterval', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: `1px solid ${theme.colors.inputBorder}`,
                  backgroundColor: theme.colors.inputBackground,
                  color: theme.colors.text,
                  borderRadius: '4px'
                }}
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>
          
          <div style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={config?.autoFetchIssues || false}
                onChange={(e) => handleConfigChange('autoFetchIssues', e.target.checked)}
              />
              Auto-fetch issue details
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={config?.includeIssueDetails || false}
                onChange={(e) => handleConfigChange('includeIssueDetails', e.target.checked)}
              />
              Include detailed issue information
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={config?.includeComments || false}
                onChange={(e) => handleConfigChange('includeComments', e.target.checked)}
              />
              Include comments
            </label>
          </div>
          </CollapsibleSection>

        {/* Actions */}
        <CollapsibleSection
          title="Actions"
          isCollapsed={collapsedSections.actions}
          onToggle={() => toggleSection('actions')}
          icon="🎯"
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSaveConfig}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: theme.colors.secondary,
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              💾 Save Configuration
            </button>
            
            <button
              onClick={handleTestConnection}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: theme.colors.info,
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? '⏳' : '🔍'} Test Connection
            </button>
            
            {config?.enabled && (
              <button
                onClick={loadProjects}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme.colors.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? '⏳' : '📁'} Load Projects
              </button>
            )}
            
            {config?.enabled && (
              <button
                onClick={loadAssignedTasks}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme.colors.warning,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? '⏳' : '📋'} Load Assigned Tasks
              </button>
            )}
            
            {config?.enabled && (
              <button
                onClick={handleSyncIssues}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme.colors.success,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? '⏳' : '🔄'} Sync Issues
              </button>
            )}
          </div>
        </CollapsibleSection>

        {/* Add to Dashboard Button */}
        {config?.enabled && selectedProjects.length > 0 && assignedTasks.length > 0 && (
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: theme.colors.surface, borderRadius: '6px', border: `1px solid ${theme.colors.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: '8px' }}>Add to Dashboard</h3>
                <p style={{ margin: 0, fontSize: '12px', color: theme.colors.textSecondary }}>
                  Add {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} and {getTotalSelectedProjectTasks()} task{getTotalSelectedProjectTasks() !== 1 ? 's' : ''} to the main dashboard view.
                </p>
              </div>
              <button
                onClick={handleAddToDashboard}
                disabled={isLoading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: theme.colors.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  opacity: isLoading ? 0.6 : 1,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                {isLoading ? '⏳' : '📊'} Add to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              padding: '12px',
              backgroundColor: testResult.success ? theme.colors.pillConnectedBg : theme.colors.pillErrorBg,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '6px',
              color: '#fff'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {testResult.success ? '✅ Success' : '❌ Error'}
              </div>
              <div>{testResult.message}</div>
            </div>
          </div>
        )}

        {/* Statistics */}
        {jiraStats && (
          <CollapsibleSection
            title="Statistics"
            isCollapsed={collapsedSections.statistics}
            onToggle={() => toggleSection('statistics')}
            icon="📊"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: theme.colors.surface, borderRadius: '6px', textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: '4px' }}>Assigned Tasks</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{assignedTasks.length}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: theme.colors.surface, borderRadius: '6px', textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: '4px' }}>Recent Issues</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{jiraStats.recentCount}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: theme.colors.surface, borderRadius: '6px', textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: '4px' }}>Selected Projects</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedProjects.length}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: theme.colors.surface, borderRadius: '6px', textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: '4px' }}>Available Projects</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{projects.length}</div>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Assigned Issues */}
        {assignedIssues.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px' }}>📋 Assigned Issues</h3>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {assignedIssues.map((issue) => (
                <div
                  key={issue.key}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {JiraApiService.getIssueTypeIcon(issue.issueType)} {issue.key}: {issue.summary}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                        {issue.project} • {issue.assignee}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          padding: '2px 6px',
                          backgroundColor: JiraApiService.getStatusColor(issue.status),
                          color: '#fff',
                          borderRadius: '3px',
                          fontSize: '10px'
                        }}>
                          {issue.status}
                        </span>
                        <span style={{
                          padding: '2px 6px',
                          backgroundColor: JiraApiService.getPriorityColor(issue.priority),
                          color: '#fff',
                          borderRadius: '3px',
                          fontSize: '10px'
                        }}>
                          {issue.priority}
                        </span>
                      </div>
                    </div>
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      Open
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
