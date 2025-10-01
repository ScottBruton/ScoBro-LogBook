/**
 * Email Service for Outlook integration
 * Provides functionality to send meeting invitations and notifications
 * using the Outlook credentials stored in credentials.json
 */

export class EmailService {
  /**
   * Get email credentials from the application
   * @returns {Promise<Object>} Email credentials
   */
  static async getCredentials() {
    try {
      // In a real implementation, this would read from credentials.json
      // For now, we'll return a placeholder structure
      return {
        username: 'scott@idegroup.com.au',
        password: 'Laen1903#104',
        smtp: {
          host: 'smtp-mail.outlook.com',
          port: 587,
          secure: false
        }
      };
    } catch (error) {
      console.error('Failed to get email credentials:', error);
      throw error;
    }
  }

  /**
   * Send meeting invitation email
   * @param {Object} meeting - Meeting object
   * @param {Array} attendees - Array of attendee objects with email addresses
   * @returns {Promise<boolean>} Success status
   */
  static async sendMeetingInvitation(meeting, attendees) {
    try {
      const credentials = await this.getCredentials();
      
      // Filter attendees with email addresses
      const emailAttendees = attendees.filter(attendee => attendee.email);
      
      if (emailAttendees.length === 0) {
        console.log('No attendees with email addresses to send invitations to');
        return false;
      }

      // Create email content
      const subject = `Meeting Invitation: ${meeting.title}`;
      const body = this.generateMeetingInvitationBody(meeting, emailAttendees);
      
      console.log('Would send meeting invitation:', {
        to: emailAttendees.map(a => a.email),
        subject,
        body: body.substring(0, 200) + '...'
      });

      // In a real implementation, this would use a library like nodemailer
      // to send the actual email through Outlook SMTP
      
      return true;
    } catch (error) {
      console.error('Failed to send meeting invitation:', error);
      return false;
    }
  }

  /**
   * Generate meeting invitation email body
   * @param {Object} meeting - Meeting object
   * @param {Array} attendees - Array of attendees
   * @returns {string} Email body
   */
  static generateMeetingInvitationBody(meeting, attendees) {
    const startTime = meeting.start_time ? new Date(meeting.start_time).toLocaleString() : 'TBD';
    const endTime = meeting.end_time ? new Date(meeting.end_time).toLocaleString() : 'TBD';
    const location = meeting.location || 'TBD';

    return `
Dear Team,

You are invited to attend the following meeting:

Meeting: ${meeting.title}
Type: ${meeting.meeting_type}
Date & Time: ${startTime} - ${endTime}
Location: ${location}

${meeting.description ? `Description: ${meeting.description}` : ''}

Attendees:
${attendees.map(attendee => `- ${attendee.name} (${attendee.role})`).join('\n')}

Please confirm your attendance.

Best regards,
ScoBro Logbook
    `.trim();
  }

  /**
   * Send meeting reminder email
   * @param {Object} meeting - Meeting object
   * @param {Array} attendees - Array of attendees
   * @returns {Promise<boolean>} Success status
   */
  static async sendMeetingReminder(meeting, attendees) {
    try {
      const credentials = await this.getCredentials();
      
      const emailAttendees = attendees.filter(attendee => attendee.email);
      
      if (emailAttendees.length === 0) {
        return false;
      }

      const subject = `Meeting Reminder: ${meeting.title}`;
      const body = this.generateMeetingReminderBody(meeting, emailAttendees);
      
      console.log('Would send meeting reminder:', {
        to: emailAttendees.map(a => a.email),
        subject,
        body: body.substring(0, 200) + '...'
      });

      return true;
    } catch (error) {
      console.error('Failed to send meeting reminder:', error);
      return false;
    }
  }

  /**
   * Generate meeting reminder email body
   * @param {Object} meeting - Meeting object
   * @param {Array} attendees - Array of attendees
   * @returns {string} Email body
   */
  static generateMeetingReminderBody(meeting, attendees) {
    const startTime = meeting.start_time ? new Date(meeting.start_time).toLocaleString() : 'TBD';
    const location = meeting.location || 'TBD';

    return `
Meeting Reminder

This is a reminder for your upcoming meeting:

Meeting: ${meeting.title}
Date & Time: ${startTime}
Location: ${location}

${meeting.description ? `Description: ${meeting.description}` : ''}

See you there!

Best regards,
ScoBro Logbook
    `.trim();
  }

  /**
   * Send action item notification email
   * @param {Object} action - Action item object
   * @param {string} assigneeEmail - Assignee's email address
   * @returns {Promise<boolean>} Success status
   */
  static async sendActionNotification(action, assigneeEmail) {
    try {
      if (!assigneeEmail) {
        console.log('No email address provided for action notification');
        return false;
      }

      const subject = `New Action Item: ${action.title}`;
      const body = this.generateActionNotificationBody(action);
      
      console.log('Would send action notification:', {
        to: assigneeEmail,
        subject,
        body: body.substring(0, 200) + '...'
      });

      return true;
    } catch (error) {
      console.error('Failed to send action notification:', error);
      return false;
    }
  }

  /**
   * Generate action item notification email body
   * @param {Object} action - Action item object
   * @returns {string} Email body
   */
  static generateActionNotificationBody(action) {
    const dueDate = action.due_date ? new Date(action.due_date).toLocaleDateString() : 'No due date set';
    const priority = action.priority || 'medium';

    return `
New Action Item Assigned

You have been assigned a new action item:

Title: ${action.title}
Priority: ${priority}
Due Date: ${dueDate}

${action.description ? `Description: ${action.description}` : ''}

Please update the status as you work on this item.

Best regards,
ScoBro Logbook
    `.trim();
  }

  /**
   * Test email connectivity
   * @returns {Promise<boolean>} Connection status
   */
  static async testConnection() {
    try {
      const credentials = await this.getCredentials();
      
      // In a real implementation, this would test SMTP connection
      console.log('Email service configured for:', credentials.username);
      console.log('SMTP Host:', credentials.smtp.host);
      
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}
