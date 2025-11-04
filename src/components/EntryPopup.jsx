import React, { useState, useEffect, useRef } from 'react';
import { DataService } from '../services/dataService.js';
import { JiraApiService } from '../services/jiraApiService.js';
import { JiraDashboardService } from '../services/jiraDashboardService.js';
import { useTheme } from '../contexts/ThemeContext';

// Types available for new items. Additional types (e.g. Meeting) can
// be added later without altering the underlying schema. Each type
// influences the pill colour and filtering options in the dashboard.
const ITEM_TYPES = ['Action', 'Decision', 'Note', 'Meeting'];

/**
 * EntryPopup renders a modal-like overlay that allows the user to add
 * multiple items at once. Each item has independent metadata (type,
 * project, tags, Jira tag, people) and shared timestamp when
 * saved. When the user clicks Save, the session is passed to the
 * `onSave` handler and the component resets its state.
 *
 * Props:
 * - isOpen: whether the popup is currently visible
 * - onSave: function called with an array of item definitions when
 *   the user clicks Save. Each item definition has shape
 *   { type, content, project, tags: [], jira: '', people: [] }
 * - onClose: function called when the popup is dismissed without
 *   saving
 */
export default function EntryPopup({ isOpen, onSave, onClose, entryToEdit = null }) {
  const theme = useTheme();
  const [items, setItems] = useState([]);
  const [jiraProjects, setJiraProjects] = useState([]);
  const [projectIssues, setProjectIssues] = useState({}); // { projectKey: [issues] }
  const [projectTags, setProjectTags] = useState({}); // { projectKey: Set of tags/issue prefixes }
  const [jiraUsers, setJiraUsers] = useState([]);
  const [peopleSearchTerm, setPeopleSearchTerm] = useState({}); // { itemIndex: searchTerm }
  const [peopleSuggestions, setPeopleSuggestions] = useState({}); // { itemIndex: [users] }
  const [projectSearchTerm, setProjectSearchTerm] = useState({}); // { itemIndex: searchTerm }
  const [projectSuggestions, setProjectSuggestions] = useState({}); // { itemIndex: [projects] }
  const [tagSuggestions, setTagSuggestions] = useState({}); // { itemIndex: [issues] }
  const peopleInputRefs = useRef({});

  // Load Jira projects when popup opens
  useEffect(() => {
    if (isOpen) {
      loadJiraProjects();
      loadJiraUsers();
      loadProjectTags();
      
      // If editing, load existing items
      if (entryToEdit && entryToEdit.items) {
        const formattedItems = entryToEdit.items.map(item => ({
          type: item.type || item.item_type || 'Action',
          content: item.content || '',
          project: item.project || '',
          projectKey: item.projectKey || '',
          tags: Array.isArray(item.tags) ? item.tags : (item.tags ? [item.tags] : []),
          people: Array.isArray(item.people) ? item.people.join(', ') : (item.people || ''),
          jira: Array.isArray(item.jira) ? item.jira.join(', ') : (item.jira || ''),
          hours: item.hours || '',
          id: item.id // Keep item ID for updates
        }));
        setItems(formattedItems);
      } else {
        setItems([]);
      }
    }
  }, [isOpen, entryToEdit]);

  const loadProjectTags = async () => {
    try {
      const tags = await getAllProjectTags();
      setProjectTags(tags);
    } catch (error) {
      console.error('Failed to load project tags:', error);
    }
  };

  const loadJiraProjects = async () => {
    try {
      const config = JiraApiService.getJiraConfig();
      let projects = [];
      
      if (config?.enabled) {
        projects = await JiraApiService.getProjects();
      } else {
        // Fallback to DataService projects if Jira not configured
        const data = await DataService.getAllProjects();
        projects = data.map(p => ({ key: p.name, name: p.name }));
      }
      
      // Sort projects alphabetically by name
      projects.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setJiraProjects(projects || []);
    } catch (error) {
      console.error('Failed to load Jira projects:', error);
      // Fallback to DataService projects
      try {
        const data = await DataService.getAllProjects();
        const projects = data.map(p => ({ key: p.name, name: p.name }));
        // Sort alphabetically
        projects.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setJiraProjects(projects);
      } catch (fallbackError) {
        console.error('Failed to load fallback projects:', fallbackError);
      }
    }
  };

  const loadJiraUsers = async () => {
    try {
      const config = JiraApiService.getJiraConfig();
      if (!config?.enabled) return;

      // Use the Jira API to get all users directly
      try {
        const allUsers = await JiraApiService.getAllUsers();
        if (allUsers && allUsers.length > 0) {
          console.log(`👥 Loaded ${allUsers.length} users from Jira API`);
          setJiraUsers(allUsers);
          return;
        }
      } catch (e) {
        console.error('Could not load users from Jira API:', e);
      }

      // Fallback: Get users from issues if API fails
      const users = new Set();
      
      try {
        // Search for all issues to get all users
        const allIssues = await JiraDashboardService.loadIssuesFromDatabase();
        allIssues.forEach(issue => {
          if (issue.assignee) users.add(issue.assignee);
          if (issue.reporter) users.add(issue.reporter);
        });
      } catch (e) {
        console.log('Could not load users from database:', e);
      }

      // Also try assigned issues as fallback
      try {
        const assignedIssues = await JiraApiService.getAssignedIssues();
        assignedIssues.forEach(issue => {
          if (issue.assignee) users.add(issue.assignee);
          if (issue.reporter) users.add(issue.reporter);
        });
      } catch (e) {
        console.log('Could not load users from assigned issues:', e);
      }

      console.log(`👥 Loaded ${users.size} unique users from issues (fallback)`);
      setJiraUsers(Array.from(users).sort());
    } catch (error) {
      console.error('Failed to load Jira users:', error);
    }
  };

  // Helper to get initials from a name
  const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Load issues when project is selected
  const loadProjectIssues = async (projectKey) => {
    if (!projectKey || projectIssues[projectKey]) return;

    try {
      const issues = await JiraDashboardService.loadIssuesFromDatabase([projectKey]);
      setProjectIssues(prev => ({
        ...prev,
        [projectKey]: issues || []
      }));
    } catch (error) {
      console.error(`Failed to load issues for project ${projectKey}:`, error);
      setProjectIssues(prev => ({
        ...prev,
        [projectKey]: []
      }));
    }
  };

  // Get all unique issue keys/tags from all projects for project search
  const getAllProjectTags = async () => {
    try {
      const allIssues = await JiraDashboardService.loadIssuesFromDatabase();
      // Create a map of project key -> issue keys
      const projectTags = {};
      allIssues.forEach(issue => {
        if (issue.project_key && issue.issue_key) {
          if (!projectTags[issue.project_key]) {
            projectTags[issue.project_key] = new Set();
          }
          // Extract the project prefix (e.g., "CMC" from "CMC-123")
          const prefix = issue.issue_key.split('-')[0];
          if (prefix) {
            projectTags[issue.project_key].add(prefix);
          }
        }
      });
      return projectTags;
    } catch (error) {
      console.error('Failed to load project tags:', error);
      return {};
    }
  };


  // Adds a new blank item to the list.
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        type: 'Action',
        content: '',
        project: '',
        projectKey: '',
        tags: [],
        people: '',
        jira: '',
        hours: '',
      },
    ]);
  };

  // Handle project input with autocomplete - also search by tags/issues
  const handleProjectInputChange = (index, value) => {
    // Update the item immediately
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], project: value };
      return updated;
    });
    
    if (value.trim().length > 0) {
      const searchTerm = value.toLowerCase().trim();
      const filtered = jiraProjects.filter(project => {
        const projectKey = (project.key || '').toLowerCase();
        const projectName = (project.name || '').toLowerCase();
        
        // Match by project name starting with search term
        const nameMatch = projectName.startsWith(searchTerm);
        
        // Match by project key starting with search term
        const keyMatch = projectKey.startsWith(searchTerm);
        
        // Match by tags/issues - if project has tags that match search term
        const tags = projectTags[project.key] || new Set();
        const tagMatch = Array.from(tags).some(tag => 
          tag.toLowerCase().startsWith(searchTerm) || tag.toLowerCase().includes(searchTerm)
        );
        
        return nameMatch || keyMatch || tagMatch;
      }).slice(0, 20); // Limit to 20 suggestions
      setProjectSuggestions(prev => ({ ...prev, [index]: filtered }));
    } else {
      // Show all projects when empty
      setProjectSuggestions(prev => ({ ...prev, [index]: jiraProjects.slice(0, 20) }));
    }
  };

  const selectProjectSuggestion = (index, projectName, projectKey = null) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index].project = projectName;
      
      if (projectKey) {
        updated[index].projectKey = projectKey;
        loadProjectIssues(projectKey);
      } else {
        // Find project by name if key not provided
        const selectedProject = jiraProjects.find(p => p.name === projectName);
        if (selectedProject) {
          updated[index].projectKey = selectedProject.key;
          loadProjectIssues(selectedProject.key);
        } else {
          updated[index].projectKey = '';
        }
      }
      
      return updated;
    });
    
    // Clear suggestions
    setProjectSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[index];
      return newSuggestions;
    });
  };

  // Handle tag input with autocomplete - search across all issues
  const handleTagInputChange = (index, value) => {
    // Don't update tags array directly - just use for search
    // Tags will be updated when user selects from suggestions
    
    // Search across all issues from all projects
    if (value.trim().length > 0) {
      const searchTerm = value.toLowerCase();
      const allIssues = [];
      
      // Get all issues from all projects
      Object.values(projectIssues).forEach(issues => {
        allIssues.push(...issues);
      });
      
      // Also search in projects by key/name
      const matchingProjects = jiraProjects.filter(project => {
        const projectKey = (project.key || '').toLowerCase();
        const projectName = (project.name || '').toLowerCase();
        return projectKey.includes(searchTerm) || projectName.includes(searchTerm) || projectKey.startsWith(searchTerm) || projectName.startsWith(searchTerm);
      });
      
      const matchingProjectKeys = new Set(matchingProjects.map(p => p.key));
      
      const filtered = allIssues.filter(issue => {
        const issueKey = (issue.issue_key || '').toLowerCase();
        const summary = (issue.summary || '').toLowerCase();
        const projectKey = (issue.project_key || '').toLowerCase();
        
        return issueKey.startsWith(searchTerm) ||
               summary.includes(searchTerm) ||
               matchingProjectKeys.has(issue.project_key);
      }).slice(0, 20); // Limit to 20 suggestions
      
      setTagSuggestions(prev => ({ ...prev, [index]: filtered }));
    } else {
      // Show issues from selected project if available, otherwise all
      if (items[index].projectKey && projectIssues[items[index].projectKey]) {
        setTagSuggestions(prev => ({ ...prev, [index]: projectIssues[items[index].projectKey].slice(0, 20) }));
      } else {
        const allIssues = [];
        Object.values(projectIssues).forEach(issues => {
          allIssues.push(...issues);
        });
        setTagSuggestions(prev => ({ ...prev, [index]: allIssues.slice(0, 20) }));
      }
    }
  };

  const selectTagSuggestion = (index, issueKey) => {
    if (!issueKey) {
      // Clear tags
      updateItem(index, 'tags', []);
    } else {
      // Add tag to array
      setItems((prev) => {
        const updated = [...prev];
        const currentTags = updated[index].tags || [];
        const tagsArray = Array.isArray(currentTags) ? currentTags : (currentTags ? [currentTags] : []);
        
        // Add tag if not already present
        if (!tagsArray.includes(issueKey)) {
          updated[index].tags = [...tagsArray, issueKey];
        } else {
          updated[index].tags = tagsArray;
        }
        return updated;
      });
    }
    
    // Clear suggestions
    setTagSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[index];
      return newSuggestions;
    });
  };

  // Updates a specific field on an item at a given index.
  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // When project changes, load issues for that project
      if (field === 'project') {
        const selectedProject = jiraProjects.find(p => p.name === value || p.key === value);
        if (selectedProject) {
          updated[index].projectKey = selectedProject.key;
          loadProjectIssues(selectedProject.key);
        } else {
          updated[index].projectKey = '';
        }
      }
      
      return updated;
    });
  };

  // Handle people input with autocomplete
  const handlePeopleInputChange = (index, value) => {
    // Update the item immediately
    updateItem(index, 'people', value);
    
    // Extract the last part after comma for searching
    const parts = value.split(',');
    const searchTerm = parts[parts.length - 1].trim();
    
    if (searchTerm.length > 0) {
      const filtered = jiraUsers.filter(user => 
        user.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !value.toLowerCase().includes(user.toLowerCase()) // Don't suggest already added users
      ).slice(0, 10); // Limit to 10 suggestions
      setPeopleSuggestions(prev => ({ ...prev, [index]: filtered }));
    } else {
      setPeopleSuggestions(prev => {
        const newSuggestions = { ...prev };
        delete newSuggestions[index];
        return newSuggestions;
      });
    }
  };

  const selectPeopleSuggestion = (index, user) => {
    const currentPeople = items[index].people || '';
    const parts = currentPeople.split(',');
    const lastPart = parts[parts.length - 1].trim();
    
    // Replace the last part with the selected user
    parts[parts.length - 1] = user;
    
    // Remove duplicates
    const uniquePeople = [...new Set(parts.map(p => p.trim()).filter(p => p))];
    
    const newValue = uniquePeople.join(', ');
    updateItem(index, 'people', newValue);
    
    // Clear suggestions
    setPeopleSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[index];
      return newSuggestions;
    });
  };

  // Removes an item from the list.
  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Resets state and calls onSave.
  const handleSave = () => {
    // Filter out empty content items
      const prepared = items
        .filter((item) => item.content && item.content.trim() !== '')
        .map((item) => ({
          ...item,
          id: item.id, // Keep item ID if editing
          tags: item.tags ? (Array.isArray(item.tags) ? item.tags : [item.tags]).filter((t) => t && t.trim().length > 0) : [],
          people: item.people && typeof item.people === 'string'
            ? item.people
                .split(',')
                .map((p) => p.trim())
                .filter((p) => p.length > 0)
            : Array.isArray(item.people)
            ? item.people.filter((p) => p && p.trim().length > 0)
            : [],
          jira: item.jira && typeof item.jira === 'string'
            ? item.jira
                .split(',')
                .map((j) => j.trim())
                .filter((j) => j.length > 0)
            : Array.isArray(item.jira)
            ? item.jira.filter((j) => j && j.trim().length > 0)
            : [],
          hours: item.hours ? parseFloat(item.hours) || 0 : 0,
        }));
    if (prepared.length > 0) {
      onSave(prepared);
    }
    // reset
    setItems([]);
    onClose();
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
        backgroundColor: theme.colors.overlay || 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.cardBackground || theme.colors.menuBackground,
          color: theme.colors.text,
          padding: '20px',
          borderRadius: '8px',
          maxHeight: '80vh',
          overflowY: 'auto',
          width: '90%',
          maxWidth: '600px',
          border: `1px solid ${theme.colors.border}`,
          boxShadow: theme.colors.cardShadow || '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ 
          marginBottom: '16px',
          color: theme.colors.text,
          fontSize: '20px',
          fontWeight: 'bold'
        }}>
          New Entry
        </h2>
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '12px',
              backgroundColor: theme.colors.surface || theme.colors.cardBackground,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ color: theme.colors.text, fontSize: '16px' }}>{item.type}</strong>
              <button
                onClick={() => removeItem(index)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.colors.danger || '#dc3545',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.surface}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                🗑️ Remove
              </button>
            </div>
            <div style={{ marginTop: '8px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px',
                color: theme.colors.text,
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Content:
              </label>
              <textarea
                value={item.content}
                onChange={(e) => updateItem(index, 'content', e.target.value)}
                rows={3}
                style={{ 
                  width: '100%', 
                  padding: '8px',
                  backgroundColor: theme.colors.inputBackground || theme.colors.surface,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.inputBorder || theme.colors.border}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={{ color: theme.colors.text, fontSize: '14px' }}>Type:</label>
              <select
                value={item.type}
                onChange={(e) => updateItem(index, 'type', e.target.value)}
                style={{ 
                  marginLeft: '8px',
                  padding: '6px 8px',
                  backgroundColor: theme.colors.inputBackground || theme.colors.surface,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.inputBorder || theme.colors.border}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t} style={{ backgroundColor: theme.colors.inputBackground }}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={{ color: theme.colors.text, fontSize: '14px' }}>Project:</label>
              <div style={{ marginLeft: '8px', width: '70%', position: 'relative' }}>
                <input
                  type="text"
                  value={item.project}
                  onChange={(e) => handleProjectInputChange(index, e.target.value)}
                  onFocus={() => {
                    // Show all projects when focused
                    setProjectSuggestions(prev => ({ ...prev, [index]: jiraProjects.slice(0, 20) }));
                  }}
                  onBlur={() => {
                    // Small delay to allow click on suggestion before closing
                    setTimeout(() => {
                      setProjectSuggestions(prev => {
                        const newSuggestions = { ...prev };
                        delete newSuggestions[index];
                        return newSuggestions;
                      });
                    }, 200);
                  }}
                  placeholder="Search or select project..."
                  style={{ 
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: theme.colors.inputBackground || theme.colors.surface,
                    color: theme.colors.text,
                    border: `1px solid ${theme.colors.inputBorder || theme.colors.border}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
                {projectSuggestions[index] && projectSuggestions[index].length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: theme.colors.cardBackground || theme.colors.menuBackground,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: theme.colors.cardShadow || '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        selectProjectSuggestion(index, '');
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        color: theme.colors.text,
                        fontSize: '14px',
                        borderBottom: `1px solid ${theme.colors.border}`,
                        transition: 'background-color 0.2s',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.surface}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      No Project
                    </div>
                    {projectSuggestions[index].map((project, idx) => (
                      <div
                        key={project.key || project.id}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent blur
                          selectProjectSuggestion(index, project.name, project.key);
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          color: theme.colors.text,
                          fontSize: '14px',
                          borderBottom: idx < projectSuggestions[index].length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.surface}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          backgroundColor: theme.colors.primary || '#007bff',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          minWidth: '40px',
                          textAlign: 'center'
                        }}>
                          {project.key || project.name.charAt(0).toUpperCase()}
                        </span>
                        <span>{project.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={{ color: theme.colors.text, fontSize: '14px' }}>Tags (Issue/Task):</label>
              <div style={{ marginLeft: '8px', width: '70%', position: 'relative' }}>
                <input
                  type="text"
                  value={Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '')}
                  onChange={(e) => handleTagInputChange(index, e.target.value)}
                  onFocus={() => {
                    // Show all tags when focused - only from selected project
                    if (item.projectKey && projectIssues[item.projectKey]) {
                      setTagSuggestions(prev => ({ ...prev, [index]: projectIssues[item.projectKey] }));
                    }
                  }}
                  onBlur={() => {
                    // Small delay to allow click on suggestion before closing
                    setTimeout(() => {
                      setTagSuggestions(prev => {
                        const newSuggestions = { ...prev };
                        delete newSuggestions[index];
                        return newSuggestions;
                      });
                    }, 200);
                  }}
                  placeholder="Search or select issue/task..."
                  style={{ 
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: theme.colors.inputBackground || theme.colors.surface,
                    color: theme.colors.text,
                    border: `1px solid ${theme.colors.inputBorder || theme.colors.border}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
                {tagSuggestions[index] && tagSuggestions[index].length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%', // Always open downwards
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: theme.colors.cardBackground || theme.colors.menuBackground,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1001, // Higher than project dropdown
                    boxShadow: theme.colors.cardShadow || '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        selectTagSuggestion(index, '');
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        color: theme.colors.text,
                        fontSize: '14px',
                        borderBottom: `1px solid ${theme.colors.border}`,
                        transition: 'background-color 0.2s',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.surface}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      No Tag
                    </div>
                    {tagSuggestions[index].map((issue, idx) => (
                      <div
                        key={issue.id}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent blur
                          selectTagSuggestion(index, issue.issue_key);
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          color: theme.colors.text,
                          fontSize: '14px',
                          borderBottom: idx < tagSuggestions[index].length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.surface}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          backgroundColor: theme.colors.info || '#17a2b8',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap'
                        }}>
                          {issue.issue_key}
                        </span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {issue.summary || 'No summary'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={{ color: theme.colors.text, fontSize: '14px' }}>People (comma separated):</label>
              <div style={{ marginLeft: '8px', width: '70%', position: 'relative' }}>
                <input
                  type="text"
                  value={item.people}
                  onChange={(e) => handlePeopleInputChange(index, e.target.value)}
                  onFocus={() => {
                    if (item.people && item.people.trim().length > 0) {
                      handlePeopleInputChange(index, item.people);
                    }
                  }}
                  style={{ 
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: theme.colors.inputBackground || theme.colors.surface,
                    color: theme.colors.text,
                    border: `1px solid ${theme.colors.inputBorder || theme.colors.border}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
                {peopleSuggestions[index] && peopleSuggestions[index].length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: theme.colors.cardBackground || theme.colors.menuBackground,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: theme.colors.cardShadow || '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    {peopleSuggestions[index].map((user, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectPeopleSuggestion(index, user)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          color: theme.colors.text,
                          fontSize: '14px',
                          borderBottom: idx < peopleSuggestions[index].length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.surface}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          backgroundColor: theme.colors.secondary || '#6c757d',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          minWidth: '32px',
                          textAlign: 'center'
                        }}>
                          {getInitials(user)}
                        </span>
                        <span>{user}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={{ color: theme.colors.text, fontSize: '14px' }}>Hours:</label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={item.hours || ''}
                onChange={(e) => updateItem(index, 'hours', e.target.value)}
                style={{ 
                  marginLeft: '8px', 
                  width: '70%',
                  padding: '6px 8px',
                  backgroundColor: theme.colors.inputBackground || theme.colors.surface,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.inputBorder || theme.colors.border}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'inherit'
                }}
                placeholder="0.00"
              />
            </div>
          </div>
        ))}
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={addItem}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: theme.colors.info || '#17a2b8',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            ➕ Add Item
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${theme.colors.border}` }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '6px',
              backgroundColor: theme.colors.surface || 'transparent',
              color: theme.colors.text,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.surface}
            onMouseLeave={(e) => e.target.style.backgroundColor = theme.colors.surface || 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: theme.colors.success || '#28a745',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            Save All
          </button>
        </div>
      </div>
    </div>
  );
}