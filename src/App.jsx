import { useState, useEffect, useRef } from 'react';
import gunAuthService from './services/gunAuthService';
import webrtcService from './services/webrtcService';
import gunOnlyP2P from './services/gunOnlyP2P';
import hybridGunService from './services/hybridGunService';
import friendsService from './services/friendsService';
import messageService from './services/messageService';
import p2pDebugger from './utils/p2pDebugger';
import onlineStatusManager from './utils/onlineStatusFix';
import presenceService from './services/presenceService';
import consoleCapture from './utils/consoleCapture';
import debugLogger from './utils/debugLogger';
import './index.css';
// import encryptionService from './services/encryptionService'; // Not used currently
import { ThemeToggle, SwipeableChat, InviteModal } from './components';
import { useTheme } from './contexts/ThemeContext';
import { useResponsive } from './hooks/useResponsive';
import { useConnectionState } from './hooks/useConnectionState';

// Create rate limiter for login attempts
const loginRateLimiter = (() => {
  const attempts = new Map();
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 60000; // 1 minute
  
  return {
    check: (username) => {
      const now = Date.now();
      const userAttempts = attempts.get(username) || [];
      const recentAttempts = userAttempts.filter(time => now - time < WINDOW_MS);
      
      if (recentAttempts.length >= MAX_ATTEMPTS) {
        const timeLeft = Math.ceil((WINDOW_MS - (now - recentAttempts[0])) / 1000);
        return { 
          allowed: false, 
          error: `Too many login attempts. Please wait ${timeLeft} seconds.`
        };
      }
      
      recentAttempts.push(now);
      attempts.set(username, recentAttempts);
      return { allowed: true };
    }
  };
})();

// Login Component - No registration option
function LoginView({ onLogin, inviteCode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFirstUserSetup, setShowFirstUserSetup] = useState(false);

  // Check if this might be the first user (no accounts exist)
  useEffect(() => {
    // Simple check - if in production and no stored auth, show setup hint
    if (window.location.hostname !== 'localhost' && !localStorage.getItem('gun/')) {
      setShowFirstUserSetup(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Input validation
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    // Check rate limiting
    const rateCheck = loginRateLimiter.check(username);
    if (!rateCheck.allowed) {
      setError(rateCheck.error);
      return;
    }

    setLoading(true);

    try {
      const result = await gunAuthService.login(username, password);
      if (result && result.user) {
        // Pass the invite code along with the user
        onLogin(result.user, inviteCode);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      // console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Whisperz Login</h1>
        {inviteCode && (
          <div className="info-message">
            You have an invite! Login to your account or create a new one to accept it.
          </div>
        )}
        {showFirstUserSetup && (
          <div className="info-message" style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0, 255, 0, 0.1)', border: '1px solid #00ff00', borderRadius: '4px' }}>
            <p style={{ margin: '0 0 10px 0' }}>👋 <strong>Welcome to Whisperz!</strong></p>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>First time? Create your admin account:</p>
            
            {/* Mobile-friendly setup */}
            <div style={{ textAlign: 'center', margin: '15px 0' }}>
              <a 
                href="?setup=admin"
                style={{ 
                  display: 'inline-block',
                  padding: '12px 24px', 
                  background: '#00ff00', 
                  color: '#000', 
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                📱 Create First Account (Mobile Friendly)
              </a>
            </div>
            
            <p style={{ margin: '10px 0 0 0', fontSize: '12px', opacity: '0.8', textAlign: 'center' }}>
              Or manually go to: {window.location.origin}?setup=admin
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
            autoComplete="username"
            maxLength={20}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="invite-only-notice">
          This is an invite-only chat. You need an invite link from an existing member to join.
        </p>
      </div>
    </div>
  );
}

// Register View Component
const RegisterView = ({ onRegister, onSwitchToLogin, inviteCode, isAdminSetup }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState(null);

  // Parse invite data - simplified to just use the code directly
  useEffect(() => {
    if (inviteCode) {
      // The invite code is now just a simple string, not base64 encoded
      // We'll fetch the actual invite data from Gun when accepting
      setInviteData({
        code: inviteCode,
        message: 'You have a valid invite code'
      });
    }
  }, [inviteCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Pass the invite code along with registration
      const result = await gunAuthService.register(username, password, nickname || username);
      // Pass both user and invite code to parent
      onRegister(result.user, inviteCode);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Show invite required message only if not admin setup
  if (!isAdminSetup && !inviteCode) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1>Invite Required</h1>
          <p>Registration requires a valid invite link from an existing member.</p>
          <button onClick={onSwitchToLogin}>Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>{isAdminSetup ? 'Create Admin Account' : 'Join Whisperz'}</h1>
        {isAdminSetup && (
          <div className="info-message" style={{ marginBottom: '20px', padding: '10px', background: 'rgba(0, 255, 0, 0.1)', border: '1px solid #00ff00', borderRadius: '4px' }}>
            <p style={{ margin: 0 }}>🔐 You're creating the first admin account for Whisperz</p>
          </div>
        )}
        {inviteData && (
          <div className="invite-info">
            <p>✅ {inviteData.message}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Code: {inviteData.code}
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
            maxLength={20}
          />
          <input
            type="password"
            placeholder="Choose a password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Your nickname (optional)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={loading}
            maxLength={30}
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Join Whisperz'}
          </button>
        </form>
        <p>
          Already have an account?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }}>
            Login
          </a>
        </p>
      </div>
    </div>
  );
}

// DevTools component is now handled by DevToolsWrapper imported from components

// ConnectionStatus component is now imported from components/ConnectionStatus.jsx

// Main Chat Component with proper nickname display
function ChatView({ user, onLogout, onInviteAccepted }) {
  const { colors } = useTheme();
  const screen = useResponsive();
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineStatus, setOnlineStatus] = useState({});
  const [typingStatus, setTypingStatus] = useState(new Map());
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [userNickname, setUserNickname] = useState('');
  // const [friendsLoading, setFriendsLoading] = useState(true); // Not used currently
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Connection state for selected friend
  const { connectionState, attemptWebRTCConnection } = useConnectionState(
    selectedFriend?.publicKey
  );

  // Load user nickname on mount
  useEffect(() => {
    const loadUserNickname = async () => {
      try {
        const profile = await gunAuthService.getUserProfile();
        if (profile?.nickname) {
          setUserNickname(profile.nickname);
        } else if (user?.alias) {
          setUserNickname(user.alias);
        } else {
          setUserNickname('User');
        }
      } catch (error) {
        // console.error('Error loading user nickname:', error);
        setUserNickname(user?.alias || 'User');
      }
    };
    loadUserNickname();
  }, [user]);

  // Load friends function (moved outside useEffect so it can be called manually)
  const loadFriends = async () => {
    try {
      // setFriendsLoading(true);
      // console.log('📋 Loading friends...');
      const currentUser = gunAuthService.getCurrentUser();
      // console.log('👤 Current user:', currentUser);
      
      const friendList = await friendsService.getFriends();
      // console.log('👥 Friends loaded:', friendList);
      setFriends(friendList);

      // Subscribe to friend updates
      friendsService.subscribeToFriends((event, data) => {
        // console.log('🔔 Friend event:', event, data);
        if (event === 'added' || event === 'updated') {
          setFriends(prev => {
            const updated = prev.filter(f => f.publicKey !== data.publicKey);
            return [...updated, data];
          });
        } else if (event === 'removed') {
          setFriends(prev => prev.filter(f => f.publicKey !== data.publicKey));
        }
      });

      // Initial presence check will be handled by the useEffect subscription
    } catch (error) {
      // console.error('❌ Failed to load friends:', error);
    } finally {
      // setFriendsLoading(false);
    }
  };

  // Pass loadFriends to parent through callback
  useEffect(() => {
    if (onInviteAccepted) {
      onInviteAccepted(loadFriends);
    }
  }, [onInviteAccepted]);

  // Initialize and load friends
  useEffect(() => {
    loadFriends();

    // Ensure WebRTC is initialized
    const initializeWebRTC = async () => {
      if (!webrtcService.isReady() && user?.pub) {
        try {
          debugLogger.info('webrtc', '🔄 Re-initializing WebRTC in ChatView...');
          await webrtcService.initialize(user.pub);
          // WebRTC ready
          
          // Gun P2P already initialized in main flow
        } catch (error) {
          debugLogger.error('❌ Failed to initialize WebRTC in ChatView:', error);
        }
      }
      
      // Disabled - using Gun.js subscriptions instead
      // onlineStatusManager.startMonitoring();
      
      // Subscribe to status changes
      // const unsubscribe = onlineStatusManager.addListener((statuses) => {
      //   setOnlineStatus(statuses);
      // });
      
      // Update own presence with peer ID
      const peerId = webrtcService.getPeerId();
      debugLogger.info('gun', '📍 Updating presence with peer ID:', peerId);
      hybridGunService.updatePresence('online', { peerId });
      
      // return () => {
      //   unsubscribe();
      // };
    };
    
    // Initial update
    initializeWebRTC();
    
    // Update again after a short delay to ensure everything is ready
    setTimeout(initializeWebRTC, 2000);

    // Handle page visibility
    const handleVisibility = () => {
      if (document.hidden) {
        hybridGunService.updatePresence('away');
      } else {
        hybridGunService.updatePresence('online', { peerId: webrtcService.getPeerId() });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Handle beforeunload
    const handleUnload = () => {
      hybridGunService.updatePresence('offline');
    };
    window.addEventListener('beforeunload', handleUnload);

    // Load friends once - no need for periodic refresh
    // Presence is already handled by presenceService on login/visibility
    // const refreshInterval = setInterval(() => {
    //   loadFriends();
    // }, 10000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      // clearInterval(refreshInterval); // Removed - no longer needed
    };
  }, []);

  // Subscribe to friends' presence updates in real-time
  useEffect(() => {
    if (!friends || friends.length === 0 || !gunAuthService.gun) return;

    const subscriptions = [];
    // Setting up presence subscriptions for friends
    
    // Don't clear existing data when re-subscribing
    // This preserves lastSeen values during re-renders
    
    // Subscribe to each friend's presence via Gun
    friends.forEach(friend => {
      const sub = gunAuthService.gun
        .get('presence')
        .get(friend.publicKey)
        .on((data, key) => {
          if (data && typeof data === 'object' && data.status) {
            // Use the most recent timestamp
            const lastSeenValue = data.lastSeen || data.timestamp || Date.now();
            // Consider online if status is 'online' AND last seen within 5 minutes
            const isOnline = data.status === 'online' && 
                           lastSeenValue && 
                           (Date.now() - lastSeenValue) < 300000; // Within 5 minutes
            
            // Update state - this will trigger re-render
            setOnlineStatus(prev => {
              const prevStatus = prev[friend.publicKey]?.online;
              const prevLastSeen = prev[friend.publicKey]?.lastSeen;
              
              // Update if status changed OR if we have a newer lastSeen value
              if (prevStatus !== isOnline || prevLastSeen !== lastSeenValue) {
                if (prevStatus !== isOnline) {
                  debugLogger.info('gun', `Friend ${friend.nickname} is now ${isOnline ? '🟢 ONLINE' : '⚫ OFFLINE'}`);
                }
                debugLogger.debug('gun', `Updating ${friend.nickname} status:`, {
                  online: isOnline,
                  lastSeen: lastSeenValue,
                  status: data.status
                });
                return {
                  ...prev,
                  [friend.publicKey]: { 
                    online: isOnline,
                    // Always keep lastSeen value for when they go offline
                    lastSeen: lastSeenValue,
                    status: data.status 
                  }
                };
              }
              // Even if no change, preserve existing data
              if (!prev[friend.publicKey]) {
                return {
                  ...prev,
                  [friend.publicKey]: { 
                    online: isOnline,
                    lastSeen: lastSeenValue,
                    status: data.status 
                  }
                };
              }
              return prev;
            });
          }
        });
      
      subscriptions.push(sub);
    });

    // Cleanup Gun subscriptions
    return () => {
      // Cleaning up presence subscriptions
      subscriptions.forEach(sub => {
        if (sub && sub.off) sub.off();
      });
    };
  }, [JSON.stringify(friends.map(f => f.publicKey).sort())]); // Only re-subscribe when friend list actually changes

  // Load messages when friend is selected
  useEffect(() => {
    if (!selectedFriend || !selectedFriend.conversationId) {
      // No friend selected or missing conversationId
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      debugLogger.info('gun', '📋 Loading messages for:', selectedFriend.nickname || 'Unknown', 'ID:', selectedFriend.conversationId);
      try {
        const history = await messageService.getConversationHistory(selectedFriend.conversationId);
        const safeHistory = Array.isArray(history) ? history : [];
        debugLogger.info('gun', `📜 Loaded ${safeHistory.length} messages`);
        setMessages(safeHistory);
        messageService.markAsRead(selectedFriend.conversationId);
      } catch (error) {
        debugLogger.error('Failed to load messages:', error);
        setMessages([]); // Set empty array to prevent crash
      }
    };

    loadMessages();

    // Messages are received via subscriptions - no need for polling
    // const refreshInterval = setInterval(loadMessages, 5000);

    // Subscribe to new messages
    const unsubscribe = selectedFriend.conversationId ? messageService.subscribeToConversation(
      selectedFriend.conversationId,
      (message) => {
        // console.log('📨 New message received:', message);
        setMessages(prev => {
          // Ensure prev is an array
          const currentMessages = prev || [];
          // Check if message already exists to avoid duplicates
          const exists = currentMessages.some(m => m && (m.id === message.id || 
            (m.timestamp === message.timestamp && m.content === message.content)));
          if (!exists) {
            return [...currentMessages, message].sort((a, b) => a.timestamp - b.timestamp);
          }
          return currentMessages;
        });
        messageService.markAsRead(selectedFriend.conversationId);
      }
    ) : null;

    // Subscribe to typing indicators
    const unsubscribeTyping = messageService.subscribeToTyping(
      selectedFriend.conversationId,
      (userPub, isTyping) => {
        if (userPub !== user.pub) {
          setTypingStatus(prev => {
            const updated = new Map(prev);
            if (isTyping) {
              updated.set(userPub, true);
            } else {
              updated.delete(userPub);
            }
            return updated;
          });
        }
      }
    );

    return () => {
      // clearInterval(refreshInterval); // Removed
      // unsubscribe(); // Disabled - was interfering with Gun subscriptions
      unsubscribeTyping();
    };
  }, [selectedFriend, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message send with sanitization
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedFriend) return;

    // Sanitize input
    const sanitizedMessage = newMessage.trim().slice(0, 1000);

    try {
      // Attempt WebRTC connection if not connected
      if (connectionState.status === 'gun' && connectionState.isOnline) {
        await attemptWebRTCConnection();
      }
      
      await messageService.sendMessage(selectedFriend.publicKey, sanitizedMessage);
      setNewMessage('');
    } catch (error) {
      // console.error('Failed to send message:', error);
      alert('Failed to send message: ' + error.message);
    }
  };

  // Handle typing
  const handleTyping = () => {
    if (!selectedFriend) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    messageService.sendTypingIndicator(selectedFriend.conversationId, true);

    // Stop typing after pause
    typingTimeoutRef.current = setTimeout(() => {
      messageService.sendTypingIndicator(selectedFriend.conversationId, false);
    }, 2000);
  };

  // Generate invite link
  const handleGenerateInvite = async () => {
    try {
      const result = await friendsService.generateInvite();
      setInviteLink(result.inviteLink);
      setShowInvite(true);
    } catch (error) {
      // console.error('Failed to generate invite:', error);
      alert('Failed to generate invite link: ' + error.message);
    }
  };

  // Copy invite link
  // const handleCopyInvite = () => {
  //   navigator.clipboard.writeText(inviteLink);
  //   alert('Invite link copied to clipboard!');
  // };

  // Keyboard shortcuts are now handled by DevToolsWrapper

  // Escape HTML for safe rendering
  const escapeHtml = (text) => {
    if (!text) return '';
    const textStr = String(text);
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return textStr.replace(/[&<>"'/]/g, char => map[char]);
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    <SwipeableChat
      friends={friends}
      selectedFriend={selectedFriend}
      onSelectFriend={setSelectedFriend}
      currentUser={user}
      onFriendsUpdate={loadFriends}
      onGenerateInvite={handleGenerateInvite}
      userNickname={userNickname}
      onLogout={onLogout}
      onlineStatus={onlineStatus}
    >
      {/* Chat Area */}
            <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative'
      }}>
        {selectedFriend ? (
          <>
            <div style={{ 
              padding: screen.isTiny ? '6px 8px' : screen.isMobile ? '8px 12px' : '16px 20px',
              background: colors.bgCard,
              borderBottom: `1px solid ${colors.borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              minHeight: screen.isTiny ? '36px' : '48px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: screen.isTiny ? '4px' : '8px' }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: screen.isTiny ? '13px' : screen.isMobile ? '15px' : '18px', 
                  fontWeight: '600', 
                  color: colors.textPrimary,
                  maxWidth: screen.isTiny ? '100px' : screen.isMobile ? '150px' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {escapeHtml(selectedFriend.nickname || 'Unknown')}
                </h3>
                {/* Connection Status & P2P Button */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {/* P2P Connect Button */}
                  <button
                    onClick={() => attemptWebRTCConnection()}
                    style={{
                      padding: screen.isTiny ? '4px 8px' : '6px 10px',
                      background: 'rgba(67, 231, 123, 0.2)',
                      border: '1px solid #43e97b',
                      borderRadius: '6px',
                      color: '#43e97b',
                      fontSize: screen.isTiny ? '10px' : '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Establish direct P2P connection"
                  >
                    🔗 P2P
                  </button>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: screen.isTiny ? '2px 4px' : '2px 6px',
                    background: colors.bgTertiary,
                    borderRadius: '10px',
                    fontSize: screen.isTiny ? '9px' : '10px'
                  }}>
                    <span style={{
                      width: screen.isTiny ? '6px' : '7px',
                      height: screen.isTiny ? '6px' : '7px',
                      borderRadius: '50%',
                    background: connectionState.status === 'webrtc' ? colors.success :
                               connectionState.status === 'gun' ? colors.warning :
                               connectionState.status === 'connecting' ? colors.primary :
                               colors.textMuted,
                    display: 'inline-block',
                    animation: connectionState.status === 'connecting' ? 'pulse 1s infinite' : 'none'
                  }} />
                  <span style={{ 
                    color: colors.textSecondary,
                    textTransform: 'uppercase',
                    fontWeight: '500'
                  }}>
                    {connectionState.status === 'webrtc' ? 'P2P' :
                     connectionState.status === 'gun' ? 'GUN' :
                     connectionState.status === 'connecting' ? '...' :
                     'OFF'}
                  </span>
                  {connectionState.latency && (
                    <span style={{ color: colors.textMuted }}>
                      {connectionState.latency}ms
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>

            <div style={{ 
              flex: 1, 
              overflowY: 'auto',
              padding: screen.isTiny ? '4px 6px' : screen.isMobile ? '8px' : '20px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {(messages || []).map((msg, index) => msg && (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: msg?.from === user.pub ? 'flex-end' : 'flex-start',
                    marginBottom: screen.isTiny ? '3px' : screen.isMobile ? '6px' : '12px'
                  }}
                >
                  <div style={{
                    maxWidth: screen.isTiny ? '90%' : screen.isMobile ? '85%' : '70%',
                    padding: screen.isTiny ? '4px 8px' : screen.isMobile ? '6px 10px' : '10px 14px',
                    borderRadius: screen.isTiny ? '8px' : '12px',
                    background: msg?.from === user.pub 
                      ? colors.messageSent
                      : colors.messageReceived,
                    color: msg?.from === user.pub ? '#fff' : colors.textPrimary
                  }}>
                    <div style={{ 
                      fontSize: screen.isTiny ? '12px' : screen.isMobile ? '13px' : '14px',
                      wordBreak: 'break-word'
                    }}>
                      {escapeHtml(msg.content || '')}
                    </div>
                    <div style={{ 
                      fontSize: screen.isTiny ? '8px' : screen.isMobile ? '9px' : '11px', 
                      opacity: 0.7,
                      marginTop: '1px',
                      color: msg?.from === user.pub ? 'rgba(255,255,255,0.8)' : colors.textMuted,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      justifyContent: msg?.from === user.pub ? 'flex-end' : 'flex-start'
                    }}>
                      <span>{msg?.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : 'Unknown'}</span>
                      {msg.deliveryMethod && (
                        <span style={{
                          padding: '1px 3px',
                          background: msg.deliveryMethod === 'webrtc' ? 'rgba(67, 233, 123, 0.2)' :
                                     msg.deliveryMethod === 'gun' ? 'rgba(255, 193, 7, 0.2)' :
                                     'transparent',
                          borderRadius: '3px',
                          fontSize: screen.isTiny ? '7px' : '8px',
                          fontWeight: 'bold',
                          color: msg.deliveryMethod === 'webrtc' ? colors.success :
                                msg.deliveryMethod === 'gun' ? colors.warning :
                                colors.textMuted
                        }}>
                          {msg.deliveryMethod === 'webrtc' ? 'P2P' :
                           msg.deliveryMethod === 'gun' ? 'GUN' :
                           'LOCAL'}
                        </span>
                      )}
                      {msg?.from === user.pub && (
                        <span style={{ marginLeft: '2px' }}>
                          {msg.delivered ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {typingStatus.size > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '14px',
                    fontStyle: 'italic'
                  }}>
                    {escapeHtml(selectedFriend?.nickname || 'Friend')} is typing...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={{
              padding: screen.isTiny ? '6px' : screen.isMobile ? '8px' : '12px 16px',
              background: colors.bgCard,
              borderTop: `1px solid ${colors.borderColor}`,
              display: 'flex',
              gap: screen.isTiny ? '4px' : '8px'
            }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyUp={handleTyping}
                placeholder="Message..."
                maxLength={1000}
                style={{
                  flex: 1,
                  padding: screen.isTiny ? '6px 10px' : screen.isMobile ? '8px 12px' : '10px 14px',
                  background: colors.bgTertiary,
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: screen.isTiny ? '16px' : '8px',
                  color: colors.textPrimary,
                  fontSize: screen.isTiny ? '12px' : screen.isMobile ? '13px' : '14px',
                  outline: 'none'
                }}
              />
              <button 
                type="submit"
                style={{
                  padding: screen.isTiny ? '6px 12px' : screen.isMobile ? '8px 16px' : '10px 20px',
                  background: newMessage.trim() 
                    ? colors.primary
                    : colors.bgTertiary,
                  border: 'none',
                  borderRadius: screen.isTiny ? '16px' : '8px',
                  color: newMessage.trim() ? '#fff' : colors.textMuted,
                  fontSize: screen.isTiny ? '16px' : screen.isMobile ? '13px' : '14px',
                  cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                  opacity: newMessage.trim() ? 1 : 0.5,
                  minWidth: screen.isTiny ? '36px' : 'auto'
                }}
                disabled={!newMessage.trim()}
              >
                {screen.isTiny ? '➤' : 'Send'}
              </button>
            </form>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: colors.textMuted
          }}>
            <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
              <ThemeToggle />
            </div>
            <div style={{ position: 'absolute', bottom: '20px', left: '20px', fontSize: '10px', color: colors.textMuted, opacity: 0.5 }}>
              v2.1.0
            </div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <h3 style={{ margin: '0 0 8px 0', color: colors.textPrimary, fontSize: '24px', fontWeight: '600' }}>
              Welcome to Whisperz
            </h3>
            <p style={{ margin: 0, fontSize: '16px' }}>Select a friend to start chatting</p>
          </div>
        )}
      </div>
    </SwipeableChat>

    {/* Modern Invite Modal */}
    <InviteModal
      isOpen={showInvite}
      onClose={() => setShowInvite(false)}
      inviteLink={inviteLink}
    />
    
    {/* Dev Tools handled by SwipeableChat */}
    </>
  );
}

// Main App Component - Fixed invite handling
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [inviteCode, setInviteCode] = useState(null);
  const [initError, setInitError] = useState(null);
  const [isAdminSetup, setIsAdminSetup] = useState(false);
  const loadFriendsRef = useRef(null);

  // Version indicator for deployment verification
  useEffect(() => {
    // Start console capture immediately
    if (!consoleCapture.isCapturing) {
      consoleCapture.start();
      debugLogger.info('info', '📹 Console capture started');
    }
    
    const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
    const deviceType = isMobile ? '📱 Mobile' : '💻 Desktop';
    const screenSize = `${window.innerWidth}x${window.innerHeight}`;
    
    // Only show minimal startup info
    console.log('%c🚀 Whisperz v2.1.1', 'color: #43e97b; font-size: 14px; font-weight: bold');
    
    if (import.meta.env.DEV) {
      debugLogger.info('info', '🔧 Development Mode - Debug tools available');
      debugLogger.info('info', '💡 Type: p2pDebug.diagnose() for P2P diagnostics');
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
        await hybridGunService.initialize();
        await friendsService.initialize();
        
        // Start P2P monitoring in development
        if (import.meta.env.DEV) {
          p2pDebugger.startMonitoring();
          console.log('🔍 P2P debugging enabled');
        }
        
        // Add test helper to window for debugging
        window.testMessage = async (message = 'Test message from console!') => {
          const friends = await friendsService.getFriends();
          if (friends.length === 0) {
            // console.log('❌ No friends to send message to');
            return;
          }
          const friend = friends[0];
          // console.log(`📤 Sending test message to ${friend.nickname}...`);
          await messageService.sendMessage(friend.publicKey, message);
          // console.log('✅ Message sent!');
        };
        
        window.getMessageHistory = async () => {
          const friends = await friendsService.getFriends();
          if (friends.length === 0) {
            // console.log('❌ No friends found');
            return;
          }
          for (const friend of friends) {
            const messages = await messageService.getMessages(friend.conversationId);
            // console.log(`📜 Messages with ${friend.nickname}:`, messages);
          }
        };
        
        window.testWebRTC = async () => {
          const friends = await friendsService.getFriends();
          if (friends.length === 0) {
            // console.log('❌ No friends to test with');
            return;
          }
          
          for (const friend of friends) {
            const presence = await friendsService.getFriendPresence(friend.publicKey);
            // console.log(`👤 ${friend.nickname} presence:`, presence);
            
            if (presence.isOnline && presence.peerId) {
              // console.log(`🔄 Testing WebRTC connection to ${friend.nickname}...`);
              try {
                const conn = await webrtcService.connectToPeer(presence.peerId);
                // console.log(`✅ Connected to ${friend.nickname}!`, conn);
                
                // Test sending a ping
                await webrtcService.sendMessage(presence.peerId, {
                  type: 'ping',
                  timestamp: Date.now()
                });
                // console.log(`📡 Ping sent to ${friend.nickname}`);
              } catch (error) {
                // console.error(`❌ Failed to connect to ${friend.nickname}:`, error);
              }
            } else {
              // console.log(`⚫ ${friend.nickname} is offline`);
            }
          }
        };
        
        // console.log('✅ Services initialized');
        // console.log('💡 Test helpers available:');
        // console.log('   - window.testMessage("Hello!") - Send test message');
        // console.log('   - window.getMessageHistory() - View all messages');
        // console.log('   - window.testWebRTC() - Test WebRTC connections');
      } catch (error) {
        // console.error('Failed to initialize services:', error);
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
          setAuthMode('register');
          setIsAdminSetup(true);
          // Clear the setup parameter from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (code) {
          setInviteCode(code);
          // If there's an invite, show register page by default
          // But user can switch to login if they already have an account
          setAuthMode('register');
          console.log('📧 Invite code detected:', code);
        }

        // Initialize Gun
        gunAuthService.initialize();
        hybridGunService.initialize();

        // Check for existing session
        const currentUser = gunAuthService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          
          // Initialize WebRTC for private chats
          try {
            console.log('🚀 Initializing WebRTC for existing session...');
            await webrtcService.initialize(currentUser.pub);
            // WebRTC initialized
            
            // Also initialize Gun P2P as fallback
            await gunOnlyP2P.initialize(currentUser.pub);
            // Gun P2P initialized as fallback
          } catch (error) {
            debugLogger.error('❌ Failed to initialize P2P:', error);
          }

          // Initialize message service
          messageService.initialize();

          // If logged in with invite, process it
          if (code) {
            try {
              await friendsService.acceptInvite(code);
              alert('Friend added successfully!');
              // Clear the invite from URL
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
              // console.error('Failed to accept invite:', error);
            }
          }
        }
      } catch (error) {
        // console.error('Initialization error:', error);
        setInitError(error.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Handle login/register
  const handleAuth = async (authUser, inviteCodeFromReg = null) => {
    // console.log('🔐 Authentication successful:', authUser);
    setUser(authUser);
    
    // Initialize WebRTC for private chats
    try {
      console.log('🚀 Initializing WebRTC after login...');
      await webrtcService.initialize(authUser.pub);
      console.log('✅ WebRTC initialized with peer ID:', webrtcService.getPeerId());
      
      // Also initialize Gun P2P as fallback
      await gunOnlyP2P.initialize(authUser.pub);
      console.log('✅ Gun P2P initialized as fallback');
    } catch (error) {
      console.error('❌ Failed to initialize P2P:', error);
    }
    
    // Initialize presence service and set online
    presenceService.initialize();
    
    // Also update with old methods for compatibility
    const peerId = webrtcService.getPeerId();
    hybridGunService.updatePresence('online', { peerId });
    onlineStatusManager.updateOwnStatus();

    // Initialize message service
    messageService.initialize();
    // console.log('✅ Message service initialized');

    // Handle invite if present (from registration or from URL)
    const codeToUse = inviteCodeFromReg || inviteCode;
    if (codeToUse) {
      // console.log('🎫 Processing invite after auth...');
      // console.log('📦 Invite code:', codeToUse);
      
      // Small delay to ensure services are ready
      setTimeout(async () => {
        try {
          const result = await friendsService.acceptInvite(codeToUse);
          // console.log('✅ Invite acceptance result:', result);
          
          if (result.alreadyFriends) {
            // console.log('Already friends with this user');
            // Don't show alert if already friends, just continue
          } else {
            alert('Friend added successfully! You are now connected with ' + (result.friend?.nickname || 'your friend'));
          }
          
          // Refresh friends list
          if (typeof loadFriendsRef.current === 'function') {
            loadFriendsRef.current();
          }
        } catch (error) {
          // console.error('❌ Failed to accept invite:', error);
          // Don't show error for "already used" if it was just used by this user
          if (!error.message.includes('already used') || !error.message.includes(authUser.pub)) {
            alert('Note: ' + error.message);
          }
        }
        setInviteCode(null);
        // Clear the invite from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 4000); // 4 second delay to ensure Gun.js is ready for new users
    }
  };

  // Handle logout
  const handleLogout = () => {
    gunAuthService.logout();
    webrtcService.destroy();
    hybridGunService.cleanup();
    setUser(null);
    setAuthMode('login');
    setInviteCode(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Initializing Whisperz...</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="loading-container">
        <div className="error">
          <h2>Initialization Error</h2>
          <p>{initError}</p>
          <p>Please check your configuration and refresh the page.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Show register page if there's an invite code, otherwise show login
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

  return <ChatView user={user} onLogout={handleLogout} onInviteAccepted={handleInviteAccepted} />;
}

export default App;
