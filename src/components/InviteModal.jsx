import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../contexts/ThemeContext';

function InviteModal({ isOpen, onClose, inviteLink }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  
  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Whisperz',
          text: 'Join my secure chat on Whisperz!',
          url: inviteLink
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`Join me on Whisperz secure chat: ${inviteLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareToTelegram = () => {
    const text = encodeURIComponent('Join me on Whisperz secure chat');
    const url = encodeURIComponent(inviteLink);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const shareToEmail = () => {
    const subject = encodeURIComponent('Invitation to Whisperz');
    const body = encodeURIComponent(`Hi!\n\nJoin me on Whisperz secure chat:\n${inviteLink}\n\nThis link expires in 24 hours.`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Check if on mobile for compact layout
  const isMobile = window.innerWidth <= 480;

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.bgSecondary,
          borderRadius: '16px',
          padding: isMobile ? '16px' : '24px',
          maxWidth: isMobile ? '100%' : '480px',
          width: '100%',
          boxShadow: colors.shadow,
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: isMobile ? '18px' : '20px',
            color: colors.textPrimary,
            fontWeight: '600'
          }}>
            Invite Friend
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              color: colors.textMuted,
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* QR Code */}
        <div style={{
          background: '#fff',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <QRCodeSVG 
            value={inviteLink} 
            size={isMobile ? 160 : 200}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Invite Link */}
        <div style={{
          background: colors.bgTertiary,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <input
            type="text"
            value={inviteLink}
            readOnly
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: colors.textSecondary,
              fontSize: isMobile ? '12px' : '14px',
              outline: 'none',
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          />
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 12px',
              background: colors.primary,
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minWidth: '60px'
            }}
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>

        {/* Share Options */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '16px'
        }}>
          {/* Native Share (if available) */}
          {navigator.share && (
            <button
              onClick={handleShare}
              style={{
                padding: '12px',
                background: colors.primary,
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                gridColumn: isMobile ? 'span 2' : 'span 1'
              }}
            >
              <span style={{ fontSize: '20px' }}>📤</span>
              <span style={{ fontSize: '11px' }}>Share</span>
            </button>
          )}

          {/* WhatsApp */}
          <button
            onClick={shareToWhatsApp}
            style={{
              padding: '12px',
              background: '#25D366',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '20px' }}>💬</span>
            <span style={{ fontSize: '11px' }}>WhatsApp</span>
          </button>

          {/* Telegram */}
          <button
            onClick={shareToTelegram}
            style={{
              padding: '12px',
              background: '#0088cc',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '20px' }}>✈️</span>
            <span style={{ fontSize: '11px' }}>Telegram</span>
          </button>

          {/* Email */}
          <button
            onClick={shareToEmail}
            style={{
              padding: '12px',
              background: colors.bgTertiary,
              border: `1px solid ${colors.borderColor}`,
              borderRadius: '8px',
              color: colors.textPrimary,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '20px' }}>📧</span>
            <span style={{ fontSize: '11px' }}>Email</span>
          </button>
        </div>

        {/* Info */}
        <div style={{
          padding: '12px',
          background: colors.bgTertiary,
          borderRadius: '8px',
          fontSize: '12px',
          color: colors.textMuted,
          textAlign: 'center'
        }}>
          ⏱️ This invite expires in 24 hours and can only be used once
        </div>
      </div>
    </div>
  );
}

export default InviteModal;