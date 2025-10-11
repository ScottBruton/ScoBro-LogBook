import React, { useState, useEffect } from 'react';
import { ClarizenApiService } from '../services/clarizenApiService.js';

/**
 * ClarizenApiModal - Clarizen API configuration and resourcing management interface
 * Provides functionality to configure Clarizen API settings and view resourcing data
 */
export default function ClarizenApiModal({ isOpen, onClose, onResourcingSynced }) {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [workItemData, setWorkItemData] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClarizenConfig();
    }
  }, [isOpen]);

  const loadClarizenConfig = () => {
    try {
      const clarizenConfig = ClarizenApiService.getClarizenConfig();
      setConfig(clarizenConfig);
      setAccessToken(clarizenConfig.accessToken || null);
      setIsAuthenticated(!!clarizenConfig.accessToken);
    } catch (error) {
      console.error('Failed to load Clarizen config:', error);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const result = await ClarizenApiService.testConnection(config);
      setTestResult(result);
      
      if (result.success) {
        // Update config with successful connection
        const newConfig = { ...config, accessToken: result.accessToken };
        setConfig(newConfig);
        setAccessToken(result.accessToken);
        setIsAuthenticated(true);
        ClarizenApiService.saveClarizenConfig(newConfig);
        
        // Load work item data after successful connection
        await loadWorkItemData();
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



  const loadWorkItemData = async () => {
    try {
      setIsLoading(true);
      const data = await ClarizenApiService.getWorkItemData();
      setWorkItemData(data);
      console.log('📋 Work item data loaded:', data);
    } catch (error) {
      console.error('Failed to load work item data:', error);
      setTestResult({
        success: false,
        message: `Failed to load work item data: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = () => {
    try {
      ClarizenApiService.saveClarizenConfig(config);
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

  const handleConfigChange = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect from Clarizen?')) {
      ClarizenApiService.disconnect();
      setConfig(ClarizenApiService.getClarizenConfig());
      setAccessToken(null);
      setIsAuthenticated(false);
      setTestResult(null);
    }
  };

  const handleSyncResourcing = async () => {
    try {
      // Use work item data if available, otherwise fall back to resourcing data
      const dataToSync = workItemData;
      
      if (!dataToSync || (Array.isArray(dataToSync) && dataToSync.length === 0)) {
        setTestResult({
          success: false,
          message: 'No data to sync. Please load work item data first.'
        });
        return;
      }

      setIsLoading(true);
      
      // Call the parent component's sync handler
      if (onResourcingSynced) {
        await onResourcingSynced(dataToSync);
        const itemCount = workItemData ? 
          (workItemData.parentCount + workItemData.childCount) : 0;
        setTestResult({
          success: true,
          message: `Successfully synced ${itemCount} work items to logbook`
        });
      } else {
        setTestResult({
          success: false,
          message: 'Sync handler not available'
        });
      }
    } catch (error) {
      console.error('Failed to sync work item data:', error);
      setTestResult({
        success: false,
        message: `Failed to sync work item data: ${error.message}`
      });
    } finally {
      setIsLoading(false);
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
            📊 Clarizen Integration
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
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '8px' }}>Connection Status</h3>
          <div style={{
            padding: '12px',
            backgroundColor: isAuthenticated ? '#d4edda' : '#f8d7da',
            border: `2px solid ${isAuthenticated ? '#28a745' : '#dc3545'}`,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>{isAuthenticated ? '✅' : '❌'}</span>
            <div>
              <div style={{ fontWeight: 'bold', color: isAuthenticated ? '#28a745' : '#dc3545' }}>
                {isAuthenticated ? 'Connected' : 'Not Connected'}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                {isAuthenticated ? 'Clarizen API is connected and ready' : 'Clarizen API is not connected'}
              </div>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Configuration</h3>
            {isAuthenticated && (
              <button
                onClick={handleDisconnect}
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
                Disconnect
              </button>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Clarizen URL *
              </label>
              <input
                type="url"
                value={config?.baseUrl || ''}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                placeholder="https://yourcompany.clarizen.com"
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
                Username *
              </label>
              <input
                type="text"
                value={config?.username || ''}
                onChange={(e) => handleConfigChange('username', e.target.value)}
                placeholder="your.username"
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
                Password *
              </label>
              <input
                type="password"
                value={config?.password || ''}
                onChange={(e) => handleConfigChange('password', e.target.value)}
                placeholder="Your password"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          {/* Access Token Display */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Access Token Status
            </label>
            <div style={{
              padding: '12px',
              backgroundColor: isAuthenticated ? '#d4edda' : '#f8f9fa',
              border: `1px solid ${isAuthenticated ? '#28a745' : '#ccc'}`,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>{isAuthenticated ? '🔑' : '🔒'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: isAuthenticated ? '#28a745' : '#6c757d' }}>
                  {isAuthenticated ? 'Token Active' : 'No Token'}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  {isAuthenticated ? 'Access token is valid and saved' : 'Authentication required'}
                </div>
              </div>
              {isAuthenticated && (
                <div style={{ fontSize: '10px', color: '#28a745', fontWeight: 'bold' }}>
                  SAVED
                </div>
              )}
            </div>
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
              {isLoading ? '⏳' : '📊'} Load Resourcing
            </button>
            
            
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

        {/* Work Item Data */}
        {workItemData && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>📋 Work Items ({workItemData.parentCount + workItemData.childCount} total)</h3>
              <button
                onClick={() => handleSyncResourcing()}
                disabled={isLoading}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? '⏳' : '📝'} Sync to Logbook
              </button>
            </div>
            
            {/* Work Item Summary */}
            <div style={{
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa',
              padding: '12px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                <div>
                  <strong>📅 Timestamp:</strong> {new Date(workItemData.timestamp).toLocaleString()}
                </div>
                <div>
                  <strong>📋 Parent Items:</strong> {workItemData.parentCount}
                </div>
                <div>
                  <strong>👶 Child Items:</strong> {workItemData.childCount}
                </div>
                <div>
                  <strong>📊 Total Items:</strong> {workItemData.parentCount + workItemData.childCount}
                </div>
              </div>
            </div>

            {/* Hierarchy Display */}
            {workItemData.hierarchy && workItemData.hierarchy.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>🏗️ Work Item Hierarchy ({workItemData.hierarchy.length} parents)</h4>
                <div style={{
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {workItemData.hierarchy.map((item, index) => (
                    <div key={index} style={{
                      padding: '12px',
                      borderBottom: index < workItemData.hierarchy.length - 1 ? '1px solid #eee' : 'none',
                      fontSize: '12px'
                    }}>
                      {/* Parent Item */}
                      <div style={{ 
                        fontWeight: 'bold', 
                        marginBottom: '8px',
                        padding: '8px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '4px',
                        border: '1px solid #bbdefb'
                      }}>
                        <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                          📋 {item.parentName}
                        </div>
                        <div style={{ color: '#666', fontSize: '11px' }}>
                          <div>🕒 Hours: {item.workHours}</div>
                          <div>📅 Start: {item.startDate || 'Not set'}</div>
                          <div>📅 End: {item.endDate || 'Not set'}</div>
                        </div>
                      </div>
                      
                      {/* Child Items */}
                      {item.children && item.children.length > 0 && (
                        <div style={{ marginLeft: '16px' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                            👶 Children ({item.children.length}):
                          </div>
                          {item.children.map((child, childIndex) => (
                            <div key={childIndex} style={{
                              padding: '6px',
                              marginBottom: '4px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '3px',
                              border: '1px solid #dee2e6'
                            }}>
                              <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                                {child.name}
                              </div>
                              <div style={{ color: '#666', fontSize: '10px' }}>
                                <div>🕒 Hours: {child.workHours}</div>
                                <div>📅 Start: {child.startDate || 'Not set'}</div>
                                <div>📅 End: {child.endDate || 'Not set'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback for old data format */}
            {workItemData.parents && workItemData.children && !workItemData.hierarchy && (
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>📋 Legacy Format - Parent Work Items ({workItemData.parents.length})</h4>
                <div style={{
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginBottom: '16px'
                }}>
                  {workItemData.parents.map((item, index) => (
                    <div key={index} style={{
                      padding: '8px',
                      borderBottom: index < workItemData.parents.length - 1 ? '1px solid #eee' : 'none',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {item.name} ({item.entityType})
                      </div>
                      <div style={{ color: '#666' }}>
                        <div>🕒 Hours: {item.workHours}</div>
                        <div>📅 Start: {item.startDate || 'Not set'}</div>
                        <div>📅 End: {item.endDate || 'Not set'}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>👶 Legacy Format - Child Work Items ({workItemData.children.length})</h4>
                <div style={{
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {workItemData.children.map((item, index) => (
                    <div key={index} style={{
                      padding: '8px',
                      borderBottom: index < workItemData.children.length - 1 ? '1px solid #eee' : 'none',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {item.name}
                      </div>
                      <div style={{ color: '#666' }}>
                        <div>👨‍💼 Parent: {item.parentName || 'Unknown'}</div>
                        <div>🕒 Hours: {item.workHours}</div>
                        <div>📅 Start: {item.startDate || 'Not set'}</div>
                        <div>📅 End: {item.endDate || 'Not set'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
