import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import gunAuthService from '../services/gunAuthService';
import friendsService from '../services/friendsService';

/**
 * ChatSecurityStatus Component
 * Shows real-time security status for the current chat
 * Displays encryption status, key exchange status, and connection type
 */
const ChatSecurityStatus = ({ friend, connectionState, onAttemptP2P, style = {} }) => {
  const { colors } = useTheme();
  const [securityStatus, setSecurityStatus] = useState({
    hasEncryptionKey: false,
    isEncrypted: false,
    connectionType: 'offline',
    securityLevel: 'none',
    details: []
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!friend) {
      setSecurityStatus({
        hasEncryptionKey: false,
        isEncrypted: false,
        connectionType: 'offline',
        securityLevel: 'none',
        details: []
      });
      return;
    }

    const checkSecurity = async () => {
      const details = [];
      let securityLevel = 'none';
      let isEncrypted = false;
      let hasEncryptionKey = false;

      // Check if we have friend's encryption key (epub)
      hasEncryptionKey = !!friend.epub;
      
      if (!hasEncryptionKey) {
        details.push({
          type: 'error',
          icon: '❌',
          text: 'Missing encryption key',
          tooltip: 'Friend needs to re-share invite or re-add you'
        });
        securityLevel = 'critical';
      } else {
        details.push({
          type: 'success',
          icon: '🔑',
          text: 'Encryption keys exchanged',
          tooltip: 'Both parties have encryption keys'
        });
      }

      // Check connection type and encryption
      const connType = connectionState?.status || 'offline';
      
      if (connType === 'webrtc') {
        isEncrypted = true;
        details.push({
          type: 'success',
          icon: '🔐',
          text: 'P2P Direct (E2E Encrypted)',
          tooltip: 'Messages sent directly, fully encrypted'
        });
        securityLevel = hasEncryptionKey ? 'maximum' : 'partial';
      } else if (connType === 'gun') {
        isEncrypted = hasEncryptionKey;
        details.push({
          type: isEncrypted ? 'success' : 'warning',
          icon: isEncrypted ? '🔒' : '⚠️',
          text: isEncrypted ? 'Gun Relay (E2E Encrypted)' : 'Gun Relay (Unencrypted)',
          tooltip: isEncrypted 
            ? 'Messages routed through relay, but encrypted'
            : 'Messages routed through relay WITHOUT encryption!'
        });
        securityLevel = hasEncryptionKey ? 'high' : 'low';
      } else if (connType === 'connecting') {
        details.push({
          type: 'info',
          icon: '🔄',
          text: 'Connecting...',
          tooltip: 'Establishing secure connection'
        });
        securityLevel = 'pending';
      } else {
        details.push({
          type: 'error',
          icon: '❌',
          text: 'Offline',
          tooltip: 'Friend is not online'
        });
        securityLevel = 'none';
      }

      // Check if we have user's own keys (should always be true)
      const user = gunAuthService.getCurrentUser();
      if (!user?.epub) {
        details.push({
          type: 'error',
          icon: '⚠️',
          text: 'Your encryption key missing',
          tooltip: 'Re-login may be required'
        });
        securityLevel = 'critical';
      }

      setSecurityStatus({
        hasEncryptionKey,
        isEncrypted,
        connectionType: connType,
        securityLevel,
        details
      });
    };

    checkSecurity();
  }, [friend, connectionState]);

  // Determine overall status color and icon
  const getStatusColor = () => {
    switch (securityStatus.securityLevel) {
      case 'maximum': return '#00ff00'; // Bright green
      case 'high': return '#43e97b'; // Green
      case 'partial': return '#ffaa00'; // Orange
      case 'low': return '#ff6b6b'; // Red
      case 'critical': return '#ff0000'; // Bright red
      case 'pending': return colors.primary;
      default: return colors.textMuted;
    }
  };

  const getStatusIcon = () => {
    switch (securityStatus.securityLevel) {
      case 'maximum': return '🛡️';
      case 'high': return '🔒';
      case 'partial': return '🔓';
      case 'low': return '⚠️';
      case 'critical': return '🚨';
      case 'pending': return '🔄';
      default: return '❌';
    }
  };

  const getStatusText = () => {
    switch (securityStatus.securityLevel) {
      case 'maximum': return 'Maximum Security';
      case 'high': return 'Encrypted';
      case 'partial': return 'Partial Security';
      case 'low': return 'Not Encrypted';
      case 'critical': return 'Security Issue';
      case 'pending': return 'Connecting...';
      default: return 'Offline';
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      ...style
    }}>
      {/* P2P Connect Button - only show if not already P2P and friend is online */}
      {connectionState?.isOnline && connectionState?.status !== 'webrtc' && onAttemptP2P && (
        <button
          onClick={onAttemptP2P}
          style={{
            padding: '6px 10px',
            background: 'rgba(0, 255, 0, 0.1)',
            border: '1px solid #00ff00',
            borderRadius: '6px',
            color: '#00ff00',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s',
            fontWeight: '600'
          }}
          title="Try direct P2P connection"
        >
          🚀 P2P
        </button>
      )}
      
      {/* Main Security Indicator */}
      <div
        onClick={() => setShowDetails(!showDetails)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          background: `${getStatusColor()}20`,
          border: `1px solid ${getStatusColor()}`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative'
        }}
        title="Click for security details"
      >
        {/* Status Icon */}
        <span style={{ fontSize: '14px' }}>{getStatusIcon()}</span>
        
        {/* Status Text */}
        <span style={{
          color: getStatusColor(),
          fontSize: '12px',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          {getStatusText()}
        </span>

        {/* Connection Type Badge */}
        <span style={{
          padding: '2px 6px',
          background: colors.bgTertiary,
          borderRadius: '4px',
          fontSize: '10px',
          color: colors.textSecondary,
          fontWeight: '500'
        }}>
          {securityStatus.connectionType === 'webrtc' ? 'P2P' :
           securityStatus.connectionType === 'gun' ? 'RELAY' :
           securityStatus.connectionType === 'connecting' ? '...' :
           'OFF'}
        </span>
      </div>

      {/* Detailed Security Panel */}
      {showDetails && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          marginTop: '8px',
          background: colors.bgCard,
          border: `1px solid ${colors.borderColor}`,
          borderRadius: '8px',
          padding: '12px',
          minWidth: '280px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            color: colors.textPrimary,
            borderBottom: `1px solid ${colors.borderColor}`,
            paddingBottom: '8px'
          }}>
            🔐 Security Details
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {securityStatus.details.map((detail, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px',
                  background: colors.bgTertiary,
                  borderRadius: '6px'
                }}
                title={detail.tooltip}
              >
                <span style={{ fontSize: '14px' }}>{detail.icon}</span>
                <span style={{
                  fontSize: '12px',
                  color: detail.type === 'success' ? colors.success :
                         detail.type === 'warning' ? colors.warning :
                         detail.type === 'error' ? colors.danger :
                         detail.type === 'info' ? colors.primary :
                         colors.textSecondary
                }}>
                  {detail.text}
                </span>
              </div>
            ))}
          </div>

          {/* Key Info */}
          {friend && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: colors.bgSecondary,
              borderRadius: '6px',
              fontSize: '11px',
              color: colors.textMuted
            }}>
              <div>📍 Friend Key: {friend.publicKey?.substring(0, 16)}...</div>
              <div>🔑 Encryption: {friend.epub ? '✅ Available' : '❌ Missing'}</div>
              <div>🔗 Connection: {connectionState?.isOnline ? '🟢 Online' : '🔴 Offline'}</div>
            </div>
          )}

          {/* Security Tips */}
          {securityStatus.securityLevel === 'critical' && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              borderRadius: '6px',
              fontSize: '11px',
              color: colors.danger
            }}>
              ⚠️ <strong>Action Required:</strong><br/>
              {!securityStatus.hasEncryptionKey && 
                'Friend needs to generate a new invite link for you, or you need to re-add each other.'}
              {!gunAuthService.getCurrentUser()?.epub && 
                'Your encryption keys are missing. Please log out and log back in.'}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(false);
            }}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '6px',
              background: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatSecurityStatus;