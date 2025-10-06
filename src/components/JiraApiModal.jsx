import React, { useState, useEffect } from 'react';
import { JiraApiService } from '../services/jiraApiService.js';

/**
 * JiraApiModal - Jira API configuration and management interface
 * Provides functionality to configure Jira API settings and manage issue synchronization
 */
export default function JiraApiModal({ isOpen, onClose, onIssuesSynced }) {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [jiraStats, setJiraStats] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [recentIssues, setRecentIssues] = useState([]);
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadJiraConfig();
      loadJiraData();
    }
  }, [isOpen]);

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
      setProjects(projectsData);
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

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const result = await JiraApiService.testConnection(config);
      setTestResult(result);
      
      if (result.success) {
        // Update config with successful connection
        const newConfig = { ...config, enabled: true };
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

  const handleProjectKeyChange = (value) => {
    const projectKeys = value.split(',').map(key => key.trim()).filter(key => key);
    setSelectedProjects(projectKeys);
    handleConfigChange('projectKeys', projectKeys);
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
        backgroundColor: 'rgba(0,0,0,0.3)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          overflowY: 'auto',
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
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        {/* Connection Status */}
        {syncStatus && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '8px' }}>Connection Status</h3>
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
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
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  {syncStatus.message}
                </div>
                {syncStatus.lastSync && (
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    Last sync: {new Date(syncStatus.lastSync).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Configuration */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Configuration</h3>
            {config?.enabled && (
              <button
                onClick={handleDisable}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#dc3545',
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
                  border: '1px solid #ccc',
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
                  border: '1px solid #ccc',
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
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                Generate at: <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer">Atlassian Account Settings</a>
              </div>
            </div>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Available Projects
              </label>
              {projects.length > 0 ? (
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '8px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                    {projects.map(project => (
                      <label
                        key={project.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          backgroundColor: selectedProjects.includes(project.key) ? '#e3f2fd' : 'white',
                          border: `1px solid ${selectedProjects.includes(project.key) ? '#2196f3' : '#ddd'}`,
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
                          <div style={{ fontWeight: 'bold', color: '#2196f3' }}>
                            {project.key}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {project.name}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: '#666',
                  border: '1px dashed #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#f8f9fa'
                }}>
                  {config?.enabled ? 'No projects found. Click "Test Connection" to load projects.' : 'Connect to Jira to see available projects.'}
                </div>
              )}
              {selectedProjects.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  Selected: {selectedProjects.join(', ')}
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
                  border: '1px solid #ccc',
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
        </div>

        {/* Actions */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px' }}>Actions</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSaveConfig}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
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
                backgroundColor: '#17a2b8',
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
                  backgroundColor: '#6f42c1',
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
                onClick={handleSyncIssues}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
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
        </div>

        {/* Test Result */}
        {testResult && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              padding: '12px',
              backgroundColor: testResult.success ? '#d4edda' : '#f8d7da',
              border: `1px solid ${testResult.success ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '6px',
              color: testResult.success ? '#155724' : '#721c24'
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
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px' }}>📊 Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Assigned Issues</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{jiraStats.assignedCount}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Recent Issues</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{jiraStats.recentCount}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Selected Projects</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedProjects.length}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Available Projects</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{projects.length}</div>
              </div>
            </div>
          </div>
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
