import React, { useState, useEffect } from 'react';
import { ConnectionStatusService } from '../services/connectionStatusService';
import { useTheme } from '../contexts/ThemeContext';

/**
 * AppHeader Component - Top header bar with burger menu and status pills
 * Contains the collapsible menu trigger and horizontal status indicators
 */
export default function AppHeader({ 
  onProjectsClick, 
  onTagsClick, 
  onMeetingsClick, 
  onSmartPromptsClick, 
  onTimeTrackingClick, 
  onCsvClick, 
  onMarkdownClick, 
  onSyncClick, 
  onSignOutClick, 
  onNewEntryClick,
  onStatusClick,
  isAuthenticated,
  refreshTrigger,
  syncStatus,
  user,
  onSignInClick
}) {
  const theme = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatuses();
    
    // Refresh statuses every 30 seconds
    const interval = setInterval(loadStatuses, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      loadStatuses();
    }
  }, [refreshTrigger]);

  const loadStatuses = async () => {
    try {
      console.log('🔄 AppHeader: Loading connection statuses...');
      setLoading(true);
      const currentStatuses = await ConnectionStatusService.checkAllStatuses();
      console.log('📊 AppHeader: Received statuses:', currentStatuses);
      setStatuses(currentStatuses);
    } catch (error) {
      console.error('❌ AppHeader: Failed to load statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = (service) => {
    if (onStatusClick) {
      onStatusClick(service);
    }
  };

  const getStatusPill = (service, statusData) => {
    const config = ConnectionStatusService.getStatusPillConfig(service, statusData.status);
    const displayName = ConnectionStatusService.getServiceDisplayName(service);
    
    // Get theme-appropriate colors
    let pillColor, pillBgColor;
    switch (statusData.status) {
      case 'connected':
      case 'active':
        pillColor = theme.colors.pillConnected;
        pillBgColor = theme.colors.pillConnectedBg;
        break;
      case 'error':
        pillColor = theme.colors.pillError;
        pillBgColor = theme.colors.pillErrorBg;
        break;
      case 'not-authenticated':
        pillColor = theme.colors.pillWarning;
        pillBgColor = theme.colors.pillWarningBg;
        break;
      default:
        pillColor = theme.colors.pillNotConfigured;
        pillBgColor = theme.colors.pillNotConfiguredBg;
    }
    
    return (
      <div
        key={service}
        onClick={() => handleStatusClick(service)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '500',
          color: pillColor,
          backgroundColor: pillBgColor,
          border: `1px solid ${pillColor}40`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginRight: '6px',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = theme.isDarkMode ? '0 2px 6px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = 'none';
        }}
        title={`${displayName}: ${config.tooltip}`}
      >
        <span style={{ fontSize: '9px' }}>{config.icon}</span>
        <span>{displayName}</span>
        {statusData.status === 'connected' && (
          <span style={{ fontSize: '7px', opacity: 0.7 }}>●</span>
        )}
      </div>
    );
  };

  const menuItems = [
    {
      id: 'projects',
      icon: '📂',
      label: 'Projects',
      color: '#17a2b8',
      onClick: onProjectsClick
    },
    {
      id: 'tags',
      icon: '🏷️',
      label: 'Tags',
      color: '#6f42c1',
      onClick: onTagsClick
    },
    {
      id: 'meetings',
      icon: '📅',
      label: 'Meetings',
      color: '#fd7e14',
      onClick: onMeetingsClick
    },
    {
      id: 'smart-prompts',
      icon: '🧠',
      label: 'Smart Prompts',
      color: '#6f42c1',
      onClick: onSmartPromptsClick
    },
    {
      id: 'time-tracking',
      icon: '⏱️',
      label: 'Time Tracking',
      color: '#fd7e14',
      onClick: onTimeTrackingClick
    },
    {
      id: 'csv',
      icon: '📊',
      label: 'CSV',
      color: '#28a745',
      onClick: onCsvClick
    },
    {
      id: 'markdown',
      icon: '📝',
      label: 'MD',
      color: '#6c757d',
      onClick: onMarkdownClick
    },
    {
      id: 'sync',
      icon: '🔄',
      label: 'Sync',
      color: '#17a2b8',
      onClick: onSyncClick
    },
    {
      id: 'sign-out',
      icon: '🚪',
      label: 'Sign Out',
      color: '#6c757d',
      onClick: onSignOutClick,
      show: isAuthenticated
    },
    {
      id: 'new-entry',
      icon: '➕',
      label: 'New Entry',
      color: '#0275d8',
      onClick: onNewEntryClick
    }
  ];

  return (
    <>
      {/* Header Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '50px',
        backgroundColor: theme.colors.headerBackground,
        borderBottom: `1px solid ${theme.colors.headerBorder}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        zIndex: 1000,
        boxShadow: theme.colors.cardShadow
      }}>
        {/* Burger Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: theme.colors.primary,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            marginRight: '16px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = theme.colors.primaryHover;
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = theme.colors.primary;
            e.target.style.transform = 'scale(1)';
          }}
          title={isMenuOpen ? 'Close Menu' : 'Open Menu'}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={theme.toggleTheme}
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: theme.colors.secondary,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            marginRight: '16px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = theme.colors.secondaryHover;
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = theme.colors.secondary;
            e.target.style.transform = 'scale(1)';
          }}
          title={theme.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme.isDarkMode ? '☀️' : '🌙'}
        </button>

        {/* Status Pills */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          flex: 1,
          overflowX: 'auto',
          paddingRight: '16px'
        }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '11px',
              color: theme.colors.textSecondary
            }}>
              <span>🔄</span>
              <span>Loading...</span>
            </div>
          ) : (
            <>
              <span style={{ 
                fontSize: '11px', 
                color: theme.colors.textSecondary, 
                marginRight: '8px',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}>
                Status:
              </span>
              {Object.entries(statuses).map(([service, statusData]) => 
                getStatusPill(service, statusData)
              )}
              <button
                onClick={loadStatuses}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: theme.colors.textSecondary,
                  backgroundColor: theme.colors.surface,
                  border: `1px solid ${theme.colors.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginLeft: '8px',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = theme.colors.menuItemHover;
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = theme.colors.surface;
                  e.target.style.transform = 'scale(1)';
                }}
                title="Refresh connection statuses"
              >
                <span style={{ fontSize: '9px' }}>🔄</span>
                <span>Refresh</span>
              </button>
            </>
          )}
        </div>

        {/* App Title and Status - Right Side */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          marginLeft: '16px',
          minWidth: '200px'
        }}>
          {/* App Title */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '2px'
          }}>
            <span style={{ fontSize: '16px' }}>📒</span>
            <span style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: theme.colors.text
            }}>
              ScoBro Logbook
            </span>
          </div>
          
          {/* Status and User Info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: theme.colors.textSecondary
          }}>
            <span>
              {syncStatus === 'synced' ? '🟢 Synced' : syncStatus === 'pending' ? '🟡 Pending' : '🔴 Offline'}
            </span>
            {isAuthenticated && user && (
              <>
                <span>•</span>
                <span>👤 {user.email}</span>
              </>
            )}
            {!isAuthenticated && (
              <button
                onClick={onSignInClick}
                style={{
                  padding: '2px 6px',
                  backgroundColor: theme.colors.info,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  marginLeft: '4px'
                }}
              >
                🔐 Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isMenuOpen && (
        <div
          onClick={() => setIsMenuOpen(false)}
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

      {/* Menu Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: '50px', // Below the header
          left: isMenuOpen ? '0' : '-300px',
          width: '280px',
          height: 'calc(100vh - 50px)',
          backgroundColor: theme.colors.menuBackground,
          boxShadow: theme.colors.cardShadow,
          zIndex: 999,
          transition: 'left 0.3s ease',
          padding: '20px 0',
          overflowY: 'auto'
        }}
      >
        <div style={{ padding: '0 20px' }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '16px', 
            color: theme.colors.text,
            textAlign: 'center',
            borderBottom: `1px solid ${theme.colors.borderLight}`,
            paddingBottom: '10px'
          }}>
            📒 ScoBro Menu
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {menuItems.map((item) => {
              if (item.show === false) return null;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.onClick();
                    setIsMenuOpen(false); // Close menu after clicking
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: item.color,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateX(4px)';
                    e.target.style.boxShadow = theme.isDarkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateX(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
