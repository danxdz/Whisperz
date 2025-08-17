import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';

function InviteModal({ isOpen, onClose, inviteLink }) {
  const { colors } = useTheme();
  const screen = useResponsive();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
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
        padding: screen.isTiny ? '8px' : '16px'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.bgSecondary,
          borderRadius: '12px',
          padding: screen.isTiny ? '12px' : screen.isMobile ? '16px' : '20px',
          maxWidth: screen.isTiny ? '100%' : screen.isMobile ? '360px' : '420px',
          width: '100%',
          boxShadow: colors.shadow,
          maxHeight: screen.isTiny ? '85vh' : '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: screen.isTiny ? '8px' : '12px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: screen.isTiny ? '16px' : '18px',
            color: colors.textPrimary,
            fontWeight: '600'
          }}>
            Share Invite
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              color: colors.textMuted,
              cursor: 'pointer',
              padding: '0',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Compact Link Display */}
        <div style={{
          background: colors.bgTertiary,
          borderRadius: '8px',
          padding: screen.isTiny ? '8px' : '10px',
          marginBottom: screen.isTiny ? '8px' : '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
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
              fontSize: screen.isTiny ? '11px' : '12px',
              outline: 'none',
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          />
          <button
            onClick={handleCopy}
            style={{
              padding: screen.isTiny ? '4px 8px' : '6px 10px',
              background: copied ? colors.success : colors.primary,
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: screen.isTiny ? '11px' : '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s'
            }}
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>

        {/* Quick Share Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: screen.isTiny ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
          gap: screen.isTiny ? '6px' : '8px',
          marginBottom: screen.isTiny ? '8px' : '12px'
        }}>
          {/* QR Code Button */}
          <button
            onClick={() => setShowQR(!showQR)}
            style={{
              padding: screen.isTiny ? '8px' : '10px',
              background: showQR ? colors.primary : colors.bgTertiary,
              border: `1px solid ${showQR ? colors.primary : colors.borderColor}`,
              borderRadius: '6px',
              color: showQR ? '#fff' : colors.textPrimary,
              fontSize: screen.isTiny ? '18px' : '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title="QR Code"
          >
            {showQR ? '✕' : '⬚'}
          </button>

          {/* Native Share (if available) */}
          {navigator.share && (
            <button
              onClick={handleShare}
              style={{
                padding: screen.isTiny ? '8px' : '10px',
                background: colors.primary,
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: screen.isTiny ? '18px' : '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Share"
            >
              📤
            </button>
          )}

          {/* WhatsApp */}
          <button
            onClick={shareToWhatsApp}
            style={{
              padding: screen.isTiny ? '8px' : '10px',
              background: '#25D366',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: screen.isTiny ? '18px' : '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="WhatsApp"
          >
            💬
          </button>

          {/* Telegram */}
          <button
            onClick={shareToTelegram}
            style={{
              padding: screen.isTiny ? '8px' : '10px',
              background: '#0088cc',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: screen.isTiny ? '18px' : '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Telegram"
          >
            ✈️
          </button>

          {/* Email */}
          <button
            onClick={shareToEmail}
            style={{
              padding: screen.isTiny ? '8px' : '10px',
              background: colors.bgTertiary,
              border: `1px solid ${colors.borderColor}`,
              borderRadius: '6px',
              color: colors.textPrimary,
              fontSize: screen.isTiny ? '18px' : '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Email"
          >
            📧
          </button>
        </div>

        {/* QR Code Display */}
        {showQR && (
          <div style={{
            background: '#fff',
            padding: screen.isTiny ? '12px' : '16px',
            borderRadius: '8px',
            marginBottom: screen.isTiny ? '8px' : '12px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <QRCodeSVG 
              value={inviteLink} 
              size={screen.isTiny ? 120 : screen.isMobile ? 140 : 160}
              level="H"
              includeMargin={false}
            />
          </div>
        )}

        {/* Info */}
        <div style={{
          padding: screen.isTiny ? '8px' : '10px',
          background: colors.bgTertiary,
          borderRadius: '6px',
          fontSize: screen.isTiny ? '10px' : '11px',
          color: colors.textMuted,
          textAlign: 'center'
        }}>
          ⏱️ Expires in 24h • Single use
        </div>
      </div>
    </div>
  );
}

export default InviteModal;