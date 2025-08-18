import React, { createContext, useContext, useState, useEffect } from 'react';

// Theme definitions
const themes = {
  dark: {
    // Backgrounds
    bgPrimary: 'linear-gradient(135deg, #0a0a0f 0%, #16161f 100%)',
    bgSecondary: 'rgba(20, 20, 30, 0.95)',
    bgTertiary: 'rgba(255, 255, 255, 0.05)',
    bgCard: 'rgba(255, 255, 255, 0.03)',
    bgHover: 'rgba(255, 255, 255, 0.1)',
    
    // Text colors
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textMuted: 'rgba(255, 255, 255, 0.5)',
    
    // Border colors
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderHover: 'rgba(255, 255, 255, 0.2)',
    
    // Accent colors
    primary: 'linear-gradient(135deg, #667eea, #764ba2)',
    primaryBg: 'rgba(102, 126, 234, 0.2)',
    success: '#43e97b',
    successBg: 'rgba(67, 233, 123, 0.2)',
    error: '#ff6666',
    errorBg: 'rgba(255, 0, 0, 0.1)',
    
    // Message bubbles
    messageSent: 'linear-gradient(135deg, #667eea, #764ba2)',
    messageReceived: 'rgba(255, 255, 255, 0.1)',
    
    // Status colors
    online: '#43e97b',
    offline: '#666',
    
    // Shadows
    shadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    shadowLight: '0 4px 12px rgba(0, 0, 0, 0.2)'
  },
  light: {
    // Backgrounds
    bgPrimary: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
    bgSecondary: 'rgba(255, 255, 255, 0.95)',
    bgTertiary: 'rgba(0, 0, 0, 0.05)',
    bgCard: 'rgba(255, 255, 255, 0.9)',
    bgHover: 'rgba(0, 0, 0, 0.05)',
    
    // Text colors
    textPrimary: '#212529',
    textSecondary: '#495057',
    textMuted: '#6c757d',
    
    // Border colors
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderHover: 'rgba(0, 0, 0, 0.2)',
    
    // Accent colors
    primary: 'linear-gradient(135deg, #667eea, #764ba2)',
    primaryBg: 'rgba(102, 126, 234, 0.1)',
    success: '#28a745',
    successBg: 'rgba(40, 167, 69, 0.1)',
    error: '#dc3545',
    errorBg: 'rgba(220, 53, 69, 0.1)',
    
    // Message bubbles
    messageSent: 'linear-gradient(135deg, #667eea, #764ba2)',
    messageReceived: 'rgba(0, 0, 0, 0.08)',
    
    // Status colors
    online: '#28a745',
    offline: '#adb5bd',
    
    // Shadows
    shadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    shadowLight: '0 4px 12px rgba(0, 0, 0, 0.05)'
  }
};

// Create context
const ThemeContext = createContext();

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const currentTheme = themes[theme];

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors: currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { ThemeContext };
export default ThemeContext;