import React, { useState, useEffect } from 'react';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Event as EventIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { DataService } from '../services/dataService.js';
import { EmailService } from '../services/emailService.js';

/**
 * MeetingsManager component for managing meetings, attendees, and actions.
 * Provides comprehensive meeting management with attendee tracking and action items.
 */
export default function MeetingsManager({ isOpen, onClose }) {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    meeting_type: 'meeting'
  });
  const [attendeeForm, setAttendeeForm] = useState({
    name: '',
    email: '',
    role: 'attendee'
  });
  const [actionForm, setActionForm] = useState({
    title: '',
    description: '',
    assignee: '',
    due_date: '',
    priority: 'medium'
  });

  // Load meetings when component mounts
  useEffect(() => {
    if (isOpen) {
      loadMeetings();
    }
  }, [isOpen]);

  const loadMeetings = async () => {
    try {
      setIsLoading(true);
      const data = await DataService.getAllMeetings();
      setMeetings(data);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    try {
      const meeting = await DataService.createMeeting({
        ...formData,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        description: formData.description || null,
        location: formData.location || null
      });
      setFormData({ title: '', description: '', start_time: '', end_time: '', location: '', meeting_type: 'meeting' });
      setShowCreateForm(false);
      await loadMeetings();
      
      // Test email connectivity
      const emailConnected = await EmailService.testConnection();
      if (emailConnected) {
        console.log('Email service is ready for meeting invitations');
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
    }
  };

  const handleAddAttendee = async (e) => {
    e.preventDefault();
    if (!selectedMeeting) return;
    
    try {
      await DataService.addMeetingAttendee({
        meeting_id: selectedMeeting.id,
        ...attendeeForm,
        email: attendeeForm.email || null,
        role: attendeeForm.role || 'attendee'
      });
      setAttendeeForm({ name: '', email: '', role: 'attendee' });
      await loadMeetings();
    } catch (error) {
      console.error('Failed to add attendee:', error);
    }
  };

  const handleCreateAction = async (e) => {
    e.preventDefault();
    if (!selectedMeeting) return;
    
    try {
      const action = await DataService.createMeetingAction({
        meeting_id: selectedMeeting.id,
        ...actionForm,
        description: actionForm.description || null,
        assignee: actionForm.assignee || null,
        due_date: actionForm.due_date || null,
        priority: actionForm.priority || 'medium'
      });
      setActionForm({ title: '', description: '', assignee: '', due_date: '', priority: 'medium' });
      await loadMeetings();
      
      // Send email notification if assignee email is provided
      if (actionForm.assignee && actionForm.assignee.includes('@')) {
        await EmailService.sendActionNotification(action, actionForm.assignee);
      }
    } catch (error) {
      console.error('Failed to create action:', error);
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (window.confirm('Are you sure you want to delete this meeting? This will also delete all attendees and actions.')) {
      try {
        await DataService.deleteMeeting(meetingId);
        await loadMeetings();
        if (selectedMeeting && selectedMeeting.id === meetingId) {
          setSelectedMeeting(null);
        }
      } catch (error) {
        console.error('Failed to delete meeting:', error);
      }
    }
  };

  const meetingTypes = [
    'meeting', 'standup', 'retrospective', 'planning', 'review', 'interview', 'workshop', 'presentation'
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low', color: '#28a745' },
    { value: 'medium', label: 'Medium', color: '#ffc107' },
    { value: 'high', label: 'High', color: '#fd7e14' },
    { value: 'urgent', label: 'Urgent', color: '#dc3545' }
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
          maxHeight: '90vh',
          overflowY: 'auto',
          width: '95%',
          maxWidth: '1200px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>📅 Manage Meetings</h2>
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

        <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
          {/* Left Panel - Meetings List */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
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
                New Meeting
              </button>
            </div>

            {isLoading ? (
              <p>Loading meetings...</p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {meetings.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                    No meetings yet. Create your first meeting to get started!
                  </p>
                ) : (
                  meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      onClick={() => setSelectedMeeting(meeting)}
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '12px',
                        cursor: 'pointer',
                        backgroundColor: selectedMeeting?.id === meeting.id ? '#e3f2fd' : '#fafafa',
                        borderColor: selectedMeeting?.id === meeting.id ? '#2196f3' : '#ddd'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {meeting.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        📅 {meeting.meeting_type} • {meeting.status}
                      </div>
                      {meeting.start_time && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          🕐 {new Date(meeting.start_time).toLocaleString()}
                        </div>
                      )}
                      {meeting.location && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          📍 {meeting.location}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMeeting(meeting.id);
                        }}
                        style={{
                          marginTop: '8px',
                          padding: '2px 6px',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Meeting Details */}
          {selectedMeeting && (
            <div style={{ flex: 2, minWidth: '400px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 8px 0' }}>{selectedMeeting.title}</h3>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                  {selectedMeeting.description && <div>📝 {selectedMeeting.description}</div>}
                  {selectedMeeting.start_time && (
                    <div>🕐 {new Date(selectedMeeting.start_time).toLocaleString()}</div>
                  )}
                  {selectedMeeting.end_time && (
                    <div>🕐 End: {new Date(selectedMeeting.end_time).toLocaleString()}</div>
                  )}
                  {selectedMeeting.location && <div>📍 {selectedMeeting.location}</div>}
                </div>
              </div>

              {/* Attendees Section */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PeopleIcon style={{ fontSize: '16px' }} />
                    Attendees
                  </h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={async () => {
                        if (selectedMeeting) {
                          const attendees = await DataService.getMeetingAttendees(selectedMeeting.id);
                          await EmailService.sendMeetingInvitation(selectedMeeting, attendees);
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#17a2b8',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      📧 Send Invites
                    </button>
                    <button
                      onClick={async () => {
                        if (selectedMeeting) {
                          const attendees = await DataService.getMeetingAttendees(selectedMeeting.id);
                          await EmailService.sendMeetingReminder(selectedMeeting, attendees);
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#ffc107',
                        color: '#000',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      🔔 Send Reminder
                    </button>
                  </div>
                </div>
                <form onSubmit={handleAddAttendee} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Name"
                    value={attendeeForm.name}
                    onChange={(e) => setAttendeeForm({ ...attendeeForm, name: e.target.value })}
                    required
                    style={{ flex: 1, padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={attendeeForm.email}
                    onChange={(e) => setAttendeeForm({ ...attendeeForm, email: e.target.value })}
                    style={{ flex: 1, padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <select
                    value={attendeeForm.role}
                    onChange={(e) => setAttendeeForm({ ...attendeeForm, role: e.target.value })}
                    style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    <option value="attendee">Attendee</option>
                    <option value="organizer">Organizer</option>
                    <option value="presenter">Presenter</option>
                    <option value="facilitator">Facilitator</option>
                  </select>
                  <button
                    type="submit"
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Add
                  </button>
                </form>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {selectedMeeting.attendees?.length || 0} attendees
                </div>
              </div>

              {/* Actions Section */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AssignmentIcon style={{ fontSize: '16px' }} />
                  Action Items
                </h4>
                <form onSubmit={handleCreateAction} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Action title"
                    value={actionForm.title}
                    onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
                    required
                    style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <textarea
                    placeholder="Description"
                    value={actionForm.description}
                    onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                    rows={2}
                    style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Assignee"
                      value={actionForm.assignee}
                      onChange={(e) => setActionForm({ ...actionForm, assignee: e.target.value })}
                      style={{ flex: 1, padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    <input
                      type="datetime-local"
                      value={actionForm.due_date}
                      onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
                      style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    <select
                      value={actionForm.priority}
                      onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })}
                      style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                    >
                      {priorityLevels.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#17a2b8',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      alignSelf: 'flex-start'
                    }}
                  >
                    Add Action
                  </button>
                </form>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {selectedMeeting.actions?.length || 0} action items
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create Meeting Form */}
        {showCreateForm && (
          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '4px', 
            padding: '16px', 
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ margin: '0 0 12px 0' }}>Create New Meeting</h3>
            <form onSubmit={handleCreateMeeting}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    Meeting Title:
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      border: '1px solid #ccc', 
                      borderRadius: '4px' 
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    Meeting Type:
                  </label>
                  <select
                    value={formData.meeting_type}
                    onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      border: '1px solid #ccc', 
                      borderRadius: '4px' 
                    }}
                  >
                    {meetingTypes.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    Start Time:
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      border: '1px solid #ccc', 
                      borderRadius: '4px' 
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    End Time:
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      border: '1px solid #ccc', 
                      borderRadius: '4px' 
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    Location:
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Meeting room, Zoom, etc."
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      border: '1px solid #ccc', 
                      borderRadius: '4px' 
                    }}
                  />
                </div>
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
                  Create Meeting
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
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
      </div>
    </div>
  );
}
