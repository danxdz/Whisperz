import React, { useState, useEffect } from 'react';
import friendsService from '../services/friendsService';
import gunAuthService from '../services/gunAuthService';

/**
 * DevTools Component with Social Features
 * Focus on friend management and invite functionality
 */
function EnhancedDevTools({ isVisible, onClose, isMobilePanel = false }) {
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isVisible) {
      loadFriends();
      loadInvites();
    }
  }, [isVisible]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      await friendsService.initialize();
      const friendsList = await friendsService.getFriends();
      setFriends(friendsList);
      setStatus(`✅ Loaded ${friendsList.length} friends`);
    } catch (error) {
      console.error('Failed to load friends:', error);
      setStatus(`❌ Failed to load friends: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = async () => {
    try {
      const invitesList = await friendsService.getMyInvites();
      setInvites(invitesList);
    } catch (error) {
      console.error('Failed to load invites:', error);
    }
  };

  const generateInvite = async () => {
    try {
      setLoading(true);
      const result = await friendsService.generateInvite();
      await navigator.clipboard.writeText(result.inviteLink);
      setStatus(`✅ Invite generated and copied! Code: ${result.inviteCode.substring(0, 8)}...`);
      loadInvites();
    } catch (error) {
      console.error('Failed to generate invite:', error);
      setStatus(`❌ Failed to generate invite: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async (publicKey) => {
    if (!confirm('Remove this friend?')) return;
    try {
      setLoading(true);
      await friendsService.removeFriend(publicKey);
      setStatus('✅ Friend removed');
      loadFriends();
    } catch (error) {
      setStatus(`❌ Failed to remove friend: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const revokeInvite = async (inviteCode) => {
    if (!confirm('Revoke this invite?')) return;
    try {
      setLoading(true);
      await friendsService.revokeInvite(inviteCode);
      setStatus('✅ Invite revoked');
      loadInvites();
    } catch (error) {
      setStatus(`❌ Failed to revoke invite: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: '#1a1a2e',
        color: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #333333',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#ffffff' }}>👥 Social DevTools</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#cccccc',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('friends')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'friends' ? '#667eea' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'invites' ? '#667eea' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Invites ({invites.length})
          </button>
        </div>

        {/* Status */}
        {status && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: status.includes('✅') ? '#0d4f3c' : '#4a1a1a',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '12px'
          }}>
            {status}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'friends' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0 }}>Friends</h4>
                <button
                  onClick={loadFriends}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {friends.length === 0 ? (
                <p style={{ color: '#999', fontSize: '14px' }}>No friends yet. Generate an invite to add friends!</p>
              ) : (
                friends.map(friend => (
                  <div key={friend.publicKey} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px',
                    backgroundColor: '#2a2a3e',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{friend.nickname}</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {friend.publicKey.substring(0, 20)}...
                      </div>
                      {friend.conversationId && (
                        <div style={{ fontSize: '10px', color: '#666' }}>
                          Chat ID: {friend.conversationId.substring(0, 8)}...
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeFriend(friend.publicKey)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'invites' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0 }}>Invites</h4>
                <button
                  onClick={generateInvite}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {loading ? 'Generating...' : '+ Generate Invite'}
                </button>
              </div>

              {invites.length === 0 ? (
                <p style={{ color: '#999', fontSize: '14px' }}>No invites generated yet.</p>
              ) : (
                invites.map(invite => (
                  <div key={invite.code} style={{
                    padding: '10px',
                    backgroundColor: '#2a2a3e',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: invite.used ? '#28a745' : invite.revoked ? '#dc3545' : '#ffc107' }}>
                          {invite.used ? '✅ Used' : invite.revoked ? '❌ Revoked' : '⏳ Active'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          Code: {invite.code.substring(0, 8)}...
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                          Created: {new Date(invite.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {!invite.used && !invite.revoked && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(invite.inviteLink);
                              setStatus('✅ Invite link copied!');
                            }}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#17a2b8',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => revokeInvite(invite.code)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#dc3545',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Revoke
                          </button>
                        </div>
                      )}
                    </div>
                    {invite.used && invite.usedBy && (
                      <div style={{ fontSize: '10px', color: '#28a745', marginTop: '5px' }}>
                        Used by: {invite.usedBy.substring(0, 20)}...
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: '15px', 
          paddingTop: '15px', 
          borderTop: '1px solid #333',
          fontSize: '11px',
          color: '#666'
        }}>
          💡 Generate invites to add friends. Share the invite link securely.
        </div>
      </div>
    </div>
  );
}

export default EnhancedDevTools;