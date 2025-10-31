import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('scobro-theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Default to dark mode when no preference stored
    return true;
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('scobro-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Apply theme colors to the full page (including side columns/body)
  useEffect(() => {
    const bg = isDarkMode ? '#1a1a1a' : '#ffffff';
    const fg = isDarkMode ? '#ffffff' : '#333333';
    // html and body backgrounds
    if (typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = bg;
      document.body.style.backgroundColor = bg;
      document.body.style.color = fg;
      // hint for native scrollbars on some platforms
      document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    }
  }, [isDarkMode]);

  // Theme colors
  const theme = {
    isDarkMode,
    toggleTheme,
    colors: {
      // Background colors
      background: isDarkMode ? '#1a1a1a' : '#ffffff',
      surface: isDarkMode ? '#2d2d2d' : '#f8f9fa',
      surfaceElevated: isDarkMode ? '#3a3a3a' : '#ffffff',
      
      // Text colors
      text: isDarkMode ? '#ffffff' : '#333333',
      textSecondary: isDarkMode ? '#b0b0b0' : '#666666',
      textMuted: isDarkMode ? '#888888' : '#999999',
      
      // Border colors
      border: isDarkMode ? '#404040' : '#dee2e6',
      borderLight: isDarkMode ? '#333333' : '#e9ecef',
      
      // Status colors
      success: isDarkMode ? '#4caf50' : '#28a745',
      warning: isDarkMode ? '#ff9800' : '#fd7e14',
      error: isDarkMode ? '#f44336' : '#dc3545',
      info: isDarkMode ? '#2196f3' : '#17a2b8',
      
      // Button colors
      primary: isDarkMode ? '#1976d2' : '#007bff',
      primaryHover: isDarkMode ? '#1565c0' : '#0056b3',
      secondary: isDarkMode ? '#424242' : '#6c757d',
      secondaryHover: isDarkMode ? '#303030' : '#545b62',
      
      // Header colors
      headerBackground: isDarkMode ? '#2d2d2d' : '#f8f9fa',
      headerBorder: isDarkMode ? '#404040' : '#dee2e6',
      
      // Card colors
      cardBackground: isDarkMode ? '#2d2d2d' : '#ffffff',
      cardBorder: isDarkMode ? '#404040' : '#dee2e6',
      cardShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
      
      // Input colors
      inputBackground: isDarkMode ? '#3a3a3a' : '#ffffff',
      inputBorder: isDarkMode ? '#555555' : '#ced4da',
      inputFocus: isDarkMode ? '#1976d2' : '#007bff',
      
      // Status pill colors
      pillConnected: isDarkMode ? '#4caf50' : '#28a745',
      pillConnectedBg: isDarkMode ? '#1b5e20' : '#d4edda',
      pillNotConfigured: isDarkMode ? '#757575' : '#6c757d',
      pillNotConfiguredBg: isDarkMode ? '#424242' : '#f8f9fa',
      pillError: isDarkMode ? '#f44336' : '#dc3545',
      pillErrorBg: isDarkMode ? '#b71c1c' : '#f8d7da',
      pillWarning: isDarkMode ? '#ff9800' : '#fd7e14',
      pillWarningBg: isDarkMode ? '#e65100' : '#fff3cd',
      
      // Overlay colors
      overlay: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)',
      
      // Menu colors
      menuBackground: isDarkMode ? '#2d2d2d' : '#ffffff',
      menuItemHover: isDarkMode ? '#3a3a3a' : '#f8f9fa',
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

