import React, { useState, useEffect, useRef } from 'react';
import messageService from '../../services/messageService';
import gunAuthService from '../../services/gunAuthService';
// WebRTC removed - using Gun.js only
import securityUtils from '../../utils/securityUtils.js';

/**
 * ChatModule - IRC-style chat interface
 * Clean, minimal P2P private chat
 */
function ChatModule({ selectedFriend, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!selectedFriend) {
      setMessages([]);
      return;
    }

    loadMessages();

    // Subscribe to incoming messages
    const unsubscribe = messageService.onMessage((message) => {
      if (message.from === selectedFriend.publicKey ||
          message.to === selectedFriend.publicKey) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
    });

    // Check Gun.js connection
    checkConnection();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedFriend]);

  const loadMessages = async () => {
    if (!selectedFriend) return;

    try {
      const history = await messageService.getMessageHistory(selectedFriend.publicKey);
      setMessages(history || []);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const checkConnection = async () => {
    if (!selectedFriend) return;

    // Gun.js is always connected for messaging
    setConnectionStatus('connected');
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend) return;

    const message = {
      text: newMessage,
      from: currentUser.pub,
      to: selectedFriend.publicKey,
      timestamp: Date.now(),
      id: securityUtils.generateMessageId()
    };

    try {
      await messageService.sendMessage(selectedFriend.publicKey, newMessage);
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (!selectedFriend) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        color: '#606060',
        fontFamily: 'Consolas, Monaco, "Courier New", monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>No chat selected</div>
          <div style={{ fontSize: '14px' }}>Select a friend from the Friends tab to start chatting</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#1a1a1a',
      color: '#e0e0e0',
      fontFamily: 'Consolas, Monaco, "Courier New", monospace'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '15px',
        borderBottom: '1px solid #333',
        background: '#2a2a2a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ color: '#00ff00', fontSize: '16px' }}>
            @{selectedFriend.nickname}
          </span>
          <span style={{
            marginLeft: '15px',
            fontSize: '12px',
            color: connectionStatus === 'connected' ? '#00ff00' : '#606060'
          }}>
            [{connectionStatus === 'connected' ? 'DIRECT P2P' : 'VIA RELAY'}]
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#606060' }}>
          {selectedFriend.publicKey.slice(0, 8)}...
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {messages.length === 0 ? (
          <div style={{
            color: '#606060',
            textAlign: 'center',
            marginTop: '50px',
            fontSize: '14px'
          }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.from === currentUser.pub;
            return (
              <div
                key={msg.id || index}
                style={{
                  marginBottom: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOwn ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '70%',
                  padding: '8px 12px',
                  background: isOwn ? '#2a2a2a' : '#252525',
                  border: `1px solid ${isOwn ? '#444' : '#333'}`,
                  borderRadius: '4px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: '#606060',
                    marginBottom: '4px'
                  }}>
                    [{formatTime(msg.timestamp)}] {isOwn ? 'You' : selectedFriend.nickname}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#e0e0e0',
                    wordBreak: 'break-word'
                  }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '15px',
        borderTop: '1px solid #333',
        background: '#2a2a2a'
      }}>
        <div style={{
          display: 'flex',
          gap: '10px'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: '10px',
              background: '#1a1a1a',
              border: '1px solid #444',
              color: '#e0e0e0',
              fontFamily: 'inherit',
              fontSize: '14px',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#00ff00';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#444';
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            style={{
              padding: '10px 20px',
              background: '#1a1a1a',
              border: '1px solid #00ff00',
              color: '#00ff00',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              fontSize: '14px',
              opacity: newMessage.trim() ? 1 : 0.5
            }}
          >
            [SEND]
          </button>
        </div>
        <div style={{
          marginTop: '5px',
          fontSize: '11px',
          color: '#606060'
        }}>
          Press Enter to send • {connectionStatus === 'connected' ? 'Direct P2P connection' : 'Messages via Gun relay'}
        </div>
      </div>
    </div>
  );
}

export default ChatModule;