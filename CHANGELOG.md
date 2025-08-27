# Changelog

All notable changes to the Whisperz project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.3] - 2024-08-27

### Added - CRUD User Management DevTools
- **Complete User CRUD System** - Full Create, Read, Update, Delete operations for all users
- **Network User Discovery** - Scan Gun network to find all registered users
- **Admin-Level DevTools** - Professional user management interface
- **5-Tab Interface** - All Users, Discover, Friends, Invites, Add User tabs
- **Real-Time Search** - Filter users by nickname or public key
- **Online Status Tracking** - Live indicators for currently active users
- **Manual User Addition** - Add users directly with public key input
- **User Moderation** - Block/unblock users functionality
- **Comprehensive Network Scanning** - Find users from presence data and alias registry

### Fixed - Perfect Invite System
- **Fixed Invite→Friend Creation** - Invites now automatically create bidirectional friendships
- **Eliminated Strange Notifications** - Removed "pending invite from inviter accepted" messages
- **Smart Cleanup System** - Proper cleanup of pending invites and friend requests
- **Instant Connection Flow** - Users become friends immediately upon invite acceptance
- **Bidirectional Friendship** - Both users see each other as friends automatically
- **Comprehensive Debugging** - Added detailed logging for invite flow troubleshooting

### Fixed - Critical System Issues
- **DevTools Initialization** - Resolved "Cannot access 'Un' before initialization" errors
- **Message Sending Failures** - Fixed Gun.SEA encryption key issues
- **Temporal Dead Zone** - Fixed variable declaration order in config files
- **Invite Data Storage** - Fixed invite metadata vs full data storage
- **Friend Creation Logic** - Separated invite acceptance from new friend requests
- **Memory Cleanup** - Proper cleanup of pending invites and friend requests

### Enhanced - User Experience
- **Streamlined Friend Addition** - Multiple ways to add friends (invite, discover, manual)
- **Better Error Messages** - Clear feedback for all user operations
- **Loading States** - Visual feedback during network operations
- **Status Messages** - Success/error notifications for all actions
- **Responsive Design** - Optimized DevTools interface for all screen sizes

## [Unreleased]

### Added
- Component-based architecture with modular design
- ErrorBoundary component for better error handling
- Custom hooks (useLocalStorage) for state management
- Rate limiting for authentication security
- Centralized configuration system (app.config.js)
- Professional documentation (CONTRIBUTING.md, CODE_OF_CONDUCT.md)
- Code formatting configuration (.editorconfig, .prettierrc)

### Changed
- Refactored monolithic App.jsx into smaller, reusable components
- Improved README with professional badges and better structure
- Enhanced security with rate limiting on login attempts

### Security
- **WebCrypto AES-GCM Upgrade** - Replaced AES-CBC+HMAC with modern AEAD encryption
- **OWASP PBKDF2 Enhancement** - Increased iterations to 600,000 for quantum resistance
- **Hardware-accelerated encryption** - Native WebCrypto API integration
- **Memory leak fixes** - Proper timeout cleanup in authentication flows
- **Bundle security** - Removed crypto-js dependency, reduced attack surface

### Performance
- **WebCrypto optimization** - Hardware-accelerated cryptographic operations
- **Memory leak resolution** - Fixed uncleaned setTimeout in App.jsx
- **Bundle size reduction** - Removed 200KB+ crypto-js library
- **Error handling improvements** - Comprehensive error boundaries and cleanup

### Technical
- **Backup service modernization** - WebCrypto AES-GCM for encrypted backups
- **Encryption service upgrade** - Version 3 with WebCrypto AES-GCM
- **Documentation updates** - Accurate encryption specifications
- **Security audit updates** - Current threat model and mitigations

## [2.0.0] - 2024-08-15

### Added
- 🚀 **Private Messaging System** with end-to-end encryption
- 🔐 **Enhanced Security** with AES-256 encryption for all messages
- 👥 **Friend System** with secure invite links (HMAC-signed, single-use)
- 📡 **Hybrid Messaging** - WebRTC for real-time, Gun.js for offline delivery
- 🟢 **Presence Indicators** - See when friends are online/offline
- ⌨️ **Typing Indicators** - Real-time typing status
- 🛠️ **Developer Tools** - Built-in debugging panel for mobile and desktop
- 📱 **Mobile Responsive Design** - Optimized for all devices
- 🎨 **Unix-inspired Theme** - Beautiful green-on-black aesthetic
- 🔄 **Auto-reconnect** - Automatic connection recovery
- 📊 **Connection Status Monitor** - Real-time connection indicators

### Changed
- Complete rewrite from centralized to decentralized architecture
- Migrated from traditional server-based to P2P communication
- Improved message delivery with offline support
- Enhanced UI with better visual feedback

### Security
- Implemented end-to-end encryption with AES-256
- Added HMAC-signed invite links
- Single-use invite system with 24-hour expiry
- Rate limiting on authentication attempts
- XSS prevention with sanitized rendering

## [1.0.0] - 2024-07-01

### Added
- Initial release with basic P2P chat functionality
- Gun.js integration for decentralized data storage
- Basic WebRTC implementation
- Simple authentication system
- Basic message sending and receiving

---

## Version Guide

- **Major (X.0.0)**: Breaking changes, major feature additions, architectural changes
- **Minor (0.X.0)**: New features, substantial improvements, backwards compatible
- **Patch (0.0.X)**: Bug fixes, minor improvements, security patches

## Links

- [Compare versions](https://github.com/danxdz/Whisperz/compare)
- [Release notes](https://github.com/danxdz/Whisperz/releases)
- [Commit history](https://github.com/danxdz/Whisperz/commits/main)