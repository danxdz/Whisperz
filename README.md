# 🔒 Whisperz - Ultra-Secure Decentralized Chat

[![Security Score](https://img.shields.io/badge/Security-9%2F10-green)](./DEEP_SECURITY_ANALYSIS.md)
[![Encryption](https://img.shields.io/badge/Encryption-Military%20Grade-blue)](./SECURITY_AUDIT_REPORT.md)
[![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)
[![Version](https://img.shields.io/badge/Version-2.1.1-purple)](./package.json)

**True decentralized encrypted messaging with Gun.js - no central server, no phone number, no email required.**

## 🌟 Why Whisperz?

In a world of surveillance and data breaches, Whisperz offers **genuine privacy**:
- 🔐 **Military-grade encryption** (WebCrypto AES-GCM + Gun.SEA ECC)
- 🌐 **Fully decentralized** - No central servers to hack or shut down
- 🎭 **Complete anonymity** - No phone, email, or personal data required
- 🚀 **Instant messaging** - Real-time P2P communication
- 💾 **You own your data** - Everything encrypted locally

## ✨ Features

### Security & Privacy
- **Mandatory End-to-End Encryption** - WebCrypto AES-GCM + Gun.SEA ECC (always required)
- **600,000 PBKDF2 iterations** - OWASP recommended for key derivation
- **Authenticated encryption** - AES-GCM provides confidentiality & integrity
- **Hardware-accelerated crypto** - Native WebCrypto API performance
- **No metadata leaks** - Even presence is encrypted
- **No unencrypted messages** - Encryption is mandatory, not optional

### Communication
- **Real-time messaging** - Instant delivery via Gun.js mesh network
- **Friend system** - Secure invite links (24-hour expiry)
- **Offline messages** - Delivered when friend comes online
- **Typing indicators** - See when friends are typing
- **Online presence** - Know when friends are available
- **Encryption key sync** - Automatic key exchange between friends

### Technical Excellence
- **Progressive Web App** - Install on any device
- **Gun.js powered** - Fully decentralized messaging
- **Relay network** - Messages always delivered through Gun relays
- **React + Vite** - Lightning-fast performance
- **Mobile responsive** - Beautiful on all devices

## 🚀 Quick Start

### Install & Run
```bash
# Clone the repository
git clone https://github.com/danxdz/Whisperz.git
cd Whisperz

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗️ First Time Setup

Since Whisperz is an **invite-only** application, you'll need to create the first account to start using it.

### Create Your Admin Account

1. **Deploy the app** to Vercel/Netlify or run locally
2. **Open your deployed app** in a browser
3. **Open Developer Console** (F12)
4. **Run this command** to access registration:
   ```javascript
   window.location.hash = '#register';
   ```
5. **Register** your admin account with username, password, and nickname
6. **Save your credentials** securely!

### Generate Invite Links

Once logged in:
1. Click the **"+"** button (Add Friend)
2. Click **"Generate Invite Link"**
3. Copy and share the invite link with friends

### Development Setup

For local development:
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

In development mode, you can create test accounts without invites.

## 🔐 Security Architecture

### Encryption Layers
1. **Layer 1: Gun.SEA (Elliptic Curve)**
   - ECDH key exchange for message encryption
   - Unique shared secrets per user pair
   - Cryptographically unbreakable

2. **Layer 2: WebCrypto AES-GCM**
   - 600,000 PBKDF2 iterations (OWASP recommended)
   - Authenticated encryption (confidentiality + integrity)
   - Hardware-accelerated via WebCrypto API
   - 12-byte IV with automatic authentication tag

### Security Audit Results
- **Message Security:** 10/10 - Military grade
- **Key Management:** 9/10 - Very strong
- **Implementation:** 9/10 - Simplified & robust
- **Overall Score:** 9/10 - Production ready

[Full Security Analysis →](./DEEP_SECURITY_ANALYSIS.md)

## 🛡️ Privacy Guarantees

### What We DON'T Collect
- ❌ Phone numbers
- ❌ Email addresses  
- ❌ IP addresses (anonymized)
- ❌ Device information
- ❌ Analytics or tracking
- ❌ Cookies
- ❌ Personal data

### What's Encrypted
- ✅ All messages (E2E)
- ✅ Friend relationships
- ✅ User profiles
- ✅ Presence status
- ✅ Typing indicators

### What's Public (Encrypted)
- Invite metadata (encrypted)
- User public keys (required for crypto)
- Presence signals (encrypted)

## 🌐 Deployment

### Deploy to Vercel (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/danxdz/Whisperz)

### Deploy to Netlify
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/danxdz/Whisperz)

### Environment Variables
```env
# Optional - for persistent invite links
VITE_INVITE_SECRET=your-secret-key-minimum-32-characters

# Optional - custom Gun relay
VITE_GUN_PEERS=https://your-gun-relay.com/gun
```

## 🔧 Configuration

### Gun Relay Network
Whisperz uses Gun.js decentralized relay network for message delivery:
- **Default relays:** Multiple public Gun relays for redundancy
- **Custom relays:** Deploy your own for maximum privacy
- **Fully decentralized:** Messages flow through the Gun mesh network
- **Always available:** No single point of failure

### Security Configuration
All security settings are pre-configured for maximum protection:
- CSP headers implemented
- XSS protection enabled
- Rate limiting active
- Secure session management

## 📱 Features in Detail

### Friend System
- Generate secure invite links
- 24-hour expiration
- One-time use only
- Cryptographic signatures
- No friend requests - instant connection

### Message Features
- Real-time delivery
- Offline message queue
- Read receipts
- Typing indicators
- Message persistence

### Privacy Features
- No account recovery (by design)
- No password reset (security feature)
- Local data encryption
- Automatic session timeout
- Secure logout

## 🧪 Testing

```bash
# Run linter
npm run lint

# Format code
npm run format

# Security audit
npm audit

# Build test
npm run build
```

## 📊 Performance

- **Bundle size:** 380KB (118KB gzipped)
- **First paint:** <1 second
- **Time to interactive:** <2 seconds
- **Lighthouse score:** 95+
- **Memory efficient:** No polling, event-driven

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

### Development Setup
1. Fork the repository
2. Create your feature branch
3. Run tests and linting
4. Submit a pull request

## 📈 Recent Improvements (v2.1.1)

### Architecture Simplification
- ✅ **WebRTC Removal** - Simplified to Gun.js only for better reliability
- ✅ **Reduced complexity** - Single messaging system instead of dual WebRTC/Gun
- ✅ **Better maintainability** - Fewer moving parts, more predictable behavior
- ✅ **Improved build process** - Faster builds, smaller bundle size
- ✅ **Removed peerjs dependency** - No more WebRTC connection issues

### Security Enhancements
- ✅ **WebCrypto AES-GCM Upgrade** - Replaced AES-CBC+HMAC with modern AEAD
- ✅ **OWASP PBKDF2** - Increased iterations to 600k for quantum resistance
- ✅ **Hardware-accelerated encryption** - Native WebCrypto API performance
- ✅ **Fixed cryptographic randomness** for invite codes
- ✅ **Timing-safe comparisons** implemented
- ✅ **Removed all default secrets**

### Performance Optimizations
- ✅ **Fixed memory leaks** - Proper timeout cleanup in App.jsx
- ✅ **ErrorBoundary implementation** - Graceful error handling
- ✅ **React.memo optimization** for expensive components
- ✅ **Removed polling intervals** - Event-driven updates
- ✅ **Bundle size reduction** - Removed crypto-js dependency

### Code Quality
- ✅ **WebCrypto integration** - Modern browser crypto API
- ✅ **Enhanced error handling** - Comprehensive try-catch blocks
- ✅ **Debug logger consistency** - Professional logging system
- ✅ **Trailing whitespace cleanup** - Consistent formatting
- ✅ **Backup service modernization** - WebCrypto AES-GCM

## 🔍 Security Audits

- [Deep Security Analysis](./DEEP_SECURITY_ANALYSIS.md) - Comprehensive cryptographic review
- [Security Audit Report](./SECURITY_AUDIT_REPORT.md) - Full vulnerability assessment
- [Code Quality Report](./DEEP_SCAN_REPORT.md) - Performance and quality analysis

## 🚨 Security Disclosure

Found a security issue? Please email security@whisperz.app or open a [security advisory](https://github.com/danxdz/Whisperz/security/advisories).

## 📜 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [Gun.js](https://gun.eco/) - Decentralized database & messaging
- [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) - Modern browser cryptography
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Fast build tool

## 💬 Support

- [GitHub Issues](https://github.com/danxdz/Whisperz/issues)
- [Discussions](https://github.com/danxdz/Whisperz/discussions)
- [Wiki](https://github.com/danxdz/Whisperz/wiki)

---

<div align="center">

**Built with ❤️ for privacy advocates**

[Website](https://whisperz.app) • [Documentation](./docs) • [Security](./SECURITY.md)

</div>