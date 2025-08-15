import React, { useState, useEffect } from 'react';

const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="theme-toggle-container">
      <button 
        className="theme-toggle-btn glass-button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        )}
      </button>
      <style jsx>{`
        .theme-toggle-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
        }
        
        .theme-toggle-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .theme-toggle-btn:hover {
          transform: rotate(180deg) scale(1.1);
        }
        
        /* Light theme overrides */
        :root[data-theme="light"] {
          --bg-primary: #ffffff;
          --bg-secondary: #f8f9fa;
          --bg-tertiary: #e9ecef;
          --text-primary: #212529;
          --text-secondary: #495057;
          --text-muted: #6c757d;
          --border-color: rgba(0, 0, 0, 0.1);
          --glass-bg: rgba(255, 255, 255, 0.7);
          --glass-border: rgba(0, 0, 0, 0.1);
        }
        
        :root[data-theme="light"] body {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        }
        
        :root[data-theme="light"] body::before {
          background-image: 
            radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(79, 172, 254, 0.03) 0%, transparent 50%);
        }
      `}</style>
    </div>
  );
};

export default ThemeToggle;