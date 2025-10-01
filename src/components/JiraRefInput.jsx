import React, { useState } from 'react';
import { 
  BugReport as BugIcon,
  Task as TaskIcon,
  Article as StoryIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

/**
 * JiraRefInput component for entering and validating Jira references.
 * Provides visual feedback and validation for Jira issue keys.
 */
export default function JiraRefInput({ value, onChange, placeholder = "Enter Jira references (e.g., PROJ-123, TASK-456)" }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [validationResults, setValidationResults] = useState({});

  // Parse Jira references from input
  const parseJiraRefs = (text) => {
    const jiraPattern = /([A-Z][A-Z0-9]*-\d+)/g;
    return text.match(jiraPattern) || [];
  };

  // Validate Jira reference format
  const validateJiraRef = (ref) => {
    const pattern = /^[A-Z][A-Z0-9]*-\d+$/;
    return pattern.test(ref);
  };

  // Get Jira issue type icon based on common patterns
  const getJiraIcon = (ref) => {
    const project = ref.split('-')[0];
    const lowerProject = project.toLowerCase();
    
    if (lowerProject.includes('bug') || lowerProject.includes('defect')) {
      return <BugIcon style={{ fontSize: '14px', color: '#dc3545' }} />;
    } else if (lowerProject.includes('task') || lowerProject.includes('work')) {
      return <TaskIcon style={{ fontSize: '14px', color: '#007bff' }} />;
    } else if (lowerProject.includes('story') || lowerProject.includes('feature')) {
      return <StoryIcon style={{ fontSize: '14px', color: '#28a745' }} />;
    }
    return <TaskIcon style={{ fontSize: '14px', color: '#6c757d' }} />;
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Parse and validate Jira references
    const jiraRefs = parseJiraRefs(newValue);
    const validation = {};
    
    jiraRefs.forEach(ref => {
      validation[ref] = validateJiraRef(ref);
    });
    
    setValidationResults(validation);
    
    // Call parent onChange with parsed references
    if (onChange) {
      onChange(jiraRefs);
    }
  };

  const jiraRefs = parseJiraRefs(inputValue);

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'monospace'
          }}
        />
        {jiraRefs.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            padding: '4px 8px',
            fontSize: '12px',
            zIndex: 10
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              Jira References ({jiraRefs.length}):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {jiraRefs.map((ref, index) => (
                <div
                  key={index}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    padding: '2px 6px',
                    backgroundColor: validationResults[ref] ? '#d4edda' : '#f8d7da',
                    border: `1px solid ${validationResults[ref] ? '#c3e6cb' : '#f5c6cb'}`,
                    borderRadius: '3px',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}
                >
                  {validationResults[ref] ? (
                    <CheckIcon style={{ fontSize: '10px', color: '#28a745' }} />
                  ) : (
                    <ErrorIcon style={{ fontSize: '10px', color: '#dc3545' }} />
                  )}
                  {getJiraIcon(ref)}
                  {ref}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {jiraRefs.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d' }}>
          💡 Tip: Use format like PROJ-123, TASK-456. Separate multiple references with spaces or commas.
        </div>
      )}
    </div>
  );
}
