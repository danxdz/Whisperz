import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default theme functions if no context
    return {
      theme: 'dark',
      toggleTheme: () => console.log('Theme toggle not available'),
      colors: {
        background: '#1a1a1a',
        text: '#e0e0e0',
        primary: '#00ff00',
        secondary: '#808080'
      }
    };
  }
  return context;
};