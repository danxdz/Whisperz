import { useState, useEffect, useRef } from 'react';

// Import utilities first (no dependencies)
// import resetDatabase from './utils/resetDatabase'; // Not currently used in App.jsx
import { getMobileConfig } from './utils/mobileDetect';

// Import logging (depends on nothing)
import debugLogger from './utils/debugLogger';
import consoleCapture from './utils/consoleCapture';

// Import basic services
import gunAuthService from './services/gunAuthService';
import gunMessaging from './services/gunMessaging';
import hybridGunService from './services/hybridGunService';
import friendsService from './services/friendsService';
import messageService from './services/messageService';
import presenceService from './services/presenceService';

// Import onlineStatusFix after basic services (it depends on them)
import onlineStatusManager from './utils/onlineStatusFix';

// Production-safe timeout manager using closure
const createTimeoutManager = () => {
  let authTimeout = null;

  return {
    setAuthTimeout: (callback, delay) => {
      if (authTimeout) clearTimeout(authTimeout);
      authTimeout = setTimeout(callback, delay);
    },
    clearAuthTimeout: () => {
      if (authTimeout) {
        clearTimeout(authTimeout);
        authTimeout = null;
      }
    }
  };
};

// Create a module-level timeout manager instance
const globalTimeoutManager = createTimeoutManager();

// Import modular components
import { AuthContainer } from './components/index';
import { MainChatInterface } from './components/index';
import { LoadingScreen } from './components/index';
import { ErrorScreen } from './components/index';

/**
 * Main App Component
 * Orchestrates the application flow and manages global state
 */
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState(null);
  const [initError, setInitError] = useState(null);
  const [isAdminSetup, setIsAdminSetup] = useState(false);
  const loadFriendsRef = useRef(null);
  
  // Get mobile configuration
  // const mobileConfig = getMobileConfig(); // Not currently used

  // Use the global timeout manager
  const timeoutManager = globalTimeoutManager;

  // Version indicator for deployment verification
  useEffect(() => {
    // Start console capture immediately
    if (!consoleCapture.isCapturing) {
      consoleCapture.start();
      debugLogger.debug('info', '📹 Console capture started');
    }

    const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
    const _deviceType = isMobile ? '📱 Mobile' : '💻 Desktop';
    const _screenSize = `${window.innerWidth}x${window.innerHeight}`;

    // Only show minimal startup info
    debugLogger.info('🚀 Whisperz v2.1.1');

    if (import.meta.env.DEV) {
      debugLogger.info('info', '🔧 Development Mode - Debug tools available');
      debugLogger.info('info', '💡 Gun.js messaging system ready');
    }
  }, []);

  // Callback to receive loadFriends function from ChatView
  const handleInviteAccepted = (loadFriendsFunc) => {
    loadFriendsRef.current = loadFriendsFunc;
  };

  // Initialize services
  useEffect(() => {
    const initServices = async () => {
      try {
        // Add test helper to window for debugging
        window.testMessage = async (message = 'Test message from console!') => {
          const friends = await friendsService.getFriends();
          if (friends.length === 0) {
            return;
          }
          const friend = friends[0];
          await messageService.sendMessage(friend.publicKey, message);
        };

        window.getMessageHistory = async () => {
          const friends = await friendsService.getFriends();
          if (friends.length === 0) {
            return;
          }
          for (const friend of friends) {
            const _messages = await messageService.getConversationHistory(friend.conversationId);
          }
        };
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };

    initServices();
  }, []);

  // Initialize services and check for invite
  useEffect(() => {
    const init = async () => {
      try {
        // Check for invite code in URL (both hash and pathname)
        const hashPath = window.location.hash.slice(1);
        const pathParts = window.location.pathname.split('/');

        let code = null;

        // Check for invite in pathname format: /invite/CODE
        if (pathParts[1] === 'invite' && pathParts[2]) {
          code = pathParts[2];
        }
        // Check for old hash format: #/invite/CODE
        else if (hashPath.startsWith('/invite/')) {
          code = hashPath.replace('/invite/', '');
        }
        // Check for hash invite format: #invite/CODE
        else if (hashPath.startsWith('invite/')) {
          code = hashPath.replace('invite/', '');
        }

        // Check for admin setup parameter
        const urlParams = new URLSearchParams(window.location.search);
        const setupMode = urlParams.get('setup');

        // Enable registration for first user with ?setup=admin
        if (setupMode === 'admin' || setupMode === 'first') {
          setIsAdminSetup(true);
          // Clear the setup parameter from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (code) {
          setInviteCode(code);
          debugLogger.info('📧 Invite code detected:', code);
        }

        // Initialize Gun services once
        gunAuthService.initialize();
        friendsService.initialize();

        // Only initialize hybridGunService on desktop
        const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
        if (!isMobile) {
          hybridGunService.initialize();
        }

        // Check for existing session
        const currentUser = gunAuthService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);

          // Initialize Gun messaging for private chats
          try {
            debugLogger.debug('gun', '🚀 Initializing Gun messaging for existing session...');
            if (gunMessaging && gunMessaging.initialize) {
              await gunMessaging.initialize(currentUser.pub);
            }
          } catch (error) {
            console.error('❌ Failed to initialize messaging:', error);
          }

          // Initialize message service
          messageService.initialize();

          // If logged in with invite, process it
          if (code) {
            try {
              await friendsService.acceptInvite(code);
              alert('🎉 Friend added successfully! You can now chat securely.');

              // Refresh friends list to show new friend
              if (loadFriendsRef.current) {
                loadFriendsRef.current();
              }

              // Clear the invite from URL
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
              console.error('Failed to accept invite:', error);

              // Show user-friendly error messages
              if (error.message.includes('Invalid invite code')) {
                alert('❌ Invalid invite link. Please check the link or ask your friend to send a new one.');
              } else if (error.message.includes('already used')) {
                alert('❌ This invite has already been used. Ask your friend to send you a new invite.');
              } else if (error.message.includes('expired')) {
                alert('❌ This invite has expired. Ask your friend to send you a fresh invite.');
              } else if (error.message.includes('blocked')) {
                alert('❌ Cannot accept invite from blocked user.');
              } else {
                alert('❌ Failed to accept invite: ' + error.message);
              }
            }
          }
        }
      } catch (error) {
        setInitError(error.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Handle login/register
  const handleAuth = async (authUser, inviteCodeFromReg = null) => {
    // Clear any existing auth-related timeouts to prevent memory leaks
    if (timeoutManager && timeoutManager.clearAuthTimeout) {
      timeoutManager.clearAuthTimeout();
    }

    setUser(authUser);

    // Initialize Gun messaging
    try {
      if (gunMessaging && gunMessaging.initialize) {
        await gunMessaging.initialize(authUser.pub);
        debugLogger.debug('gun', '✅ Gun messaging initialized');
      }
    } catch (error) {
      console.error('❌ Failed to initialize messaging:', error);
    }

    // Initialize presence service and set online
    presenceService.initialize();
    hybridGunService.updatePresence('online');
    onlineStatusManager.updateOwnStatus();

    // Initialize message service
    messageService.initialize();

            // Handle invite if present (from registration or from URL)
        const codeToUse = inviteCodeFromReg || inviteCode;
        if (codeToUse) {
          // Small delay to ensure services are ready
          if (timeoutManager && timeoutManager.setAuthTimeout) {
            timeoutManager.setAuthTimeout(async () => {
              try {
                const result = await friendsService.acceptInvite(codeToUse);

                if (result.alreadyFriends) {
              // Don't show alert if already friends
                } else {
                  alert('🎉 Friend added successfully! You are now connected with ' + (result.friend?.nickname || 'your friend'));
                }

                // Refresh friends list
                if (typeof loadFriendsRef.current === 'function') {
                  loadFriendsRef.current();
                }
              } catch (error) {
                if (!error.message.includes('already used') || !error.message.includes(authUser.pub)) {
                  alert('❌ Failed to accept invite: ' + error.message);
                }
              } finally {
                setInviteCode(null);
                // Clear the invite from URL
                window.history.replaceState({}, document.title, window.location.pathname);
              }
        }, 4000);
      }
    }
  };

  // Handle logout
  const handleLogout = () => {
    // Clear any pending auth timeouts to prevent memory leaks
    if (timeoutManager && timeoutManager.clearAuthTimeout) {
      timeoutManager.clearAuthTimeout();
    }

    gunAuthService.logout();
    hybridGunService.cleanup();
    setUser(null);
  };

  // Render based on state
  if (loading) {
    return <LoadingScreen message="Initializing Whisperz..." />;
  }

  if (initError) {
    return <ErrorScreen error={initError} onRetry={() => window.location.reload()} />;
  }

  if (!user) {
    return (
      <AuthContainer
        onAuthSuccess={handleAuth}
        inviteCode={inviteCode}
        isAdminSetup={isAdminSetup}
      />
    );
  }

  return (
    <MainChatInterface
      user={user}
      onLogout={handleLogout}
      onInviteAccepted={handleInviteAccepted}
    />
  );
}

export default App;
