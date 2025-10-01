import React, { useState, useEffect } from 'react';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Folder as FolderIcon,
  ColorLens as ColorIcon
} from '@mui/icons-material';
import { DataService } from '../services/dataService.js';

/**
 * ProjectsManager component for managing projects.
 * Allows creating, editing, and deleting projects with colors and descriptions.
 */
export default function ProjectsManager({ isOpen, onClose }) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#0275d8'
  });

  // Load projects when component mounts
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await DataService.getAllProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await DataService.createProject(formData);
      setFormData({ name: '', description: '', color: '#0275d8' });
      setShowCreateForm(false);
      await loadProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      await DataService.updateProject({
        id: editingProject.id,
        ...formData
      });
      setEditingProject(null);
      setFormData({ name: '', description: '', color: '#0275d8' });
      await loadProjects();
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await DataService.deleteProject(projectId);
        await loadProjects();
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const startEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingProject(null);
    setFormData({ name: '', description: '', color: '#0275d8' });
    setShowCreateForm(false);
  };

  const predefinedColors = [
    '#0275d8', '#5cb85c', '#f0ad4e', '#d9534f', '#5bc0de',
    '#6f42c1', '#e83e8c', '#20c997', '#fd7e14', '#6c757d'
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
          <h2 style={{ margin: 0 }}>📂 Manage Projects</h2>
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
        {(showCreateForm || editingProject) && (
          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '4px', 
            padding: '16px', 
            marginBottom: '16px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ margin: '0 0 12px 0' }}>
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </h3>
            <form onSubmit={editingProject ? handleUpdateProject : handleCreateProject}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  Project Name:
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
                  rows={3}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px' 
                  }}
                />
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
                  {editingProject ? 'Update' : 'Create'} Project
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

        {/* Projects List */}
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0275d8',
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
            Add New Project
          </button>
        </div>

        {isLoading ? (
          <p>Loading projects...</p>
        ) : (
          <div>
            {projects.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                No projects yet. Create your first project to get started!
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {projects.map((project) => (
                  <div
                    key={project.id}
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
                        backgroundColor: project.color,
                        flexShrink: 0
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                        {project.name}
                      </div>
                      {project.description && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {project.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => startEdit(project)}
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
                        onClick={() => handleDeleteProject(project.id)}
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
