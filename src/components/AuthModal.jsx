import React, { useState } from 'react';
import { SupabaseService } from '../services/supabaseService.js';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Authentication modal for Supabase login/signup.
 * This component will be used in Phase 2 for cloud sync functionality.
 */
export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const theme = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await SupabaseService.signUp(email, password);
        setError('Check your email for verification link!');
      } else {
        await SupabaseService.signIn(email, password);
        onAuthSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message);
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
        backgroundColor: theme.colors.overlay,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.cardBackground,
          color: theme.colors.text,
          padding: '24px',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '400px',
          border: `1px solid ${theme.colors.border}`
        }}
      >
        <h2 style={{ marginBottom: '16px', textAlign: 'center' }}>
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: `1px solid ${theme.colors.inputBorder}`, 
                backgroundColor: theme.colors.inputBackground,
                color: theme.colors.text,
                borderRadius: '4px' 
              }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: `1px solid ${theme.colors.inputBorder}`, 
                backgroundColor: theme.colors.inputBackground,
                color: theme.colors.text,
                borderRadius: '4px' 
              }}
            />
          </div>

          {error && (
            <div style={{ 
              marginBottom: '16px', 
              padding: '8px', 
              backgroundColor: theme.colors.pillErrorBg, 
              color: '#fff', 
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: theme.colors.primary,
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
            
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                padding: '8px 16px',
                backgroundColor: theme.colors.secondary,
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: theme.colors.textSecondary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
