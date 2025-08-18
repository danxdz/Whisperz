import React from 'react';
import { useTheme } from '../hooks/useTheme';

const ThemeToggle = () => {
  const { theme, toggleTheme, colors } = useTheme();

  return (
    <button 
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        background: colors.bgTertiary,
        border: `1px solid ${colors.borderColor}`,
        color: colors.textPrimary,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        fontSize: '20px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = colors.bgHover;
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = colors.bgTertiary;
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
};

export default ThemeToggle;