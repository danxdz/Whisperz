import React, { useState, useEffect } from 'react';
import gunAuthService from '../services/gunAuthService';
import friendsService from '../services/friendsService';
import hybridGunService from '../services/hybridGunService';
import webrtcService from '../services/webrtcService';

/**
 * EnhancedDevTools Component
 * Advanced developer tools with user management and mobile optimization
 */
function EnhancedDevTools({ isVisible, onClose }) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [isCompact, setIsCompact] = useState(window.innerWidth <= 375);

  // Detect screen size
  useEffect(() => {
    const handleResize = () => {
      setIsCompact(window.innerWidth <= 375);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load users (friends)
  useEffect(() => {
    if (!isVisible) return;
    loadUsers();
    loadInvites();
    loadStats();
  }, [isVisible]);

  const loadUsers = async () => {
    try {
      const friends = await friendsService.getFriends();
      const userList = friends.map(friend => ({
        ...friend,
        id: friend.publicKey,
        name: friend.nickname,
        status: 'friend',
        lastSeen: friend.lastSeen || 'Unknown'
      }));
      setUsers(userList);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadInvites = async () => {
    try {
      const myInvites = await friendsService.getMyInvites();
      setInvites(myInvites);
    } catch (error) {
      console.error('Failed to load invites:', error);
    }
  };

  const loadStats = async () => {
    try {
      const dbStats = await hybridGunService.getDatabaseStats();
      const gun = gunAuthService.gun;
      const peers = gun?._.opt?.peers ? Object.keys(gun._.opt.peers).length : 0;
      
      setStats({
        ...dbStats,
        totalUsers: users.length,
        activeInvites: invites.filter(i => !i.used && !i.revoked).length,
        usedInvites: invites.filter(i => i.used).length,
        gunPeers: peers,
        webrtcStatus: webrtcService.peer?.open ? 'Connected' : 'Disconnected'
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      await friendsService.removeFriend(userId);
      loadUsers();
      alert('Friend removed successfully');
    } catch (error) {
      alert('Failed to remove friend: ' + error.message);
    }
  };

  const handleRevokeInvite = async (inviteCode) => {
    if (!confirm('Are you sure you want to revoke this invite?')) return;
    
    try {
      await friendsService.revokeInvite(inviteCode);
      loadInvites();
      alert('Invite revoked successfully');
    } catch (error) {
      alert('Failed to revoke invite: ' + error.message);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      const result = await friendsService.generateInvite();
      await navigator.clipboard.writeText(result.inviteLink);
      alert('New invite generated and copied to clipboard!');
      loadInvites();
    } catch (error) {
      alert('Failed to generate invite: ' + error.message);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('This will delete ALL data including messages, friends, and settings. Are you sure?')) return;
    if (!confirm('This action cannot be undone. Continue?')) return;
    
    try {
      await hybridGunService.clearAllData();
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (error) {
      alert('Failed to clear data: ' + error.message);
    }
  };

  const renderCompactTabs = () => {
    const tabs = [
      { id: 'users', icon: '👥', label: 'Users' },
      { id: 'invites', icon: '🎫', label: 'Invites' },
      { id: 'stats', icon: '📊', label: 'Stats' },
      { id: 'actions', icon: '⚡', label: 'Actions' }
    ];

    return (
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        borderBottom: '1px solid rgba(102, 126, 234, 0.3)',
        background: 'rgba(0, 0, 0, 0.5)'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '0 0 auto',
              padding: isCompact ? '8px 12px' : '10px 16px',
              background: activeTab === tab.id 
                ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3))'
                : 'transparent',
              border: 'none',
              color: activeTab === tab.id ? '#fff' : 'rgba(255, 255, 255, 0.7)',
              fontSize: isCompact ? '11px' : '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s',
              borderBottom: activeTab === tab.id ? '2px solid #667eea' : '2px solid transparent'
            }}
          >
            <div>{tab.icon}</div>
            <div style={{ fontSize: isCompact ? '9px' : '10px' }}>{tab.label}</div>
          </button>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <div style={{ padding: isCompact ? '8px' : '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h4 style={{ margin: 0, fontSize: isCompact ? '14px' : '16px' }}>
                Friends ({users.length})
              </h4>
              <button
                onClick={handleGenerateInvite}
                style={{
                  padding: isCompact ? '4px 8px' : '6px 12px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: isCompact ? '10px' : '12px',
                  cursor: 'pointer'
                }}
              >
                + Invite
              </button>
            </div>
            
            <div style={{ 
              maxHeight: isCompact ? '200px' : '300px', 
              overflowY: 'auto',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              padding: '8px'
            }}>
              {users.length === 0 ? (
                <p style={{ 
                  textAlign: 'center', 
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: isCompact ? '11px' : '12px'
                }}>
                  No friends yet. Generate an invite to add friends.
                </p>
              ) : (
                users.map(user => (
                  <div key={user.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: isCompact ? '6px' : '8px',
                    marginBottom: '4px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    fontSize: isCompact ? '11px' : '12px'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: 'bold',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {user.name}
                      </div>
                      <div style={{ 
                        fontSize: isCompact ? '9px' : '10px', 
                        color: 'rgba(255, 255, 255, 0.5)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {user.id.substring(0, 20)}...
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      style={{
                        padding: isCompact ? '2px 6px' : '4px 8px',
                        background: 'rgba(255, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 0, 0, 0.5)',
                        borderRadius: '4px',
                        color: '#ff6666',
                        fontSize: isCompact ? '9px' : '10px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'invites':
        return (
          <div style={{ padding: isCompact ? '8px' : '12px' }}>
            <h4 style={{ 
              margin: '0 0 12px 0', 
              fontSize: isCompact ? '14px' : '16px' 
            }}>
              Invites ({invites.length})
            </h4>
            
            <div style={{ 
              maxHeight: isCompact ? '200px' : '300px', 
              overflowY: 'auto',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              padding: '8px'
            }}>
              {invites.length === 0 ? (
                <p style={{ 
                  textAlign: 'center', 
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: isCompact ? '11px' : '12px'
                }}>
                  No invites generated yet.
                </p>
              ) : (
                invites.map(invite => (
                  <div key={invite.code} style={{
                    padding: isCompact ? '6px' : '8px',
                    marginBottom: '4px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    fontSize: isCompact ? '11px' : '12px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <span style={{ 
                        fontWeight: 'bold',
                        color: invite.used ? '#66ff66' : invite.revoked ? '#ff6666' : '#ffff66'
                      }}>
                        {invite.used ? '✅ Used' : invite.revoked ? '❌ Revoked' : '⏳ Pending'}
                      </span>
                      <span style={{ fontSize: isCompact ? '9px' : '10px' }}>
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {invite.used && invite.usedBy && (
                      <div style={{ 
                        fontSize: isCompact ? '9px' : '10px',
                        color: 'rgba(255, 255, 255, 0.5)'
                      }}>
                        Used by: {invite.usedBy.substring(0, 20)}...
                      </div>
                    )}
                    
                    {!invite.used && !invite.revoked && (
                      <div style={{ marginTop: '4px' }}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(invite.link);
                            alert('Invite link copied!');
                          }}
                          style={{
                            padding: isCompact ? '2px 6px' : '4px 8px',
                            background: 'rgba(102, 126, 234, 0.2)',
                            border: '1px solid rgba(102, 126, 234, 0.5)',
                            borderRadius: '4px',
                            color: '#667eea',
                            fontSize: isCompact ? '9px' : '10px',
                            cursor: 'pointer',
                            marginRight: '4px'
                          }}
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(invite.code)}
                          style={{
                            padding: isCompact ? '2px 6px' : '4px 8px',
                            background: 'rgba(255, 0, 0, 0.2)',
                            border: '1px solid rgba(255, 0, 0, 0.5)',
                            borderRadius: '4px',
                            color: '#ff6666',
                            fontSize: isCompact ? '9px' : '10px',
                            cursor: 'pointer'
                          }}
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'stats':
        return (
          <div style={{ padding: isCompact ? '8px' : '12px' }}>
            <h4 style={{ 
              margin: '0 0 12px 0', 
              fontSize: isCompact ? '14px' : '16px' 
            }}>
              Statistics
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: isCompact ? '1fr' : 'repeat(2, 1fr)',
              gap: '8px'
            }}>
              {Object.entries(stats).map(([key, value]) => (
                <div key={key} style={{
                  padding: isCompact ? '6px' : '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                  fontSize: isCompact ? '11px' : '12px'
                }}>
                  <div style={{ 
                    fontSize: isCompact ? '9px' : '10px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginBottom: '2px'
                  }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div style={{ 
                    fontWeight: 'bold',
                    color: '#667eea'
                  }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'actions':
        return (
          <div style={{ padding: isCompact ? '8px' : '12px' }}>
            <h4 style={{ 
              margin: '0 0 12px 0', 
              fontSize: isCompact ? '14px' : '16px' 
            }}>
              Actions
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: isCompact ? '1fr' : 'repeat(2, 1fr)',
              gap: '8px'
            }}>
              <button
                onClick={handleGenerateInvite}
                style={{
                  padding: isCompact ? '8px' : '12px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: isCompact ? '11px' : '12px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🎫 Generate Invite
              </button>
              
              <button
                onClick={() => friendsService.cleanupExpiredInvites()}
                style={{
                  padding: isCompact ? '8px' : '12px',
                  background: 'rgba(102, 126, 234, 0.2)',
                  border: '1px solid rgba(102, 126, 234, 0.5)',
                  borderRadius: '4px',
                  color: '#667eea',
                  fontSize: isCompact ? '11px' : '12px',
                  cursor: 'pointer'
                }}
              >
                🧹 Cleanup Invites
              </button>
              
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: isCompact ? '8px' : '12px',
                  background: 'rgba(67, 233, 123, 0.2)',
                  border: '1px solid rgba(67, 233, 123, 0.5)',
                  borderRadius: '4px',
                  color: '#43e97b',
                  fontSize: isCompact ? '11px' : '12px',
                  cursor: 'pointer'
                }}
              >
                🔄 Reload App
              </button>
              
              <button
                onClick={handleClearAllData}
                style={{
                  padding: isCompact ? '8px' : '12px',
                  background: 'rgba(255, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 0, 0, 0.5)',
                  borderRadius: '4px',
                  color: '#ff6666',
                  fontSize: isCompact ? '11px' : '12px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                💣 Clear All Data
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: isCompact ? '320px' : '400px',
      background: 'linear-gradient(to top, rgba(10, 10, 15, 0.98), rgba(22, 22, 31, 0.95))',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '2px solid rgba(102, 126, 234, 0.5)',
      color: 'white',
      fontFamily: 'Inter, -apple-system, sans-serif',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isCompact ? '8px 12px' : '12px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(0, 0, 0, 0.3)'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: isCompact ? '14px' : '16px',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🛠️ Enhanced Dev Tools
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            color: 'white',
            padding: isCompact ? '4px 8px' : '6px 12px',
            fontSize: isCompact ? '12px' : '14px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      {renderCompactTabs()}

      {/* Content */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        {renderContent()}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

export default EnhancedDevTools;