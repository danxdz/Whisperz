import React from 'react';

/**
 * ErrorScreen Component
 * Shows error state with retry option
 */
function ErrorScreen({ error, onRetry }) {
  return (
    <div className="loading-container">
      <div className="error">
        <h2>⚠️ Initialization Error</h2>
        <p>{error}</p>
        <p>Please check your configuration and refresh the page.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              background: '#ff6600',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorScreen;
