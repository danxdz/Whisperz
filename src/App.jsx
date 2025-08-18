import React, { useState, useEffect } from 'react';
import gunAuthService from './services/gunAuthService';
import webrtcService from './services/webrtcService';
import hybridGunService from './services/hybridGunService';
import friendsService from './services/friendsService';
import messageService from './services/messageService';
import friendRequestService from './services/friendRequestService';
import './index.css';

// Import modular components
import TabView, { TabPanel } from './components/TabView';
import ChatModule from './components/modules/ChatModule';
import FriendsModule from './components/modules/FriendsModule';
import DiscoverModule from './components/modules/DiscoverModule';
import SettingsModule from './components/modules/SettingsModule';
import LoginView from './components/LoginView';
import RegisterView from './components/RegisterView';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [inviteCode, setInviteCode] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [initError, setInitError] = useState(null);
  const [isAdminSetup, setIsAdminSetup] = useState(false);

  // Initialize services on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Check for invite code in URL
        const hashPath = window.location.hash.slice(1);
        const pathParts = window.location.pathname.split('/');
        
        let code = null;
        
        if (pathParts[1] === 'invite' && pathParts[2]) {
          code = pathParts[2];
        } else if (hashPath.startsWith('/invite/')) {
          code = hashPath.replace('/invite/', '');
        } else if (hashPath.startsWith('invite/')) {
          code = hashPath.replace('invite/', '');
        }
        
        if (code) {
          setInviteCode(code);
          setAuthMode('register');
        }
        
        // Check for admin setup parameter
        const urlParams = new URLSearchParams(window.location.search);
        const setupMode = urlParams.get('setup');
        
        // Enable registration for first user with ?setup=admin
        if (setupMode === 'admin' || setupMode === 'first') {
          setAuthMode('register');
          setIsAdminSetup(true);
          // Clear the setup parameter from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Initialize Gun
        gunAuthService.initialize();
        hybridGunService.initialize();
        friendsService.initialize();
        friendRequestService.initialize();

        // Check for existing session
        const currentUser = gunAuthService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          
          // Initialize WebRTC
          try {
            await webrtcService.initialize(currentUser.pub);
          } catch (error) {
            console.error('Failed to initialize WebRTC:', error);
          }

          // Initialize message service
          messageService.initialize();

          // If logged in with invite, process it
          if (code) {
            try {
              await friendsService.acceptInvite(code);
              alert('Friend added successfully!');
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
              console.error('Failed to accept invite:', error);
            }
          }

          // Update presence
          const peerId = webrtcService.getPeerId();
          hybridGunService.updatePresence('online', { peerId });
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setInitError(error.message);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      webrtcService.cleanup();
      hybridGunService.cleanup();
    };
  }, []);

  const handleAuth = async (authUser, inviteCodeFromReg = null) => {
    setUser(authUser);
    
    // Initialize WebRTC
    try {
      await webrtcService.initialize(authUser.pub);
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
    }

    // Initialize message service
    messageService.initialize();

    // Process invite if present
    const codeToProcess = inviteCodeFromReg || inviteCode;
    if (codeToProcess) {
      try {
        const result = await friendsService.acceptInvite(codeToProcess);
        if (result.alreadyFriends) {
          alert('You are already friends with this user!');
        } else {
          alert('Friend added successfully!');
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        setInviteCode(null);
      } catch (error) {
        if (!error.message.includes('already used')) {
          alert(`Failed to accept invite: ${error.message}`);
        }
      }
    }

    // Update presence
    const peerId = webrtcService.getPeerId();
    hybridGunService.updatePresence('online', { peerId });
  };

  const handleLogout = async () => {
    try {
      await gunAuthService.logout();
      webrtcService.cleanup();
      hybridGunService.cleanup();
      setUser(null);
      setAuthMode('login');
      setInviteCode(null);
      setSelectedFriend(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        color: '#00ff00',
        fontFamily: 'Consolas, Monaco, "Courier New", monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>WHISPERZ</div>
          <div style={{ fontSize: '14px', color: '#606060' }}>Initializing P2P network...</div>
        </div>
      </div>
    );
  }

  // Error screen
  if (initError) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        color: '#ff6b6b',
        fontFamily: 'Consolas, Monaco, "Courier New", monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>ERROR</div>
          <div style={{ fontSize: '14px', color: '#e0e0e0' }}>{initError}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#2a2a2a',
              border: '1px solid #ff6b6b',
              color: '#ff6b6b',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '14px'
            }}
          >
            [RELOAD]
          </button>
        </div>
      </div>
    );
  }

  // Auth screen
  if (!user) {
    return authMode === 'register' ? (
      <RegisterView
        onRegister={handleAuth}
        onSwitchToLogin={() => {
          setAuthMode('login');
          setIsAdminSetup(false);
        }}
        inviteCode={inviteCode}
        isAdminSetup={isAdminSetup}
      />
    ) : (
      <LoginView
        onLogin={handleAuth}
        onSwitchToRegister={() => setAuthMode('register')}
        inviteCode={inviteCode}
      />
    );
  }

  // Main app with tabs
  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <TabView defaultTab={0}>
        <TabPanel label="CHAT">
          <ChatModule 
            selectedFriend={selectedFriend}
            currentUser={user}
          />
        </TabPanel>
        
        <TabPanel label="FRIENDS">
          <FriendsModule
            currentUser={user}
            onFriendSelect={setSelectedFriend}
            selectedFriend={selectedFriend}
          />
        </TabPanel>
        
        <TabPanel label="DISCOVER">
          <DiscoverModule
            currentUser={user}
            onUserSelect={(user) => console.log('Selected user:', user)}
          />
        </TabPanel>
        
        <TabPanel label="SETTINGS">
          <SettingsModule
            currentUser={user}
            onLogout={handleLogout}
          />
        </TabPanel>
      </TabView>
    </div>
  );
}

// Wrap with ThemeProvider
function AppWithTheme() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

export default AppWithTheme;