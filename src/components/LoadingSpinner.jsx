import React, { memo } from 'react';

/**
 * LoadingSpinner Component
 * A reusable loading indicator with customizable size and message
 * 
 * @param {Object} props
 * @param {string} props.size - Size of the spinner ('small', 'medium', 'large')
 * @param {string} props.message - Optional loading message to display
 * @param {boolean} props.fullScreen - Whether to show as full screen overlay
 */
const LoadingSpinner = memo(({ 
  size = 'medium', 
  message = '', 
  fullScreen = false 
}) => {
  const sizeMap = {
    small: 20,
    medium: 40,
    large: 60
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;

  const spinnerStyle = {
    width: `${spinnerSize}px`,
    height: `${spinnerSize}px`,
    border: `3px solid rgba(0, 255, 0, 0.1)`,
    borderTop: `3px solid #00ff00`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  const containerStyle = fullScreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 9999,
  } : {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  };

  return (
    <div style={containerStyle} className="loading-spinner-container">
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .loading-dots {
            display: inline-block;
            position: relative;
            width: 80px;
            height: 20px;
          }
          
          .loading-dots div {
            position: absolute;
            top: 8px;
            width: 13px;
            height: 13px;
            border-radius: 50%;
            background: #00ff00;
            animation-timing-function: cubic-bezier(0, 1, 1, 0);
          }
          
          .loading-dots div:nth-child(1) {
            left: 8px;
            animation: lds-ellipsis1 0.6s infinite;
          }
          
          .loading-dots div:nth-child(2) {
            left: 8px;
            animation: lds-ellipsis2 0.6s infinite;
          }
          
          .loading-dots div:nth-child(3) {
            left: 32px;
            animation: lds-ellipsis2 0.6s infinite;
          }
          
          .loading-dots div:nth-child(4) {
            left: 56px;
            animation: lds-ellipsis3 0.6s infinite;
          }
          
          @keyframes lds-ellipsis1 {
            0% {
              transform: scale(0);
            }
            100% {
              transform: scale(1);
            }
          }
          
          @keyframes lds-ellipsis3 {
            0% {
              transform: scale(1);
            }
            100% {
              transform: scale(0);
            }
          }
          
          @keyframes lds-ellipsis2 {
            0% {
              transform: translate(0, 0);
            }
            100% {
              transform: translate(24px, 0);
            }
          }
        `}
      </style>
      
      <div style={spinnerStyle} aria-label="Loading"></div>
      
      {message && (
        <div style={{ 
          marginTop: '20px', 
          color: '#00ff00',
          fontSize: size === 'small' ? '12px' : '14px',
          textAlign: 'center'
        }}>
          {message}
          <div className="loading-dots" style={{ marginTop: '10px' }}>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
      )}
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;