import { useEffect } from 'react';

/**
 * SimpleDevToolsButton Component
 * Minimal button for desktop to toggle DevTools
 */
function SimpleDevToolsButton({ onClick, isOpen }) {
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
        bottom: '20px',
        right: '20px',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: isOpen 
          ? 'linear-gradient(135deg, #ff6b6b, #c92a2a)' 
          : 'linear-gradient(135deg, #667eea, #764ba2)',
        border: 'none',
        color: 'white',
        fontSize: '20px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
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