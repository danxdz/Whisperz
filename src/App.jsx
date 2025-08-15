import { useState, useEffect, useCallback, useRef } from 'react';
import gunAuthService from './services/gunAuthService';
import webrtcService from './services/webrtcService';
import hybridGunService from './services/hybridGunService';
import friendsService from './services/friendsService';
import messageService from './services/messageService';
import './index.css';

// Login Component - No registration option
function LoginView({ onLogin, inviteCode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await gunAuthService.login(username, password);
      onLogin(result.user);
    } catch (err) {
      setError(err.message || 'Login failed');
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
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
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

// Register Component - Only accessible with invite
function RegisterView({ onRegister, onSwitchToLogin, inviteCode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState(null);

  useEffect(() => {
    // Validate invite code
    if (!inviteCode) {
      setError('No invite code provided. Registration requires a valid invite.');
      return;
    }

    try {
      // Decode and validate invite
      const invitePayload = JSON.parse(atob(inviteCode.replace(/-/g, '+').replace(/_/g, '/')));
      const data = JSON.parse(atob(invitePayload.data.replace(/-/g, '+').replace(/_/g, '/')));
      setInviteData(data);
    } catch (err) {
      setError('Invalid invite link. Please request a new one.');
    }
  }, [inviteCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode) {
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

  if (!inviteCode) {
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
        <h1>Join Whisperz</h1>
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

// Main Chat Component (unchanged)
function ChatView({ user, onLogout }) {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [onlineStatus, setOnlineStatus] = useState(new Map());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize and load friends
  useEffect(() => {
    const loadFriends = async () => {
      const friendList = await friendsService.getFriends();
      setFriends(friendList);

      // Subscribe to friend updates
      friendsService.subscribeToFriends((event, data) => {
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
    };

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

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      hybridGunService.updatePresence('offline');
    };
  }, []);

  // Load messages for selected friend
  useEffect(() => {
    if (!selectedFriend) return;

    const loadMessages = async () => {
      const history = await messageService.getConversationHistory(selectedFriend.conversationId);
      setMessages(history);
      messageService.markAsRead(selectedFriend.conversationId);
    };

    loadMessages();

    // Subscribe to new messages
    const unsubscribe = messageService.subscribeToConversation(
      selectedFriend.conversationId,
      (message) => {
        setMessages(prev => [...prev, message]);
        messageService.markAsRead(selectedFriend.conversationId);
      }
    );

    // Subscribe to typing indicators
    const unsubscribeTyping = messageService.subscribeToTyping(
      selectedFriend.conversationId,
      (userPub, isTyping) => {
        if (userPub !== user.pub) {
          setTypingUsers(prev => {
            const updated = new Set(prev);
            if (isTyping) {
              updated.add(userPub);
            } else {
              updated.delete(userPub);
            }
            return updated;
          });
        }
      }
    );

    return () => {
      unsubscribe();
      unsubscribeTyping();
    };
  }, [selectedFriend, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message send
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedFriend) return;

    try {
      await messageService.sendMessage(selectedFriend.publicKey, messageInput);
      setMessageInput('');
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

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Contacts</h2>
          <button onClick={handleGenerateInvite} className="invite-btn">+</button>
        </div>
        
        <div className="friends-list">
          {friends.map(friend => (
            <div
              key={friend.publicKey}
              className={`friend-item ${selectedFriend?.publicKey === friend.publicKey ? 'active' : ''}`}
              onClick={() => setSelectedFriend(friend)}
            >
              <div className="friend-info">
                <span className="friend-name">{friend.nickname}</span>
                <span className={`status-indicator ${onlineStatus.get(friend.publicKey) ? 'online' : 'offline'}`} />
              </div>
            </div>
          ))}
          {friends.length === 0 && (
            <div className="no-friends">
              <p>No contacts yet</p>
              <p className="hint">Click + to invite friends</p>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <span>{user.alias || 'User'}</span>
            <button onClick={onLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {selectedFriend ? (
          <>
            <div className="chat-header">
              <h3>{selectedFriend.nickname}</h3>
              <span className={`status ${onlineStatus.get(selectedFriend.publicKey) ? 'online' : 'offline'}`}>
                {onlineStatus.get(selectedFriend.publicKey) ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="messages-container">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`message ${msg.from === user.pub ? 'own' : 'other'}`}
                >
                  <div className="message-bubble">
                    <p>{msg.content}</p>
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {typingUsers.size > 0 && (
                <div className="typing-indicator">
                  <span>{selectedFriend.nickname} is typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="message-input-form">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyUp={handleTyping}
                placeholder="Type a message..."
                className="message-input"
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

  // Initialize services and check for invite
  useEffect(() => {
    const init = async () => {
      // Check for invite in URL FIRST
      const hash = window.location.hash;
      const path = window.location.pathname;
      
      // Check both hash and pathname for invite
      let code = null;
      if (hash.includes('/invite/')) {
        code = hash.split('/invite/')[1];
      } else if (path.includes('/invite/')) {
        code = path.split('/invite/')[1];
      }
      
      if (code) {
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

      setLoading(false);
    };

    init();
  }, []);

  // Handle login/register
  const handleAuth = async (authUser) => {
    setUser(authUser);
    
    // Initialize WebRTC
    try {
      await webrtcService.initialize(authUser.pub);
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
    }

    // Initialize message service
    messageService.initialize();

    // Handle invite if present
    if (inviteCode) {
      try {
        await friendsService.acceptInvite(inviteCode);
        alert('Friend added successfully!');
      } catch (error) {
        console.error('Failed to accept invite:', error);
        alert('Failed to accept invite: ' + error.message);
      }
      setInviteCode(null);
      // Clear the invite from URL
      window.history.replaceState({}, document.title, window.location.pathname);
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

  if (!user) {
    // Show register page if there's an invite code, otherwise show login
    return authMode === 'register' ? (
      <RegisterView
        onRegister={handleAuth}
        onSwitchToLogin={() => setAuthMode('login')}
        inviteCode={inviteCode}
      />
    ) : (
      <LoginView
        onLogin={handleAuth}
        inviteCode={inviteCode}
      />
    );
  }

  return <ChatView user={user} onLogout={handleLogout} />;
}

export default App;
