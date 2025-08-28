import React from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * LoadingScreen Component
 * Shows loading state while app initializes
 */
function LoadingScreen({ message = "Initializing Whisperz..." }) {
  return (
    <div className="loading-container">
      <LoadingSpinner />
      <p>{message}</p>
    </div>
  );
}

export default LoadingScreen;
