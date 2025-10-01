import React, { useState, useEffect } from 'react';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Label as LabelIcon,
  ColorLens as ColorIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { DataService } from '../services/dataService.js';

/**
 * TagsManager component for managing tags.
 * Allows creating, editing, and deleting tags with colors, descriptions, and categories.
 */
export default function TagsManager({ isOpen, onClose }) {
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6c757d',
    category: ''
  });

  // Load tags when component mounts
  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen]);

  const loadTags = async () => {
    try {
      setIsLoading(true);
      const data = await DataService.getAllTags();
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    try {
      await DataService.createTag({
        ...formData,
        description: formData.description || null,
        category: formData.category || null
      });
      setFormData({ name: '', description: '', color: '#6c757d', category: '' });
      setShowCreateForm(false);
      await loadTags();
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleUpdateTag = async (e) => {
    e.preventDefault();
    try {
      await DataService.updateTag({
        id: editingTag.id,
        ...formData,
        description: formData.description || null,
        category: formData.category || null
      });
      setEditingTag(null);
      setFormData({ name: '', description: '', color: '#6c757d', category: '' });
      await loadTags();
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  };

  const handleDeleteTag = async (tagId) => {
    if (window.confirm('Are you sure you want to delete this tag? This will remove it from all items.')) {
      try {
        await DataService.deleteTag(tagId);
        await loadTags();
      } catch (error) {
        console.error('Failed to delete tag:', error);
      }
    }
  };

  const startEdit = (tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      description: tag.description || '',
      color: tag.color,
      category: tag.category || ''
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setFormData({ name: '', description: '', color: '#6c757d', category: '' });
    setShowCreateForm(false);
  };

  const predefinedColors = [
    '#6c757d', '#dc3545', '#fd7e14', '#ffc107', '#198754',
    '#0d6efd', '#6f42c1', '#d63384', '#20c997', '#0dcaf0'
  ];

  const predefinedCategories = [
    'Work', 'Personal', 'Learning', 'Health', 'Finance',
    'Travel', 'Hobby', 'Family', 'Friends', 'Other'
  ];

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
          maxHeight: '80vh',
          overflowY: 'auto',
          width: '90%',
          maxWidth: '600px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>🏷️ Manage Tags</h2>
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

        {/* Create/Edit Form */}
        {(showCreateForm || editingTag) && (
          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '4px', 
            padding: '16px', 
            marginBottom: '16px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ margin: '0 0 12px 0' }}>
              {editingTag ? 'Edit Tag' : 'Create New Tag'}
            </h3>
            <form onSubmit={editingTag ? handleUpdateTag : handleCreateTag}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  Tag Name:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px' 
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  Description:
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px' 
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  Category:
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px' 
                  }}
                >
                  <option value="">No Category</option>
                  {predefinedCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Color:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: formData.color === color ? '3px solid #333' : '1px solid #ccc',
                        backgroundColor: color,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {formData.color === color && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                    </button>
                  ))}
                </div>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  style={{ marginTop: '8px', width: '60px', height: '32px', border: 'none', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#5cb85c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {editingTag ? 'Update' : 'Create'} Tag
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tags List */}
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6f42c1',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AddIcon style={{ fontSize: '16px' }} />
            Add New Tag
          </button>
        </div>

        {isLoading ? (
          <p>Loading tags...</p>
        ) : (
          <div>
            {tags.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                No tags yet. Create your first tag to get started!
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: tag.color,
                        flexShrink: 0
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                        {tag.name}
                      </div>
                      {tag.description && (
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
                          {tag.description}
                        </div>
                      )}
                      {tag.category && (
                        <div style={{ fontSize: '11px', color: '#888' }}>
                          📁 {tag.category}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => startEdit(tag)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#f0ad4e',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        <EditIcon style={{ fontSize: '12px' }} />
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#d9534f',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        <DeleteIcon style={{ fontSize: '12px' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
