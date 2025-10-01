import React, { useState, useEffect } from 'react';
import { TimeTrackingService } from '../services/timeTrackingService.js';

/**
 * TimeTrackingModal - Time tracking interface with start/stop timers
 * Provides a comprehensive time tracking experience
 */
export default function TimeTrackingModal({ isOpen, onClose, onTimerComplete }) {
  const [activeTimer, setActiveTimer] = useState(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [newTimer, setNewTimer] = useState({
    taskName: '',
    project: '',
    description: ''
  });
  const [recentTimers, setRecentTimers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTimeTrackingData();
    }
  }, [isOpen]);

  useEffect(() => {
    let durationInterval;
    if (activeTimer) {
      durationInterval = setInterval(() => {
        const duration = TimeTrackingService.getCurrentTimerDuration();
        setCurrentDuration(duration);
      }, 1000);
    }
    return () => {
      if (durationInterval) clearInterval(durationInterval);
    };
  }, [activeTimer]);

  const loadTimeTrackingData = () => {
    setIsLoading(true);
    try {
      const active = TimeTrackingService.getActiveTimer();
      setActiveTimer(active);
      
      if (active) {
        setCurrentDuration(TimeTrackingService.getCurrentTimerDuration());
      }

      const timeStats = TimeTrackingService.getTimeTrackingStats();
      setStats(timeStats);

      const productivityInsights = TimeTrackingService.getProductivityInsights();
      setInsights(productivityInsights);

      const data = TimeTrackingService.getTimeTrackingData();
      setRecentTimers(data.timers.slice(-10).reverse());
    } catch (error) {
      console.error('Failed to load time tracking data:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleStartTimer = () => {
    if (!newTimer.taskName.trim()) {
      alert('Please enter a task name');
      return;
    }

    try {
      const timer = TimeTrackingService.startTimer(
        newTimer.taskName,
        newTimer.project || null,
        newTimer.description || null
      );
      
      setActiveTimer(timer);
      setCurrentDuration(0);
      setNewTimer({ taskName: '', project: '', description: '' });
      loadTimeTrackingData();
    } catch (error) {
      console.error('Failed to start timer:', error);
      alert('Failed to start timer');
    }
  };

  const handleStopTimer = () => {
    try {
      const completedTimer = TimeTrackingService.stopTimer();
      setActiveTimer(null);
      setCurrentDuration(0);
      loadTimeTrackingData();
      
      if (onTimerComplete) {
        onTimerComplete(completedTimer);
      }
    } catch (error) {
      console.error('Failed to stop timer:', error);
      alert('Failed to stop timer');
    }
  };

  const handleDeleteTimer = (timerId) => {
    if (confirm('Are you sure you want to delete this timer?')) {
      try {
        TimeTrackingService.deleteTimer(timerId);
        loadTimeTrackingData();
      } catch (error) {
        console.error('Failed to delete timer:', error);
        alert('Failed to delete timer');
      }
    }
  };

  const handleExportData = (format) => {
    try {
      const data = TimeTrackingService.exportTimeTrackingData(format);
      const blob = new Blob([data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `time-tracking-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data');
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
          maxWidth: '800px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⏱️ Time Tracking
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

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
            <p>Loading time tracking data...</p>
          </div>
        ) : (
          <>
            {/* Active Timer */}
            {activeTimer ? (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px', color: '#dc3545' }}>🔴 Timer Running</h3>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#fff5f5',
                  border: '2px solid #dc3545',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc3545', marginBottom: '8px' }}>
                    {TimeTrackingService.formatDuration(currentDuration)}
                  </div>
                  <div style={{ fontSize: '18px', marginBottom: '8px' }}>
                    <strong>{activeTimer.taskName}</strong>
                  </div>
                  {activeTimer.project && (
                    <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>
                      📂 {activeTimer.project}
                    </div>
                  )}
                  {activeTimer.description && (
                    <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '16px' }}>
                      {activeTimer.description}
                    </div>
                  )}
                  <button
                    onClick={handleStopTimer}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    ⏹️ Stop Timer
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px' }}>▶️ Start New Timer</h3>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                        Task Name *
                      </label>
                      <input
                        type="text"
                        value={newTimer.taskName}
                        onChange={(e) => setNewTimer({ ...newTimer, taskName: e.target.value })}
                        placeholder="What are you working on?"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                        Project (optional)
                      </label>
                      <input
                        type="text"
                        value={newTimer.project}
                        onChange={(e) => setNewTimer({ ...newTimer, project: e.target.value })}
                        placeholder="Which project is this for?"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                        Description (optional)
                      </label>
                      <textarea
                        value={newTimer.description}
                        onChange={(e) => setNewTimer({ ...newTimer, description: e.target.value })}
                        placeholder="Any additional details?"
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                    <button
                      onClick={handleStartTimer}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#28a745',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                    >
                      ▶️ Start Timer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics */}
            {stats && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px' }}>📊 Statistics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Total Time</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      {TimeTrackingService.formatDuration(stats.totalTime)}
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Today</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      {TimeTrackingService.formatDuration(stats.todayTime)}
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>This Week</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      {TimeTrackingService.formatDuration(stats.thisWeekTime)}
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Sessions</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      {stats.totalSessions}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Insights */}
            {insights.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px' }}>💡 Insights</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        backgroundColor: '#fff',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{insight.icon}</span>
                      <span style={{ flex: 1, fontSize: '14px' }}>{insight.message}</span>
                      <span style={{ 
                        fontSize: '10px', 
                        color: '#6c757d',
                        textTransform: 'uppercase'
                      }}>
                        {insight.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Timers */}
            {recentTimers.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px' }}>📋 Recent Timers</h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {recentTimers.map((timer) => (
                    <div
                      key={timer.id}
                      style={{
                        padding: '12px',
                        backgroundColor: timer.status === 'active' ? '#fff5f5' : '#f8f9fa',
                        border: `1px solid ${timer.status === 'active' ? '#dc3545' : '#dee2e6'}`,
                        borderRadius: '6px',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                          {timer.taskName}
                          {timer.status === 'active' && <span style={{ color: '#dc3545', marginLeft: '8px' }}>🔴</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {timer.project && `📂 ${timer.project} • `}
                          {new Date(timer.startTime).toLocaleString()}
                          {timer.duration && ` • ${TimeTrackingService.formatDuration(timer.duration)}`}
                        </div>
                      </div>
                      {timer.status === 'completed' && (
                        <button
                          onClick={() => handleDeleteTimer(timer.id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleExportData('csv')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#17a2b8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📊 Export CSV
                </button>
                <button
                  onClick={() => handleExportData('json')}
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
                  📄 Export JSON
                </button>
              </div>
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
          </>
        )}
      </div>
    </div>
  );
}

