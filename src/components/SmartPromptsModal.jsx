import React, { useState, useEffect } from 'react';
import { SmartPromptsService } from '../services/smartPromptsService.js';

/**
 * SmartPromptsModal - Displays intelligent prompts and suggestions
 * Provides time-based nudges and contextual suggestions to users
 */
export default function SmartPromptsModal({ isOpen, onClose, onPromptSelect, entries = [] }) {
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [patterns, setPatterns] = useState(null);
  const [config, setConfig] = useState(SmartPromptsService.getNudgeConfig());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSmartPrompt();
    }
  }, [isOpen, entries]);

  const loadSmartPrompt = async () => {
    setIsLoading(true);
    try {
      // Analyze user patterns
      const userPatterns = await SmartPromptsService.analyzeUserPatterns(entries);
      setPatterns(userPatterns);

      // Get current context
      const context = {
        activeProject: getActiveProject(),
        upcomingMeeting: getUpcomingMeeting(),
        recentActivity: getRecentActivity()
      };

      // Generate smart prompt
      const prompt = await SmartPromptsService.getSmartPrompt(context);
      setCurrentPrompt(prompt);

      // Generate contextual suggestions
      const contextualSuggestions = await SmartPromptsService.generateContextualSuggestions(
        userPatterns, 
        context
      );
      setSuggestions(contextualSuggestions);
    } catch (error) {
      console.error('Failed to load smart prompt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActiveProject = () => {
    // Get the most recently used project
    const recentEntries = entries.slice(0, 5);
    const projects = [];
    
    recentEntries.forEach(entry => {
      entry.items.forEach(item => {
        if (item.project) {
          projects.push(item.project);
        }
      });
    });

    return projects.length > 0 ? projects[0] : null;
  };

  const getUpcomingMeeting = () => {
    // Check if there's a meeting in the next 30 minutes
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    
    // This would integrate with calendar sync in the future
    // For now, return null
    return null;
  };

  const getRecentActivity = () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    return entries.filter(entry => 
      new Date(entry.timestamp) >= oneHourAgo
    ).length;
  };

  const handlePromptSelect = (prompt) => {
    if (onPromptSelect) {
      onPromptSelect(prompt);
    }
    onClose();
  };

  const handleConfigChange = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    SmartPromptsService.saveNudgeConfig(newConfig);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
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
          maxWidth: '600px',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🧠 Smart Prompts
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
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>🤔</div>
            <p>Analyzing your patterns and generating smart prompts...</p>
          </div>
        ) : (
          <>
            {/* Current Smart Prompt */}
            {currentPrompt && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💡 Today's Prompt
                  <span style={{ 
                    fontSize: '12px', 
                    color: getPriorityColor(currentPrompt.priority),
                    backgroundColor: getPriorityColor(currentPrompt.priority) + '20',
                    padding: '2px 6px',
                    borderRadius: '12px'
                  }}>
                    {getPriorityIcon(currentPrompt.priority)} {currentPrompt.priority}
                  </span>
                </h3>
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '16px',
                    lineHeight: '1.5'
                  }}
                  onClick={() => handlePromptSelect(currentPrompt.prompt)}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e9ecef';
                    e.target.style.borderColor = '#007bff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f8f9fa';
                    e.target.style.borderColor = '#dee2e6';
                  }}
                >
                  {currentPrompt.prompt}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6c757d', 
                  marginTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Context: {currentPrompt.context}</span>
                  <button
                    onClick={() => handlePromptSelect(currentPrompt.prompt)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#007bff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Use This Prompt
                  </button>
                </div>
              </div>
            )}

            {/* Contextual Suggestions */}
            {suggestions.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px' }}>🎯 Suggestions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {suggestions.map((suggestion, index) => (
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
                      <span style={{ fontSize: '14px' }}>
                        {getPriorityIcon(suggestion.priority)}
                      </span>
                      <span style={{ flex: 1, fontSize: '14px' }}>
                        {suggestion.message}
                      </span>
                      <span style={{ 
                        fontSize: '10px', 
                        color: '#6c757d',
                        textTransform: 'uppercase'
                      }}>
                        {suggestion.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Patterns */}
            {patterns && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px' }}>📊 Your Patterns</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Most Active Hours</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {patterns.mostActiveHours.map(hour => `${hour}:00`).join(', ')}
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Top Projects</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {patterns.favoriteProjects.slice(0, 2).join(', ')}
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Daily Entries</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {patterns.entryFrequency.daily.toFixed(1)} per day
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Avg Entry Length</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {Math.round(patterns.averageEntryLength)} chars
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Configuration */}
            <div>
              <h3 style={{ marginBottom: '12px' }}>⚙️ Nudge Settings</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                  />
                  Enable Smart Prompts
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={config.morningNudges}
                    onChange={(e) => handleConfigChange('morningNudges', e.target.checked)}
                    disabled={!config.enabled}
                  />
                  Morning Nudges
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={config.afternoonNudges}
                    onChange={(e) => handleConfigChange('afternoonNudges', e.target.checked)}
                    disabled={!config.enabled}
                  />
                  Afternoon Nudges
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={config.eveningNudges}
                    onChange={(e) => handleConfigChange('eveningNudges', e.target.checked)}
                    disabled={!config.enabled}
                  />
                  Evening Nudges
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={config.weeklyNudges}
                    onChange={(e) => handleConfigChange('weeklyNudges', e.target.checked)}
                    disabled={!config.enabled}
                  />
                  Weekly Nudges
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={config.meetingNudges}
                    onChange={(e) => handleConfigChange('meetingNudges', e.target.checked)}
                    disabled={!config.enabled}
                  />
                  Meeting Nudges
                </label>
              </div>
              
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Nudge Frequency:
                </label>
                <select
                  value={config.frequency}
                  onChange={(e) => handleConfigChange('frequency', e.target.value)}
                  disabled={!config.enabled}
                  style={{
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="low">Low (Less frequent)</option>
                  <option value="normal">Normal</option>
                  <option value="high">High (More frequent)</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={loadSmartPrompt}
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
                🔄 Refresh
              </button>
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

