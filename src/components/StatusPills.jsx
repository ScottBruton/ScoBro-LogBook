/**
 * Status Pills Component - Displays connection status for all services
 * Shows real-time status of Supabase, Email, Jira, Calendar, and Analytics
 */

import React, { useState, useEffect } from 'react';
import { ConnectionStatusService } from '../services/connectionStatusService';

const StatusPills = ({ onStatusClick }) => {
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatuses();
    
    // Refresh statuses every 30 seconds
    const interval = setInterval(loadStatuses, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadStatuses = async () => {
    try {
      console.log('🔄 StatusPills: Loading connection statuses...');
      setLoading(true);
      const currentStatuses = await ConnectionStatusService.checkAllStatuses();
      console.log('📊 StatusPills: Received statuses:', currentStatuses);
      setStatuses(currentStatuses);
    } catch (error) {
      console.error('❌ StatusPills: Failed to load statuses:', error);
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
          color: config.color,
          backgroundColor: config.bgColor,
          border: `1px solid ${config.color}20`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginRight: '6px',
          marginBottom: '4px'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = 'none';
        }}
        title={`${displayName}: ${config.tooltip}`}
      >
        <span style={{ fontSize: '10px' }}>{config.icon}</span>
        <span>{displayName}</span>
        {statusData.status === 'connected' && (
          <span style={{ fontSize: '8px', opacity: 0.7 }}>●</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        fontSize: '12px',
        color: '#666'
      }}>
        <span>🔄</span>
        <span>Checking connections...</span>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      alignItems: 'center',
      gap: '4px'
    }}>
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
          color: '#6c757d',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginLeft: '4px'
        }}
        title="Refresh connection statuses"
      >
        <span style={{ fontSize: '10px' }}>🔄</span>
        <span>Refresh</span>
      </button>
    </div>
  );
};

export default StatusPills;
