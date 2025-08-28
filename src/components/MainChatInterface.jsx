import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { useConnectionState } from '../hooks/useConnectionState';

// Import services
import gunAuthService from '../services/gunAuthService';
import friendsService from '../services/friendsService';
import messageService from '../services/messageService';
import presenceService from '../services/presenceService';
import onlineStatusManager from '../utils/onlineStatusFix';
import debugLogger from '../utils/debugLogger';

// Import components
import SwipeableChat from './SwipeableChat';
import InviteModal from './InviteModal';
import ChatSecurityStatus from './ChatSecurityStatus';
import ThemeToggle from './ThemeToggle';

/**
 * MainChatInterface Component
 * Handles the main chat functionality and UI
 */
function MainChatInterface({ user, onLogout, onInviteAccepted }) {
  const { colors } = useTheme();
  const screen = useResponsive();
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [_messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineStatus, setOnlineStatus] = useState({});
  const [typingStatus, setTypingStatus] = useState(new Map());
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [userNickname, setUserNickname] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const loadFriendsRef = useRef(null);

  // Connection state for selected friend
  const { connectionState, checkConnection } = useConnectionState(
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
      } catch (_error) {
        setUserNickname(user?.alias || 'User');
      }
    };
    loadUserNickname();
  }, [user]);

  // Load friends function with performance optimization
  const loadFriends = useCallback(async () => {
    try {
      const _currentUser = gunAuthService.getCurrentUser();
      if (!_currentUser) return;

      const friendList = await friendsService.getFriends();

      // Use functional update to prevent unnecessary re-renders
      setFriends(prevFriends => {
        const prevKeys = new Set(prevFriends.map(f => f.publicKey));
        const newKeys = new Set(friendList.map(f => f.publicKey));

        if (prevKeys.size !== newKeys.size) return friendList;
        for (const key of prevKeys) {
          if (!newKeys.has(key)) return friendList;
        }
        for (const key of newKeys) {
          if (!prevKeys.has(key)) return friendList;
        }
        return prevFriends; // No changes, return same reference
      });

      // Subscribe to friend updates
      friendsService.subscribeToFriends((event, data) => {
        setFriends(prev => {
          if (event === 'added' || event === 'updated') {
            const updated = prev.filter(f => f.publicKey !== data.publicKey);
            return [...updated, data];
          } else if (event === 'removed') {
            return prev.filter(f => f.publicKey !== data.publicKey);
          }
          return prev;
        });
      });
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  }, []);

  // Pass loadFriends to parent through callback
  useEffect(() => {
    if (onInviteAccepted) {
      onInviteAccepted(loadFriends);
      loadFriendsRef.current = loadFriends;
    }
  }, [onInviteAccepted, loadFriends]);

  // Initialize and load friends
  useEffect(() => {
    loadFriends();

    // Update own presence
    debugLogger.debug('gun', '📍 Updating presence...');
    presenceService.setOnline();

    // Handle page visibility
    const handleVisibility = () => {
      if (document.hidden) {
        // Keep online when tab is hidden, just don't update
      } else {
        presenceService.setOnline();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Handle beforeunload
    const handleUnload = () => {
      presenceService.setOffline();
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [_messages]);

  // Handle message send with sanitization
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedFriend) return;

    const sanitizedMessage = newMessage.trim().slice(0, 1000);

    try {
      setIsSendingMessage(true);
      await messageService.sendMessage(selectedFriend.publicKey, sanitizedMessage);
      setNewMessage('');
      setIsSendingMessage(false);

      // Clear typing indicator after sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      messageService.sendTypingIndicator(selectedFriend.conversationId, false);
    } catch (error) {
      setIsSendingMessage(false);
      console.error('Failed to send message:', error);

      // Show user-friendly error messages
      if (error.message.includes('Encryption required')) {
        alert('🔒 Cannot send message: Encryption key missing. Please wait for keys to sync or re-add this friend.');
      } else if (error.message.includes('Encryption failed')) {
        alert('🔒 Message encryption failed. Please try again or contact support if this persists.');
      } else if (error.message.includes('Not authenticated')) {
        alert('🔐 Session expired. Please log out and log back in.');
      } else {
        alert('Failed to send message: ' + error.message);
      }
    }
  };

  // Handle typing
  const handleTyping = () => {
    if (!selectedFriend) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    messageService.sendTypingIndicator(selectedFriend.conversationId, true);

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
      alert('Failed to generate invite link: ' + error.message);
    }
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
                    {selectedFriend.nickname || 'Unknown'}
                  </h3>
                  <ChatSecurityStatus
                    friend={selectedFriend}
                    connectionState={connectionState}
                    onCheckConnection={checkConnection}
                  />
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
                {(_messages || []).map((msg, index) => msg && (
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
                        {msg.content || ''}
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
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontSize: screen.isTiny ? '9px' : '10px'
                          }}
                          title="🔒 Via Relay (Encrypted)"
                        >
                          <span style={{ color: '#ffaa00' }}>◆</span>
                        </span>
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
                      {selectedFriend?.nickname || 'Friend'} is typing...
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
                gap: screen.isTiny ? '4px' : '8px',
                flexDirection: 'column'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '10px',
                  color: colors.textMuted,
                  paddingBottom: '4px',
                  borderBottom: `1px solid ${colors.borderColor}`,
                  marginBottom: '4px'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#ffaa00' }}>◆</span> All Messages Encrypted
                  </span>
                </div>
                <div style={{ display: 'flex', gap: screen.isTiny ? '4px' : '8px' }}>
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
                    disabled={!newMessage.trim() || isSendingMessage}
                    style={{
                      padding: screen.isTiny ? '6px 12px' : screen.isMobile ? '8px 16px' : '10px 20px',
                      background: (newMessage.trim() && !isSendingMessage)
                        ? colors.primary
                        : colors.bgTertiary,
                      border: 'none',
                      borderRadius: screen.isTiny ? '16px' : '8px',
                      color: (newMessage.trim() && !isSendingMessage) ? '#fff' : colors.textMuted,
                      fontSize: screen.isTiny ? '16px' : screen.isMobile ? '13px' : '14px',
                      cursor: (newMessage.trim() && !isSendingMessage) ? 'pointer' : 'not-allowed',
                      opacity: (newMessage.trim() && !isSendingMessage) ? 1 : 0.5,
                      minWidth: screen.isTiny ? '36px' : 'auto',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isSendingMessage ? '...' : (screen.isTiny ? '➤' : 'Send')}
                  </button>
                </div>
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

      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        inviteLink={inviteLink}
      />
    </>
  );
}

export default MainChatInterface;
