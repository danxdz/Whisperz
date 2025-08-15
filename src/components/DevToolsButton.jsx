import { useState, useEffect } from 'react';

/**
 * DevToolsButton Component
 * Floating button for quick access to developer tools
 * Includes keyboard shortcuts and drag functionality
 */
function DevToolsButton({ onClick, isDevToolsOpen }) {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + D to toggle dev tools
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        onClick();
      }
      // Ctrl/Cmd + Shift + D to toggle expanded view
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsExpanded(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClick]);

  // Drag functionality
  const handleMouseDown = (e) => {
    if (e.target.classList.contains('drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const quickActions = [
    { icon: '📊', label: 'Stats', action: () => console.log('Database stats requested') },
    { icon: '🔄', label: 'Reload', action: () => window.location.reload() },
    { icon: '🗑️', label: 'Clear', action: () => {
      if (confirm('Clear console?')) console.clear();
    }},
    { icon: '📥', label: 'Export', action: () => console.log('Export requested') },
  ];

  return (
    <div 
      className={`devtools-button-container ${isExpanded ? 'expanded' : ''}`}
      style={{
        position: 'fixed',
        right: `${position.x}px`,
        bottom: `${position.y}px`,
        zIndex: 9999,
      }}
      onMouseDown={handleMouseDown}
    >
      {isExpanded && (
        <div className="devtools-quick-panel">
          <div className="drag-handle">
            <span>⋮⋮</span>
          </div>
          <div className="quick-actions">
            {quickActions.map((action, i) => (
              <button
                key={i}
                className="quick-action-btn"
                onClick={action.action}
                title={action.label}
              >
                <span className="action-icon">{action.icon}</span>
                <span className="action-label">{action.label}</span>
              </button>
            ))}
          </div>
          <div className="shortcuts-info">
            <div>Ctrl+D: Toggle DevTools</div>
            <div>Ctrl+Shift+D: Toggle This Panel</div>
          </div>
        </div>
      )}
      
      <button
        className={`devtools-float-btn ${isDevToolsOpen ? 'active' : ''}`}
        onClick={onClick}
        title="Developer Tools (Ctrl+D)"
      >
        {isDevToolsOpen ? '✕' : '🛠️'}
      </button>

      <button
        className="expand-btn"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Quick Actions"
      >
        {isExpanded ? '◀' : '▶'}
      </button>

      <style jsx>{`
        .devtools-button-container {
          display: flex;
          align-items: flex-end;
          gap: 5px;
          user-select: none;
        }

        .devtools-button-container.expanded {
          flex-direction: column;
          align-items: flex-end;
        }

        .devtools-float-btn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.9);
          border: 2px solid #00ff00;
          color: #00ff00;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          box-shadow: 0 2px 10px rgba(0, 255, 0, 0.3);
        }

        .devtools-float-btn:hover {
          background: rgba(0, 255, 0, 0.1);
          transform: scale(1.1);
          box-shadow: 0 4px 20px rgba(0, 255, 0, 0.5);
        }

        .devtools-float-btn.active {
          background: rgba(255, 0, 0, 0.2);
          border-color: #ff0000;
          color: #ff0000;
        }

        .expand-btn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid #00ff00;
          color: #00ff00;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .expand-btn:hover {
          background: rgba(0, 255, 0, 0.1);
        }

        .devtools-quick-panel {
          background: rgba(0, 0, 0, 0.95);
          border: 1px solid #00ff00;
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 10px;
          min-width: 200px;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .drag-handle {
          cursor: move;
          text-align: center;
          color: #00ff00;
          padding: 5px;
          border-bottom: 1px solid rgba(0, 255, 0, 0.2);
          margin-bottom: 10px;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          margin-bottom: 10px;
        }

        .quick-action-btn {
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid rgba(0, 255, 0, 0.3);
          color: #00ff00;
          padding: 8px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          transition: all 0.2s;
          font-size: 11px;
        }

        .quick-action-btn:hover {
          background: rgba(0, 255, 0, 0.2);
          transform: scale(1.05);
        }

        .action-icon {
          font-size: 16px;
        }

        .action-label {
          font-size: 10px;
        }

        .shortcuts-info {
          font-size: 10px;
          color: rgba(0, 255, 0, 0.6);
          padding-top: 10px;
          border-top: 1px solid rgba(0, 255, 0, 0.2);
        }

        .shortcuts-info div {
          margin-bottom: 3px;
        }

        /* Mobile adjustments */
        @media (max-width: 768px) {
          .devtools-float-btn {
            width: 40px;
            height: 40px;
            font-size: 16px;
          }

          .expand-btn {
            width: 25px;
            height: 25px;
            font-size: 10px;
          }

          .devtools-quick-panel {
            min-width: 150px;
          }
        }

        /* Pulse animation for attention */
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(0, 255, 0, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 255, 0, 0);
          }
        }

        .devtools-float-btn:not(.active) {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
}

export default DevToolsButton;