import React, { useState } from 'react';
import { EmailService } from '../services/emailService.js';

/**
 * EmailConfigModal component for configuring email settings.
 * Allows users to set up SMTP credentials for meeting notifications.
 */
export default function EmailConfigModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    fromName: 'ScoBro Logbook'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTestResult(null);

    try {
      // Save credentials (in a real app, this would be encrypted)
      const credentials = {
        username: formData.username,
        password: formData.password,
        smtp: {
          host: formData.smtpHost,
          port: parseInt(formData.smtpPort),
          secure: formData.smtpPort === '465'
        },
        from: {
          name: formData.fromName,
          email: formData.username
        }
      };

      // Save credentials first
      localStorage.setItem('email_credentials', JSON.stringify(credentials));
      
      // Test the connection
      const testResult = await EmailService.testConnection();
      
      if (testResult.success) {
        setTestResult({ success: true, message: 'Email configuration successful!' });
        
        // Notify parent component that email was configured
        if (onSave) {
          onSave();
        }
      } else {
        setTestResult({ success: false, message: testResult.error || 'Failed to connect to email server' });
        // Remove credentials if test failed
        localStorage.removeItem('email_credentials');
      }
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // Temporarily save credentials for testing
      const testCredentials = {
        username: formData.username,
        password: formData.password,
        smtp: {
          host: formData.smtpHost,
          port: parseInt(formData.smtpPort),
          secure: formData.smtpPort === '465'
        },
        from: {
          name: formData.fromName,
          email: formData.username
        }
      };

      // Save temporarily for test
      localStorage.setItem('email_credentials', JSON.stringify(testCredentials));
      
      const testResult = await EmailService.testConnection();
      setTestResult({
        success: testResult.success,
        message: testResult.success ? 'Connection successful!' : (testResult.error || 'Connection failed')
      });
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsLoading(false);
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
          maxWidth: '500px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>📧 Email Configuration</h2>
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Email Address:
            </label>
            <input
              type="email"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #ccc', 
                borderRadius: '4px' 
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Password/App Password:
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #ccc', 
                borderRadius: '4px' 
              }}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              💡 For Gmail, use an App Password instead of your regular password
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              From Name:
            </label>
            <input
              type="text"
              value={formData.fromName}
              onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #ccc', 
                borderRadius: '4px' 
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                SMTP Host:
              </label>
              <input
                type="text"
                value={formData.smtpHost}
                onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
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
                SMTP Port:
              </label>
              <select
                value={formData.smtpPort}
                onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px' 
                }}
              >
                <option value="587">587 (TLS)</option>
                <option value="465">465 (SSL)</option>
                <option value="25">25 (Standard)</option>
              </select>
            </div>
          </div>

          {testResult && (
            <div style={{ 
              marginBottom: '16px', 
              padding: '8px', 
              backgroundColor: testResult.success ? '#d4edda' : '#f8d7da', 
              color: testResult.success ? '#155724' : '#721c24', 
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              {testResult.success ? '✅' : '❌'} {testResult.message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#17a2b8',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>

        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '12px' }}>
          <strong>📋 Setup Instructions:</strong>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>For Gmail: Enable 2FA and create an App Password</li>
            <li>For Outlook: Use your regular password or App Password</li>
            <li>For other providers: Check their SMTP settings</li>
            <li>Test the connection before saving</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
