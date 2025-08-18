import React from 'react';

/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the whole app
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    // console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // You could also log to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #ff0000',
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          color: '#00ff00',
          fontFamily: 'monospace'
        }}>
          <h2 style={{ color: '#ff0000' }}>⚠️ Something went wrong</h2>
          <p>The application encountered an unexpected error.</p>
          
          {/* Show error details in development */}
          {import.meta.env.DEV && this.state.error && (
            <details style={{ marginTop: '20px' }}>
              <summary style={{ cursor: 'pointer', color: '#ffff00' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                <strong>Error:</strong> {this.state.error.toString()}
                {'\n\n'}
                <strong>Stack:</strong> {this.state.error.stack}
                {'\n\n'}
                <strong>Component Stack:</strong> {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={this.handleReset}
              style={{
                padding: '10px 20px',
                backgroundColor: '#00ff00',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginRight: '10px'
              }}
            >
              Try Again
            </button>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: '#00ff00',
                border: '1px solid #00ff00',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
          
          {this.state.errorCount > 2 && (
            <p style={{ marginTop: '20px', color: '#ffff00' }}>
              ⚠️ Multiple errors detected. Consider refreshing the page or clearing your browser cache.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;