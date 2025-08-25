# Changelog

All notable changes to the Whisperz project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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