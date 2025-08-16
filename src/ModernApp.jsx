import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import gunAuthService from './services/gunAuthService';
import webrtcService from './services/webrtcService';
import hybridGunService from './services/hybridGunService';
import friendsService from './services/friendsService';
import messageService from './services/messageService';
import { ModernLogin } from './components/auth/ModernLogin';
import { ModernChatInterface } from './components/chat/ModernChatInterface';
import './globals.css';

// Rate limiter for login attempts
const createRateLimiter = () => {
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
};

const loginRateLimiter = createRateLimiter();

function ModernApp() {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [presence, setPresence] = useState({});
  const [inviteCode, setInviteCode] = useState(null);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize services
  useEffect(() => {
    const initServices = async () => {
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
        }

        // Check for admin setup
        const urlParams = new URLSearchParams(window.location.search);
        const setupMode = urlParams.get('setup');
        if (setupMode === 'admin' || setupMode === 'first') {
          setIsFirstUser(true);
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Initialize Gun
        gunAuthService.initialize();
        hybridGunService.initialize();

        // Check for existing session
        const currentUser = gunAuthService.getCurrentUser();
        if (currentUser) {
          await handleUserLogin(currentUser);
          
          // Process invite if logged in
          if (code) {
            try {
              await friendsService.acceptInvite(code);
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
              console.error('Failed to accept invite:', error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize services:', error);
      } finally {
        setLoading(false);
      }
    };

    initServices();
  }, []);

  // Handle user login
  const handleUserLogin = async (userData) => {
    setUser(userData);
    
    // Initialize WebRTC
    try {
      await webrtcService.initialize(userData.pub);
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
    }

    // Initialize message service
    messageService.initialize();

    // Load friends
    loadFriends();
    
    // Set up presence monitoring
    setupPresenceMonitoring();
  };

  // Load friends list
  const loadFriends = useCallback(async () => {
    try {
      const friendsList = await friendsService.getFriends();
      setFriends(friendsList);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  }, []);

  // Setup presence monitoring
  const setupPresenceMonitoring = useCallback(() => {
    const interval = setInterval(async () => {
      const updatedPresence = {};
      for (const friend of friends) {
        const status = await hybridGunService.getPresence(friend.pub);
        updatedPresence[friend.pub] = status;
      }
      setPresence(updatedPresence);
    }, 5000);

    return () => clearInterval(interval);
  }, [friends]);

  // Handle login
  const handleLogin = async (username, password) => {
    const rateCheck = loginRateLimiter.check(username);
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.error);
    }

    const result = await gunAuthService.login(username, password);
    if (result && result.user) {
      await handleUserLogin(result.user);
    } else {
      throw new Error('Login failed. Please check your credentials.');
    }
  };

  // Handle logout
  const handleLogout = () => {
    gunAuthService.logout();
    webrtcService.cleanup();
    setUser(null);
    setFriends([]);
    setMessages([]);
    setSelectedFriend(null);
    setPresence({});
  };

  // Handle sending message
  const handleSendMessage = async (toPub, text) => {
    if (!user || !toPub || !text) return;

    const message = {
      from: user.pub,
      to: toPub,
      text: text,
      timestamp: Date.now(),
      id: `${user.pub}-${Date.now()}-${Math.random()}`
    };

    // Add to local state immediately
    setMessages(prev => [...prev, message]);

    // Send via hybrid service
    try {
      await hybridGunService.sendMessage(toPub, text);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle friend selection
  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    // Load messages for this friend
    loadMessagesForFriend(friend.pub);
  };

  // Load messages for a specific friend
  const loadMessagesForFriend = async (friendPub) => {
    try {
      const history = await messageService.getMessageHistory(friendPub);
      setMessages(history);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Listen for new messages
  useEffect(() => {
    if (!user) return;

    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    // Subscribe to message events
    messageService.on('message', handleNewMessage);

    return () => {
      messageService.off('message', handleNewMessage);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading Whisperz...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {user ? (
        <ModernChatInterface
          key="chat"
          user={user}
          friends={friends}
          messages={messages}
          selectedFriend={selectedFriend}
          onSelectFriend={handleSelectFriend}
          onSendMessage={handleSendMessage}
          onLogout={handleLogout}
          presence={presence}
        />
      ) : (
        <ModernLogin
          key="login"
          onLogin={handleLogin}
          inviteCode={inviteCode}
          isFirstUser={isFirstUser}
        />
      )}
    </AnimatePresence>
  );
}

export default ModernApp;