import React, { useState, useEffect } from 'react';
import LoginView from './LoginView';
import RegisterView from './RegisterView';

/**
 * AuthContainer Component
 * Handles authentication flow and mode switching
 */
function AuthContainer({ onAuthSuccess, inviteCode, isAdminSetup: isAdminSetupProp }) {
  const [authMode, setAuthMode] = useState('login');
  const [isAdminSetup, setIsAdminSetup] = useState(isAdminSetupProp || false);

  // Check for admin setup on mount
  useEffect(() => {
    // If admin setup is passed from parent, use it
    if (isAdminSetupProp) {
      setAuthMode('register');
      setIsAdminSetup(true);
      return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const setupMode = urlParams.get('setup');

    if (setupMode === 'admin' || setupMode === 'first') {
      setAuthMode('register');
      setIsAdminSetup(true);
      // Clear the setup parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (inviteCode) {
      setAuthMode('register');
    }
  }, [inviteCode, isAdminSetupProp]);

  const handleAuth = (user, inviteCodeFromReg = null) => {
    onAuthSuccess(user, inviteCodeFromReg || inviteCode);
  };

  const switchToLogin = () => {
    setAuthMode('login');
    setIsAdminSetup(false);
  };

  const switchToRegister = () => {
    setAuthMode('register');
  };

  if (authMode === 'register') {
    return (
      <RegisterView
        onRegister={handleAuth}
        onSwitchToLogin={switchToLogin}
        inviteCode={inviteCode}
        isAdminSetup={isAdminSetup}
      />
    );
  }

  return (
    <LoginView
      onLogin={handleAuth}
      onSwitchToRegister={switchToRegister}
      inviteCode={inviteCode}
    />
  );
}

export default AuthContainer;
