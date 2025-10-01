import React, { useState, useEffect } from 'react';
import { DataService } from '../services/dataService.js';

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
export default function EntryPopup({ isOpen, onSave, onClose }) {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);

  // Load projects when popup opens
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    try {
      const data = await DataService.getAllProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
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
        tags: '',
        jira: '',
        people: '',
      },
    ]);
  };

  // Updates a specific field on an item at a given index.
  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
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
      .filter((item) => item.content.trim() !== '')
      .map((item) => ({
        ...item,
        tags: item.tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
        people: item.people
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p.length > 0),
        jira: item.jira
          .split(',')
          .map((j) => j.trim())
          .filter((j) => j.length > 0),
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
          padding: '16px',
          borderRadius: '8px',
          maxHeight: '80vh',
          overflowY: 'auto',
          width: '90%',
          maxWidth: '600px',
        }}
      >
        <h2 style={{ marginBottom: '8px' }}>New Entry</h2>
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{item.type}</strong>
              <button
                onClick={() => removeItem(index)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#d9534f',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                🗑️ Remove
              </button>
            </div>
            <div style={{ marginTop: '4px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Content:</label>
              <textarea
                value={item.content}
                onChange={(e) => updateItem(index, 'content', e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '4px' }}
              />
            </div>
            <div style={{ marginTop: '8px' }}>
              <label>Type:</label>
              <select
                value={item.type}
                onChange={(e) => updateItem(index, 'type', e.target.value)}
                style={{ marginLeft: '8px' }}
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: '8px' }}>
              <label>Project:</label>
              <select
                value={item.project}
                onChange={(e) => updateItem(index, 'project', e.target.value)}
                style={{ marginLeft: '8px', width: '70%', padding: '4px' }}
              >
                <option value="">No Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.name}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: '8px' }}>
              <label>Tags (comma separated):</label>
              <input
                type="text"
                value={item.tags}
                onChange={(e) => updateItem(index, 'tags', e.target.value)}
                style={{ marginLeft: '8px', width: '70%' }}
              />
            </div>
            <div style={{ marginTop: '8px' }}>
              <label>Jira (comma separated):</label>
              <input
                type="text"
                value={item.jira}
                onChange={(e) => updateItem(index, 'jira', e.target.value)}
                style={{ marginLeft: '8px', width: '70%' }}
              />
            </div>
            <div style={{ marginTop: '8px' }}>
              <label>People (comma separated):</label>
              <input
                type="text"
                value={item.people}
                onChange={(e) => updateItem(index, 'people', e.target.value)}
                style={{ marginLeft: '8px', width: '70%' }}
              />
            </div>
          </div>
        ))}
        <div style={{ marginBottom: '8px' }}>
          <button
            onClick={addItem}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#5bc0de',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            ➕ Add Item
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#5cb85c',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Save All
          </button>
        </div>
      </div>
    </div>
  );
}