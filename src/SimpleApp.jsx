import React, { useState, useEffect, useRef } from 'react';
import Gun from 'gun/gun';
import 'gun/sea';
import 'gun/axe';

// Simple Gun-based chat app
const GUN_RELAY = 'https://gun-relay-nchb.onrender.com/gun';

function SimpleApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [friendCode, setFriendCode] = useState('');
  
  const gunRef = useRef(null);
  const userRef = useRef(null);
  
  // Initialize Gun on mount
  useEffect(() => {
    // Initialize Gun with minimal config
    gunRef.current = Gun({
      peers: [GUN_RELAY],
      localStorage: true,
      radisk: true
    });
    
    userRef.current = gunRef.current.user();
    
    // Try to recall existing session
    userRef.current.recall({ sessionStorage: true });
    
    // Listen for auth
    userRef.current.on('auth', function(user) {
      setCurrentUser(user);
      setIsLoggedIn(true);
      loadUserData();
    });
  }, []);
  
  // Load user data after login
  const loadUserData = () => {
    if (!userRef.current.is) return;
    
    // Load friends
    userRef.current.get('friends').map().on((friend, key) => {
      if (friend && friend.nickname) {
        setFriends(prev => {
          const updated = prev.filter(f => f.key !== key);
          return [...updated, { key, ...friend }];
        });
      }
    });
  };
  
  // Handle login/register
  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (isRegistering) {
      // Register
      userRef.current.create(username, password, (ack) => {
        if (ack.err) {
          setError('Registration failed: ' + ack.err);
        } else {
          // Auto-login after registration
          userRef.current.auth(username, password, (ack) => {
            if (!ack.err) {
              // Save profile
              userRef.current.get('profile').put({
                nickname: nickname || username,
                username: username
              });
              setSuccess('Registration successful!');
            }
          });
        }
      });
    } else {
      // Login
      userRef.current.auth(username, password, (ack) => {
        if (ack.err) {
          setError('Login failed: ' + ack.err);
        } else {
          setSuccess('Login successful!');
        }
      });
    }
  };
  
  // Add friend
  const addFriend = () => {
    if (!friendCode) return;
    
    // Get friend's profile
    gunRef.current.user(friendCode).get('profile').once((profile) => {
      if (profile) {
        // Add to friends list
        userRef.current.get('friends').get(friendCode).put({
          nickname: profile.nickname || 'Unknown',
          username: profile.username,
          pub: friendCode,
          added: Date.now()
        });
        
        setFriendCode('');
        setSuccess('Friend added!');
      } else {
        setError('User not found');
      }
    });
  };
  
  // Select friend and load messages
  const selectFriend = (friend) => {
    setSelectedFriend(friend);
    loadMessages(friend.key);
  };
  
  // Load messages for selected friend
  const loadMessages = (friendKey) => {
    if (!currentUser || !friendKey) return;
    
    const conversationId = [currentUser.pub, friendKey].sort().join('_');
    setMessages([]);
    
    // Load messages
    gunRef.current.get('conversations')
      .get(conversationId)
      .get('messages')
      .map()
      .on((msg, key) => {
        if (msg && msg.text) {
          setMessages(prev => {
            const exists = prev.find(m => m.key === key);
            if (!exists) {
              return [...prev, { ...msg, key }].sort((a, b) => a.timestamp - b.timestamp);
            }
            return prev;
          });
        }
      });
  };
  
  // Send message
  const sendMessage = () => {
    if (!selectedFriend || !newMessage.trim()) return;
    
    const conversationId = [currentUser.pub, selectedFriend.key].sort().join('_');
    const messageId = Gun.node.Soul.uuid();
    
    const message = {
      text: newMessage,
      from: currentUser.pub,
      to: selectedFriend.key,
      timestamp: Date.now()
    };
    
    // Store message
    gunRef.current.get('conversations')
      .get(conversationId)
      .get('messages')
      .get(messageId)
      .put(message);
    
    // Send to friend's inbox
    gunRef.current.get('inbox')
      .get(selectedFriend.key)
      .get(messageId)
      .put(message);
    
    setNewMessage('');
  };
  
  // Logout
  const logout = () => {
    userRef.current.leave();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setFriends([]);
    setMessages([]);
    setSelectedFriend(null);
  };
  
  // Reset database
  const resetDatabase = () => {
    if (confirm('This will clear all local data. Are you sure?')) {
      localStorage.clear();
      sessionStorage.clear();
      if (window.indexedDB) {
        indexedDB.deleteDatabase('radata');
      }
      window.location.reload();
    }
  };
  
  // Login/Register form
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-8">Whisperz Chat</h1>
          
          <form onSubmit={handleAuth}>
            <h2 className="text-xl mb-4">{isRegistering ? 'Register' : 'Login'}</h2>
            
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border rounded mb-4"
              maxLength={20}
            />
            
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded mb-4"
            />
            
            {isRegistering && (
              <input
                type="text"
                placeholder="Nickname (optional)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-3 border rounded mb-4"
                maxLength={30}
              />
            )}
            
            {error && <div className="text-red-500 mb-4">{error}</div>}
            {success && <div className="text-green-500 mb-4">{success}</div>}
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded font-bold hover:opacity-90"
            >
              {isRegistering ? 'Register' : 'Login'}
            </button>
          </form>
          
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full mt-4 text-blue-600 hover:underline"
          >
            {isRegistering ? 'Switch to Login' : 'Switch to Register'}
          </button>
          
          <div className="mt-8 pt-8 border-t">
            <p className="text-center text-gray-600 mb-4">Having issues?</p>
            <button
              onClick={resetDatabase}
              className="w-full bg-red-500 text-white p-3 rounded hover:bg-red-600"
            >
              Reset Database
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Chat interface
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Whisperz Chat</h1>
              <button
                onClick={logout}
                className="bg-white text-purple-600 px-4 py-2 rounded hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
            <p className="text-sm mt-2">
              Logged in as: {currentUser?.alias}
            </p>
          </div>
          
          <div className="flex" style={{ height: '600px' }}>
            {/* Friends sidebar */}
            <div className="w-1/3 border-r p-4">
              <h2 className="text-lg font-bold mb-4">Friends</h2>
              
              {/* Add friend */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Friend's public key"
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={addFriend}
                  className="w-full mt-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                >
                  Add Friend
                </button>
              </div>
              
              {/* Your invite code */}
              <div className="mb-4 p-3 bg-gray-100 rounded">
                <p className="text-sm font-bold mb-1">Your Invite Code:</p>
                <input
                  type="text"
                  value={currentUser?.pub || ''}
                  readOnly
                  onClick={(e) => e.target.select()}
                  className="w-full p-2 text-xs border rounded bg-white"
                />
              </div>
              
              {/* Friends list */}
              <div className="space-y-2">
                {friends.map(friend => (
                  <div
                    key={friend.key}
                    onClick={() => selectFriend(friend)}
                    className={`p-3 rounded cursor-pointer ${
                      selectedFriend?.key === friend.key
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {friend.nickname}
                  </div>
                ))}
                {friends.length === 0 && (
                  <p className="text-gray-500">No friends yet</p>
                )}
              </div>
            </div>
            
            {/* Chat area */}
            <div className="flex-1 flex flex-col">
              {selectedFriend ? (
                <>
                  {/* Chat header */}
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-bold">{selectedFriend.nickname}</h3>
                  </div>
                  
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {messages.map(msg => (
                      <div
                        key={msg.key}
                        className={`mb-4 ${
                          msg.from === currentUser.pub ? 'text-right' : ''
                        }`}
                      >
                        <div
                          className={`inline-block p-3 rounded-lg ${
                            msg.from === currentUser.pub
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200'
                          }`}
                        >
                          <p>{msg.text}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Message input */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        className="flex-1 p-3 border rounded"
                      />
                      <button
                        onClick={sendMessage}
                        className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  Select a friend to start chatting
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimpleApp;