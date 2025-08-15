import { useState, useEffect, useCallback, useRef } from 'react';
import gunAuthService from './services/gunAuthService';
import webrtcService from './services/webrtcService';
import hybridGunService from './services/hybridGunService';
import friendsService from './services/friendsService';
import messageService from './services/messageService';
import './index.css';
import encryptionService from './services/encryptionService';

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
        onLogin(result.user);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
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

  // Parse invite data
  useEffect(() => {
    if (inviteCode) {
      try {
        // Use encryptionService for proper base64url decoding
        const invitePayload = JSON.parse(encryptionService.base64UrlDecode(inviteCode));
        
        // New format just has inviteId and senderKey
        // We'll show basic info and the actual friend data will be loaded when accepting
        if (invitePayload.inviteId && invitePayload.senderKey) {
          setInviteData({
            inviteId: invitePayload.inviteId,
            senderKey: invitePayload.senderKey,
            // We can't show nickname until we fetch from Gun.js
            nickname: 'Friend' 
          });
        } else {
          // Try old format for backward compatibility
          setInviteData(invitePayload);
        }
      } catch (err) {
        console.error('Failed to parse invite:', err);
        setError('Invalid invite link format');
      }
    }
  }, [inviteCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only require invite if not admin setup
    if (!isAdminSetup && !inviteCode) {
      setError('Registration requires a valid invite');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await gunAuthService.register(username, password, nickname || username);
      onRegister(result.user);
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
            <p>You've been invited by <strong>{inviteData.nickname}</strong></p>
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

// DevTools Component (unchanged)
function DevTools({ isVisible, onClose }) {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (!isVisible) return;

    // Load stats
    const loadStats = async () => {
      const dbStats = await hybridGunService.getDatabaseStats();
      setStats(dbStats);
    };
    loadStats();
    const interval = setInterval(loadStats, 5000);

    // Capture console logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const captureLog = (type, ...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev.slice(-50), {
        type,
        message,
        timestamp: new Date().toLocaleTimeString()
      }]);
    };

    console.log = (...args) => { originalLog(...args); captureLog('log', ...args); };
    console.error = (...args) => { originalError(...args); captureLog('error', ...args); };
    console.warn = (...args) => { originalWarn(...args); captureLog('warn', ...args); };

    return () => {
      clearInterval(interval);
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [isVisible]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isVisible) return null;

  const handleClearData = async () => {
    if (confirm('This will delete all your data. Are you sure?')) {
      await hybridGunService.clearAllData();
      await friendsService.clearAllFriends();
      window.location.reload();
    }
  };

  const handleExportLogs = () => {
    const logText = logs.map(l => `[${l.timestamp}] ${l.type.toUpperCase()}: ${l.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-logs-${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="devtools">
      <div className="devtools-header">
        <h3>Developer Tools</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      <div className="devtools-section">
        <h4>Database Stats</h4>
        {stats && (
          <div className="stats-grid">
            <div>Conversations: {stats.conversations}</div>
            <div>Messages: {stats.messages}</div>
            <div>Offline Messages: {stats.offlineMessages}</div>
            <div>Friends: {stats.friends}</div>
          </div>
        )}
      </div>

      <div className="devtools-section">
        <h4>Actions</h4>
        <div className="devtools-actions">
          <button onClick={handleClearData} className="danger-btn">Clear All Data</button>
          <button onClick={handleExportLogs}>Export Logs</button>
          <button onClick={() => setLogs([])}>Clear Console</button>
        </div>
      </div>

      <div className="devtools-section">
        <h4>Console Output</h4>
        <div className="console-output">
          {logs.map((log, i) => (
            <div key={i} className={`log-entry log-${log.type}`}>
              <span className="log-time">[{log.timestamp}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}

// Connection Status Component (improved positioning)
const ConnectionStatus = () => {
  const [gunStatus, setGunStatus] = useState('connecting');
  const [peerStatus, setPeerStatus] = useState('connecting');
  const [relayStatus, setRelayStatus] = useState('checking...');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  useEffect(() => {
    // Monitor Gun.js connection
    const checkGunConnection = () => {
      try {
        const gun = gunAuthService.gun;
        if (gun && gun._ && gun._.opt && gun._.opt.peers) {
          const peers = Object.keys(gun._.opt.peers);
          setGunStatus(peers.length > 0 ? 'connected' : 'disconnected');
          setRelayStatus(`${peers.length} relay${peers.length !== 1 ? 's' : ''}`);
        } else {
          setGunStatus('initializing');
          setRelayStatus('setting up...');
        }
      } catch (error) {
        console.error('Gun status check error:', error);
        setGunStatus('error');
        setRelayStatus('error');
      }
    };
    
    // Monitor PeerJS connection
    const checkPeerConnection = () => {
      try {
        const peer = webrtcService.peer;
        if (peer) {
          if (peer.disconnected) {
            setPeerStatus('disconnected');
          } else if (peer.destroyed) {
            setPeerStatus('destroyed');
          } else {
            setPeerStatus('connected');
          }
        } else {
          setPeerStatus('initializing');
        }
      } catch (error) {
        console.error('Peer status check error:', error);
        setPeerStatus('error');
      }
    };
    
    // Check connections periodically
    checkGunConnection();
    checkPeerConnection();
    const interval = setInterval(() => {
      checkGunConnection();
      checkPeerConnection();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'connected': return '#00ff00';
      case 'connecting': case 'initializing': return '#ffff00';
      case 'disconnected': case 'destroyed': case 'error': return '#ff0000';
      default: return '#808080';
    }
  };
  
  if (isCollapsed) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid #00ff00',
        borderRadius: '4px',
        padding: '5px 10px',
        fontSize: '12px',
        zIndex: 999,
        cursor: 'pointer'
      }} onClick={() => setIsCollapsed(false)}>
        <span>📡 Status</span>
      </div>
    );
  }
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.9)',
      border: '1px solid #00ff00',
      borderRadius: '4px',
      padding: '10px',
      fontSize: '12px',
      zIndex: 999,
      minWidth: '200px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '5px'
      }}>
        <span style={{ fontWeight: 'bold' }}>Connection Status</span>
        <button 
          onClick={() => setIsCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#00ff00',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            marginLeft: '10px'
          }}
        >−</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getStatusColor(gunStatus),
          marginRight: '8px',
          display: 'inline-block'
        }}></span>
        <span>Gun.js: {gunStatus} ({relayStatus})</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getStatusColor(peerStatus),
          marginRight: '8px',
          display: 'inline-block'
        }}></span>
        <span>WebRTC: {peerStatus}</span>
      </div>
      {(gunStatus === 'disconnected' || gunStatus === 'error') && (
        <div style={{ marginTop: '10px', fontSize: '11px', color: '#ff0000' }}>
          ⚠️ Database connection failed. Check network.
        </div>
      )}
    </div>
  );
};

// Main Chat Component with proper nickname display
function ChatView({ user, onLogout, onInviteAccepted }) {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineStatus, setOnlineStatus] = useState(new Map());
  const [typingStatus, setTypingStatus] = useState(new Map());
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [showDevTools, setShowDevTools] = useState(false);
  const [userNickname, setUserNickname] = useState('');
  const [friendsLoading, setFriendsLoading] = useState(true);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

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
        console.error('Error loading user nickname:', error);
        setUserNickname(user?.alias || 'User');
      }
    };
    loadUserNickname();
  }, [user]);

  // Load friends function (moved outside useEffect so it can be called manually)
  const loadFriends = async () => {
    try {
      setFriendsLoading(true);
      console.log('📋 Loading friends...');
      const currentUser = gunAuthService.getCurrentUser();
      console.log('👤 Current user:', currentUser);
      
      const friendList = await friendsService.getFriends();
      console.log('👥 Friends loaded:', friendList);
      setFriends(friendList);

      // Subscribe to friend updates
      friendsService.subscribeToFriends((event, data) => {
        console.log('🔔 Friend event:', event, data);
        if (event === 'added' || event === 'updated') {
          setFriends(prev => {
            const updated = prev.filter(f => f.publicKey !== data.publicKey);
            return [...updated, data];
          });
        } else if (event === 'removed') {
          setFriends(prev => prev.filter(f => f.publicKey !== data.publicKey));
        }
      });

      // Update presence for each friend
      for (const friend of friendList) {
        const presence = await friendsService.getFriendPresence(friend.publicKey);
        setOnlineStatus(prev => new Map(prev).set(friend.publicKey, presence.isOnline));
        
        // Subscribe to presence updates
        hybridGunService.subscribeToPresence(friend.publicKey, (presenceData) => {
          const isOnline = presenceData?.status === 'online' && 
                          presenceData?.lastSeen > Date.now() - 60000;
          setOnlineStatus(prev => new Map(prev).set(friend.publicKey, isOnline));
        });
      }
    } catch (error) {
      console.error('❌ Failed to load friends:', error);
    } finally {
      setFriendsLoading(false);
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

    // Update own presence
    const peerId = webrtcService.getPeerId();
    hybridGunService.updatePresence('online', { peerId });

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

    // Refresh friends list periodically to catch any missed updates
    const refreshInterval = setInterval(() => {
      loadFriends();
    }, 10000); // Refresh every 10 seconds

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      clearInterval(refreshInterval);
    };
  }, []);

  // Load messages when friend is selected
  useEffect(() => {
    if (!selectedFriend) return;

    const loadMessages = async () => {
      console.log('📋 Loading messages for:', selectedFriend.nickname);
      const history = await messageService.getConversationHistory(selectedFriend.conversationId);
      console.log(`📜 Loaded ${history.length} messages`);
      setMessages(history);
      messageService.markAsRead(selectedFriend.conversationId);
    };

    loadMessages();

    // Refresh messages periodically to catch any missed updates
    const refreshInterval = setInterval(loadMessages, 5000);

    // Subscribe to new messages
    const unsubscribe = messageService.subscribeToConversation(
      selectedFriend.conversationId,
      (message) => {
        console.log('📨 New message received:', message);
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(m => m.id === message.id || 
            (m.timestamp === message.timestamp && m.content === message.content));
          if (!exists) {
            return [...prev, message].sort((a, b) => a.timestamp - b.timestamp);
          }
          return prev;
        });
        messageService.markAsRead(selectedFriend.conversationId);
      }
    );

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
      clearInterval(refreshInterval);
      unsubscribe();
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
      await messageService.sendMessage(selectedFriend.publicKey, sanitizedMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
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
      const link = await friendsService.generateInviteLink();
      setInviteLink(link);
      setShowInvite(true);
    } catch (error) {
      console.error('Failed to generate invite:', error);
      alert('Failed to generate invite link');
    }
  };

  // Copy invite link
  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    alert('Invite link copied to clipboard!');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + D for DevTools
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setShowDevTools(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Escape HTML for safe rendering
  const escapeHtml = (text) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return text.replace(/[&<>"'/]/g, char => map[char]);
  };

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Contacts</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={loadFriends} className="add-friend-btn" title="Refresh friends list">
              🔄
            </button>
            <button onClick={handleGenerateInvite} className="add-friend-btn" title="Add friend">
              +
            </button>
          </div>
        </div>
        
        <div className="friends-list">
          {friendsLoading ? (
            <div className="no-friends">
              <p>Loading friends...</p>
            </div>
          ) : friends.map(friend => (
            <div
              key={friend.publicKey}
              className={`friend-item ${selectedFriend?.publicKey === friend.publicKey ? 'active' : ''}`}
              onClick={() => setSelectedFriend(friend)}
            >
              <div className="friend-info">
                <span className="friend-name">{escapeHtml(friend.nickname)}</span>
                <span className={`status-indicator ${onlineStatus.get(friend.publicKey) ? 'online' : 'offline'}`} />
              </div>
            </div>
          ))}
          {friends.length === 0 && !friendsLoading && (
            <div className="no-friends">
              <p>No contacts yet</p>
              <p className="hint">Click + to invite friends</p>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <span>{userNickname}</span>
            <button onClick={onLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {selectedFriend ? (
          <>
            <div className="chat-header">
              <h3>{escapeHtml(selectedFriend.nickname)}</h3>
              <span className={`status ${onlineStatus.get(selectedFriend.publicKey) ? 'online' : 'offline'}`}>
                {onlineStatus.get(selectedFriend.publicKey) ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="messages-container">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.from === user.pub ? 'sent' : 'received'}`}
                >
                  <div className="message-content">
                    {escapeHtml(msg.content)}
                  </div>
                  <div className="message-info">
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                    {msg.from === user.pub && (
                      <span className="message-status">
                        {msg.delivered ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {typingStatus.size > 0 && (
                <div className="typing-indicator">
                  <span>{escapeHtml(selectedFriend.nickname)} is typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="message-input-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyUp={handleTyping}
                placeholder="Type a message..."
                className="message-input"
                maxLength={1000}
              />
              <button type="submit" className="send-btn">Send</button>
            </form>
          </>
        ) : (
          <div className="no-chat">
            <h3>Select a contact to start chatting</h3>
            <p>Your messages are encrypted and sent peer-to-peer</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Invite Link Generated</h3>
            <p>Share this link with your friend:</p>
            <div className="invite-link-container">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="invite-link-input"
              />
              <button onClick={handleCopyInvite} className="copy-btn">Copy</button>
            </div>
            <p className="warning">This link can only be used once and expires in 24 hours</p>
            <button onClick={() => setShowInvite(false)} className="close-modal-btn">Close</button>
          </div>
        </div>
      )}

      {/* DevTools */}
      <DevTools isVisible={showDevTools} onClose={() => setShowDevTools(false)} />

      {/* Dev Tools Toggle (Mobile) */}
      <button
        className="devtools-toggle"
        onClick={() => setShowDevTools(!showDevTools)}
        title="Toggle DevTools (Ctrl+D)"
      >
        🛠️
      </button>
    </div>
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
        
        // Add test helper to window for debugging
        window.testMessage = async (message = 'Test message from console!') => {
          const friends = await friendsService.getFriends();
          if (friends.length === 0) {
            console.log('❌ No friends to send message to');
            return;
          }
          const friend = friends[0];
          console.log(`📤 Sending test message to ${friend.nickname}...`);
          await messageService.sendMessage(friend.publicKey, message);
          console.log('✅ Message sent!');
        };
        
        window.getMessageHistory = async () => {
          const friends = await friendsService.getFriends();
          if (friends.length === 0) {
            console.log('❌ No friends found');
            return;
          }
          for (const friend of friends) {
            const messages = await messageService.getMessages(friend.conversationId);
            console.log(`📜 Messages with ${friend.nickname}:`, messages);
          }
        };
        
        window.testWebRTC = async () => {
          const friends = await friendsService.getFriends();
          if (friends.length === 0) {
            console.log('❌ No friends to test with');
            return;
          }
          
          for (const friend of friends) {
            const presence = await friendsService.getFriendPresence(friend.publicKey);
            console.log(`👤 ${friend.nickname} presence:`, presence);
            
            if (presence.isOnline && presence.peerId) {
              console.log(`🔄 Testing WebRTC connection to ${friend.nickname}...`);
              try {
                const conn = await webrtcService.connectToPeer(presence.peerId);
                console.log(`✅ Connected to ${friend.nickname}!`, conn);
                
                // Test sending a ping
                await webrtcService.sendMessage(presence.peerId, {
                  type: 'ping',
                  timestamp: Date.now()
                });
                console.log(`📡 Ping sent to ${friend.nickname}`);
              } catch (error) {
                console.error(`❌ Failed to connect to ${friend.nickname}:`, error);
              }
            } else {
              console.log(`⚫ ${friend.nickname} is offline`);
            }
          }
        };
        
        console.log('✅ Services initialized');
        console.log('💡 Test helpers available:');
        console.log('   - window.testMessage("Hello!") - Send test message');
        console.log('   - window.getMessageHistory() - View all messages');
        console.log('   - window.testWebRTC() - Test WebRTC connections');
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
          setAuthMode('register');
          setIsAdminSetup(true);
          // Clear the setup parameter from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (code) {
          setInviteCode(code);
          // If there's an invite, show register page
          setAuthMode('register');
        }

        // Initialize Gun
        gunAuthService.initialize();
        hybridGunService.initialize();

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
              // Clear the invite from URL
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
              console.error('Failed to accept invite:', error);
            }
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setInitError(error.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Handle login/register
  const handleAuth = async (authUser) => {
    console.log('🔐 Authentication successful:', authUser);
    setUser(authUser);
    
    // Initialize WebRTC
    try {
      await webrtcService.initialize(authUser.pub);
      console.log('✅ WebRTC initialized');
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
    }

    // Initialize message service
    messageService.initialize();
    console.log('✅ Message service initialized');

    // Handle invite if present
    if (inviteCode) {
      console.log('🎫 Processing invite after auth...');
      console.log('📦 Invite code:', inviteCode);
      
      // Small delay to ensure services are ready
      setTimeout(async () => {
        try {
          const result = await friendsService.acceptInvite(inviteCode);
          console.log('✅ Invite acceptance result:', result);
          alert('Friend added successfully!');
          
          // Refresh friends list
          if (typeof loadFriendsRef.current === 'function') {
            loadFriendsRef.current();
          }
        } catch (error) {
          console.error('❌ Failed to accept invite:', error);
          alert('Failed to accept invite: ' + error.message);
        }
        setInviteCode(null);
        // Clear the invite from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 2000); // 2 second delay to ensure Gun.js is ready
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

  return (
    <div>
      <ConnectionStatus />
      <ChatView user={user} onLogout={handleLogout} onInviteAccepted={handleInviteAccepted} />
    </div>
  );
}

export default App;
