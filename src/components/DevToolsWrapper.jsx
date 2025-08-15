import { useState, useEffect } from 'react';
import DevToolsPanel from './DevToolsPanel';
import DevToolsButton from './DevToolsButton';
import MobileDevTools from './MobileDevTools';
import { APP_CONFIG } from '../config/app.config';

/**
 * DevToolsWrapper Component
 * Manages all developer tools and their visibility
 * Only renders in development mode or when explicitly enabled
 */
function DevToolsWrapper() {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if dev tools should be enabled
    const shouldEnable = 
      APP_CONFIG.dev.enableDevTools || 
      import.meta.env.DEV || 
      window.location.hostname === 'localhost' ||
      localStorage.getItem('enableDevTools') === 'true';
    
    setIsEnabled(shouldEnable);
    
    // Check if mobile device
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);

    // Secret key combination to enable dev tools in production
    const secretKeys = [];
    const secretCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    
    const handleSecretCode = (e) => {
      secretKeys.push(e.key);
      secretKeys.splice(-secretCode.length - 1, secretKeys.length - secretCode.length);
      
      if (JSON.stringify(secretKeys) === JSON.stringify(secretCode)) {
        console.log('🎮 Konami Code activated! Dev tools enabled.');
        localStorage.setItem('enableDevTools', 'true');
        setIsEnabled(true);
      }
    };

    window.addEventListener('keydown', handleSecretCode);
    
    return () => {
      window.removeEventListener('keydown', handleSecretCode);
    };
  }, []);

  if (!isEnabled) {
    return null;
  }

  const toggleDevTools = () => {
    setIsDevToolsOpen(prev => !prev);
  };

  return (
    <>
      {/* Show mobile-optimized tools on mobile devices */}
      {isMobile ? (
        <MobileDevTools onOpenDevTools={toggleDevTools} />
      ) : (
        <DevToolsButton 
          onClick={toggleDevTools}
          isDevToolsOpen={isDevToolsOpen}
        />
      )}
      
      {isDevToolsOpen && (
        <DevToolsPanel 
          isVisible={isDevToolsOpen}
          onClose={() => setIsDevToolsOpen(false)}
        />
      )}

      {/* Additional dev-only UI elements */}
      {import.meta.env.DEV && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 165, 0, 0.9)',
          color: '#000',
          padding: '2px 10px',
          fontSize: '10px',
          fontWeight: 'bold',
          zIndex: 10001,
          borderBottomLeftRadius: '4px',
          borderBottomRightRadius: '4px',
        }}>
          DEV MODE
        </div>
      )}
    </>
  );
}

export default DevToolsWrapper;