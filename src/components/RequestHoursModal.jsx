import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { JiraApiService } from '../services/jiraApiService.js';

/**
 * Request Hours Modal - Allows user to request more hours and update due date for a Jira issue
 */
export default function RequestHoursModal({ isOpen, issueKey, currentRemaining, currentDueDate, onClose, onSuccess }) {
  const theme = useTheme();
  const [additionalHours, setAdditionalHours] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      setError('');
      setIsSubmitting(true);

      const additionalSeconds = parseFloat(additionalHours) * 3600; // Convert hours to seconds
      if (isNaN(additionalSeconds) || additionalSeconds <= 0) {
        setError('Please enter a valid number of hours');
        setIsSubmitting(false);
        return;
      }

      const newRemaining = (currentRemaining || 0) + additionalSeconds;

      // Format date for Jira if provided
      let formattedDueDate = null;
      if (newDueDate) {
        const date = new Date(newDueDate);
        formattedDueDate = date.toISOString().split('T')[0];
      }

      await JiraApiService.updateIssue(issueKey, newRemaining, formattedDueDate);

      if (onSuccess) {
        onSuccess({
          additionalHours: parseFloat(additionalHours),
          newRemaining,
          newDueDate: newDueDate || null
        });
      }

      onClose();
    } catch (err) {
      console.error('Failed to request more hours:', err);
      setError(err.message || 'Failed to update issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setAdditionalHours('');
    setNewDueDate('');
    setError('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: theme.colors.overlay || 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          backgroundColor: theme.colors.cardBackground || theme.colors.surface,
          borderRadius: '16px',
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          boxShadow: theme.colors.cardShadow || '0 8px 32px rgba(0,0,0,0.3)',
          border: `1px solid ${theme.colors.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ 
          color: theme.colors.text, 
          marginTop: 0, 
          marginBottom: '20px',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          Request More Hours
        </h2>
        <p style={{ 
          color: theme.colors.textSecondary || theme.colors.text, 
          marginBottom: '20px',
          fontSize: '14px',
          opacity: 0.8
        }}>
          Issue: <strong>{issueKey}</strong>
        </p>

        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            color: theme.colors.text, 
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Additional Hours *
          </label>
          <input
            type="number"
            step="0.25"
            min="0"
            value={additionalHours}
            onChange={(e) => setAdditionalHours(e.target.value)}
            placeholder="Enter hours (e.g., 2.5)"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: theme.colors.inputBackground || theme.colors.surface,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.inputBorder || theme.colors.border}`,
              fontSize: '14px',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            color: theme.colors.text, 
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Update Due Date (Optional)
          </label>
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: theme.colors.inputBackground || theme.colors.surface,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.inputBorder || theme.colors.border}`,
              fontSize: '14px',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              backgroundColor: 'transparent',
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              fontSize: '14px',
              fontWeight: '500',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isSubmitting ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.target.style.backgroundColor = theme.colors.surface;
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !additionalHours}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              backgroundColor: theme.colors.primary || '#007bff',
              color: '#fff',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (isSubmitting || !additionalHours) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: (isSubmitting || !additionalHours) ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && additionalHours) {
                e.target.style.backgroundColor = theme.colors.primaryHover || '#0056b3';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme.colors.primary || '#007bff';
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Request Hours'}
          </button>
        </div>
      </div>
    </div>
  );
}

