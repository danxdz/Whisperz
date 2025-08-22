import React, { useState, useEffect } from 'react';
import friendsService from '../../services/friendsService';
import gunAuthService from '../../services/gunAuthService';

/**
 * FriendsModule - IRC-style friends list
 * Shows friends, pending invites, and friend requests
 */
function FriendsModule({ currentUser, onFriendSelect, selectedFriend }) {
  const [friends, setFriends] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [activeSection, setActiveSection] = useState('friends'); // friends, pending, requests
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState('');
  const [generatingInvite, setGeneratingInvite] = useState(false);

  useEffect(() => {
    loadFriendsData();
    // Removed polling - Gun.js subscriptions handle real-time updates
  }, [currentUser]);

  const loadFriendsData = async () => {
    try {
      setLoading(true);

      // Load friends
      const friendsList = await friendsService.getFriends();
      setFriends(friendsList);

      // Load pending invites (invites we sent)
      const invites = [];
      await new Promise((resolve) => {
        gunAuthService.user.get('pending_friends').map().once((data, key) => {
          if (data && data.status === 'pending') {
            invites.push({ ...data, key });
          }
        });
        setTimeout(resolve, 1000);
      });
      setPendingInvites(invites);

      // Load friend requests (invites sent to us)
      const requests = [];
      await new Promise((resolve) => {
        gunAuthService.gun.get('friend_requests')
          .get(currentUser.pub)
          .map()
          .once((data, key) => {
            if (data && data.inviteCode) {
              requests.push({ ...data, key });
            }
          });
        setTimeout(resolve, 1000);
      });
      setFriendRequests(requests);

    } catch (error) {
      console.error('Failed to load friends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (request) => {
    try {
      await friendsService.acceptInvite(request.inviteCode);

      // Remove from requests
      gunAuthService.gun.get('friend_requests')
        .get(currentUser.pub)
        .get(request.key)
        .put(null);

      setFriendRequests(prev => prev.filter(r => r.key !== request.key));
      alert(`You are now friends with ${request.fromNickname}!`);

      // Reload friends
      loadFriendsData();
    } catch (error) {
      alert(`Failed to accept request: ${error.message}`);
    }
  };

  const removeFriend = async (friend) => {
    if (!confirm(`Remove ${friend.nickname} from friends?`)) return;

    try {
      await friendsService.removeFriend(friend.publicKey);
      setFriends(prev => prev.filter(f => f.publicKey !== friend.publicKey));
    } catch (error) {
      alert(`Failed to remove friend: ${error.message}`);
    }
  };

  const generateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const { inviteLink } = await friendsService.generateInvite();
      setInviteLink(inviteLink);

      // Copy to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteLink);
        alert('Invite link copied to clipboard!');
      }
    } catch (error) {
      alert(`Failed to generate invite: ${error.message}`);
    } finally {
      setGeneratingInvite(false);
    }
  };

  const getStatusColor = (friend) => {
    // Check if online (you can implement proper online status checking)
    return '#606060'; // Default offline color
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#1a1a1a',
      color: '#e0e0e0',
      fontFamily: 'Consolas, Monaco, "Courier New", monospace'
    }}>
      {/* Section Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #333',
        background: '#2a2a2a'
      }}>
        {['friends', 'pending', 'requests'].map(section => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            style={{
              flex: 1,
              padding: '10px',
              background: activeSection === section ? '#1a1a1a' : 'transparent',
              border: 'none',
              borderRight: section !== 'requests' ? '1px solid #333' : 'none',
              color: activeSection === section ? '#00ff00' : '#808080',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '14px',
              textTransform: 'uppercase'
            }}
          >
            {section}
            {section === 'friends' && friends.length > 0 && ` (${friends.length})`}
            {section === 'pending' && pendingInvites.length > 0 && ` (${pendingInvites.length})`}
            {section === 'requests' && friendRequests.length > 0 && (
              <span style={{ color: '#ff6b6b' }}> ({friendRequests.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px'
      }}>
        {loading ? (
          <div style={{ color: '#808080', padding: '20px' }}>
            Loading...
          </div>
        ) : (
          <>
            {/* Friends List */}
            {activeSection === 'friends' && (
              <div>
                {/* Invite Generation */}
                <div style={{
                  padding: '15px',
                  background: '#252525',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ color: '#00ff00', marginBottom: '10px' }}>Generate Invite Link</h4>
                  <button
                    onClick={generateInvite}
                    disabled={generatingInvite}
                    style={{
                      padding: '8px 16px',
                      background: '#1a1a1a',
                      border: '1px solid #00ff00',
                      color: '#00ff00',
                      cursor: generatingInvite ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      opacity: generatingInvite ? 0.5 : 1
                    }}
                  >
                    {generatingInvite ? 'GENERATING...' : '[GENERATE INVITE]'}
                  </button>
                  {inviteLink && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px',
                      background: '#1a1a1a',
                      border: '1px solid #444',
                      wordBreak: 'break-all',
                      fontSize: '12px',
                      color: '#808080'
                    }}>
                      {inviteLink}
                    </div>
                  )}
                </div>

                {friends.length === 0 ? (
                  <div style={{ color: '#808080', padding: '20px', textAlign: 'center' }}>
                    No friends yet. Generate an invite or use Discover tab!
                  </div>
                ) : (
                  friends.map(friend => (
                    <div
                      key={friend.publicKey}
                      style={{
                        padding: '10px',
                        borderBottom: '1px solid #2a2a2a',
                        cursor: 'pointer',
                        background: selectedFriend?.publicKey === friend.publicKey ? '#2a2a2a' : 'transparent',
                        transition: 'background 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onClick={() => onFriendSelect(friend)}
                      onMouseEnter={(e) => {
                        if (selectedFriend?.publicKey !== friend.publicKey) {
                          e.currentTarget.style.background = '#252525';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedFriend?.publicKey !== friend.publicKey) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div>
                        <span style={{ color: getStatusColor(friend), marginRight: '8px' }}>●</span>
                        <span style={{ color: '#e0e0e0' }}>@{friend.nickname}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFriend(friend);
                        }}
                        style={{
                          padding: '2px 8px',
                          background: 'transparent',
                          border: '1px solid #444',
                          color: '#808080',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: '12px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pending Invites */}
            {activeSection === 'pending' && (
              <div>
                {pendingInvites.length === 0 ? (
                  <div style={{ color: '#808080', padding: '20px', textAlign: 'center' }}>
                    No pending invites
                  </div>
                ) : (
                  pendingInvites.map(invite => (
                    <div
                      key={invite.key}
                      style={{
                        padding: '10px',
                        borderBottom: '1px solid #2a2a2a',
                        color: '#808080'
                      }}
                    >
                      <div>Invite Code: {invite.inviteCode}</div>
                      <div style={{ fontSize: '12px', marginTop: '5px' }}>
                        Expires: {new Date(invite.expiresAt).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#606060' }}>
                        Status: Waiting for acceptance
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Friend Requests */}
            {activeSection === 'requests' && (
              <div>
                {friendRequests.length === 0 ? (
                  <div style={{ color: '#808080', padding: '20px', textAlign: 'center' }}>
                    No friend requests
                  </div>
                ) : (
                  friendRequests.map(request => (
                    <div
                      key={request.key}
                      style={{
                        padding: '15px',
                        borderBottom: '1px solid #2a2a2a',
                        background: '#252525',
                        marginBottom: '5px'
                      }}
                    >
                      <div style={{ marginBottom: '10px' }}>
                        <span style={{ color: '#00ff00' }}>@{request.fromNickname}</span>
                        <span style={{ color: '#606060', marginLeft: '10px', fontSize: '12px' }}>
                          wants to connect
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => acceptRequest(request)}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: '#1a1a1a',
                            border: '1px solid #00ff00',
                            color: '#00ff00',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: '14px'
                          }}
                        >
                          [ACCEPT]
                        </button>
                        <button
                          onClick={() => {
                            gunAuthService.gun.get('friend_requests')
                              .get(currentUser.pub)
                              .get(request.key)
                              .put(null);
                            setFriendRequests(prev => prev.filter(r => r.key !== request.key));
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: '#1a1a1a',
                            border: '1px solid #ff6b6b',
                            color: '#ff6b6b',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: '14px'
                          }}
                        >
                          [DECLINE]
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FriendsModule;