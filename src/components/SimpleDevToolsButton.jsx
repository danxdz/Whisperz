import { useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';

/**
 * SimpleDevToolsButton Component
 * Minimal button for desktop to toggle DevTools
 */
function SimpleDevToolsButton({ onClick, isOpen }) {
  const { colors } = useTheme();
  
  // Keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + D to toggle dev tools
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        onClick();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClick]);

  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        background: isOpen 
          ? colors.danger
          : colors.bgCard,
        border: `1px solid ${isOpen ? colors.danger : colors.borderColor}`,
        color: isOpen ? '#fff' : colors.textPrimary,
        fontSize: '16px',
        cursor: 'pointer',
        boxShadow: colors.shadow,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      title="Toggle DevTools (Ctrl+D)"
    >
      {isOpen ? '✕' : '🛠️'}
    </button>
  );
}

export default SimpleDevToolsButton;