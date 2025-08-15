# 🚀 Whisperz - Decentralized P2P Chat Application

<div align="center">
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org)
  [![React Version](https://img.shields.io/badge/react-18.3.1-61dafb)](https://reactjs.org/)
  [![Gun.js](https://img.shields.io/badge/gun.js-0.2020.1239-orange)](https://gun.eco/)
  [![PeerJS](https://img.shields.io/badge/peerjs-1.5.4-red)](https://peerjs.com/)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
  [![Code Style](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
  
  <h3>A modern, secure, and fully decentralized peer-to-peer chat application</h3>
  <p>Built with React, WebRTC, and Gun.js | Features end-to-end encryption, offline message delivery, and a beautiful Unix-inspired dark theme</p>
  
  [Demo](https://whisperz.vercel.app) • [Documentation](#-documentation) • [Report Bug](https://github.com/danxdz/Whisperz/issues) • [Request Feature](https://github.com/danxdz/Whisperz/issues)
  
</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Usage Guide](#-usage-guide)
- [Architecture](#-architecture)
- [Deployment](#-deployment)
- [Configuration](#-configuration)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Core Functionality
- **🔐 End-to-End Encryption**: All messages encrypted with AES-256
- **👥 Decentralized Architecture**: No central server required
- **📡 WebRTC P2P Messaging**: Direct peer-to-peer communication
- **💾 Offline Message Delivery**: Messages stored and delivered when recipient comes online
- **🔗 Secure Invite System**: HMAC-signed invite links with single-use protection
- **🟢 Real-time Presence**: See when friends are online/offline
- **⌨️ Typing Indicators**: Know when someone is typing

### User Experience
- **🎨 Beautiful Dark Theme**: Unix-inspired green-on-black aesthetic
- **📱 Mobile Responsive**: Works perfectly on all devices
- **🛠️ Developer Tools**: Built-in debugging panel for mobile
- **⚡ Fast & Lightweight**: Optimized for performance
- **🔄 Auto-reconnect**: Automatic connection recovery

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- npm >= 7.0.0

### Installation

1. Clone the repository:
```bash
git clone https://github.com/danxdz/Whisperz.git
cd Whisperz
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional):
```env
VITE_GUN_PEERS=https://your-gun-relay.com/gun
VITE_PEERJS_HOST=your-peerjs-server.com:443
VITE_INVITE_SECRET=your-secret-key-for-invites
```

4. Start the development server:
```bash
npm run dev
```

5. Open http://localhost:5173 in your browser

## 📖 Usage Guide

### Getting Started
1. **Create an Account**: Register with a username and password
2. **Add Friends**: Click the "+" button to generate an invite link
3. **Share Invite**: Send the invite link to your friend
4. **Start Chatting**: Select a friend and start messaging!

### Developer Tools
- Press `Ctrl+D` (or `Cmd+D` on Mac) to open developer tools
- On mobile, tap the 🛠️ button in the bottom-right corner

### Keyboard Shortcuts
- `Ctrl/Cmd + D`: Toggle developer tools
- `Enter`: Send message
- `Escape`: Close modals

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 with Vite
- **P2P Communication**: WebRTC via PeerJS
- **Data Persistence**: Gun.js (decentralized database)
- **Encryption**: AES-256 with PBKDF2 key derivation
- **Authentication**: Gun.SEA (Security, Encryption, Authorization)
- **Styling**: Custom CSS with CSS Variables

### Service Architecture
```
src/services/
├── webrtcService.js       # WebRTC/PeerJS P2P connections
├── gunAuthService.js      # User authentication with Gun.SEA
├── hybridGunService.js    # Data persistence and offline storage
├── encryptionService.js   # AES-256 message encryption
├── friendsService.js      # Friend relationships and invites
└── messageService.js      # Message sending/receiving logic
```

### Data Flow
1. **Primary**: WebRTC for real-time P2P messaging
2. **Fallback**: Gun.js for offline message storage
3. **Encryption**: All data encrypted before transmission
4. **Persistence**: Local and distributed storage via Gun.js

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Fork this repository

2. Connect to Vercel:
```bash
npm i -g vercel
vercel
```

3. Set environment variables in Vercel dashboard:
   - `VITE_GUN_PEERS`: Custom Gun relay servers (optional)
   - `VITE_PEERJS_HOST`: Custom PeerJS server (optional)
   - `VITE_INVITE_SECRET`: Secret for HMAC invite signatures

4. Deploy:
```bash
vercel --prod
```

### Deploy with GitHub Actions

1. Add these secrets to your GitHub repository:
   - `VERCEL_TOKEN`: Your Vercel authentication token
   - `VITE_GUN_PEERS`: Gun.js relay servers (optional)
   - `VITE_PEERJS_HOST`: PeerJS server (optional)
   - `VITE_INVITE_SECRET`: Invite HMAC secret

2. Push to main branch to trigger automatic deployment

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy the `dist` folder to any static hosting service

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_GUN_PEERS` | Comma-separated Gun.js relay URLs | Public Gun relays |
| `VITE_PEERJS_HOST` | Custom PeerJS server (host:port) | Public PeerJS cloud |
| `VITE_INVITE_SECRET` | HMAC secret for invite links | `default-invite-secret` |

### Custom Gun Relay

To run your own Gun relay server:

```javascript
// gun-server.js
const Gun = require('gun');
const server = require('http').createServer().listen(8765);
Gun({ web: server });
console.log('Gun relay running on http://localhost:8765/gun');
```

### Custom PeerJS Server

To run your own PeerJS server:

```bash
npm install -g peer
peerjs --port 9000 --key peerjs
```

## 🔒 Security Features

- **End-to-End Encryption**: AES-256-CBC with PBKDF2
- **Secure Authentication**: Gun.SEA cryptographic auth
- **HMAC Invite Links**: Tamper-proof invite system
- **XSS Prevention**: Sanitized message rendering
- **CSP Headers**: Content Security Policy via Vercel
- **Single-Use Invites**: Prevents invite link reuse
- **24-Hour Expiry**: Invite links expire after 24 hours

## 📱 Mobile Support

The application is fully responsive and optimized for mobile devices:

- Touch-friendly interface
- Mobile-specific developer tools
- Optimized performance for slower connections
- PWA-ready (can be added to home screen)

## 🧪 Testing

Run tests (when configured):
```bash
npm run test
```

Run linter:
```bash
npm run lint
```

## 🐛 Debugging

### Common Issues

1. **Connection Failed**: Check if WebRTC is blocked by firewall
2. **Messages Not Sending**: Ensure both users are online or wait for offline delivery
3. **Invite Link Invalid**: Links expire after 24 hours or single use

### Developer Tools Features

- Database statistics viewer
- Console log capture for mobile
- Clear all data function
- Export logs feature
- Real-time connection monitoring

## 📊 Performance

- **Initial Load**: < 200KB gzipped
- **Time to Interactive**: < 2 seconds
- **Message Latency**: < 100ms (P2P)
- **Offline Support**: Full functionality

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Gun.js](https://gun.eco/) - Decentralized database
- [PeerJS](https://peerjs.com/) - WebRTC abstraction
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool

## 📞 Support

For issues and questions:
- [Open an issue](https://github.com/danxdz/Whisperz/issues/new)
- Check the built-in developer tools
- Review the console logs for errors

## 🚀 Roadmap

- [ ] Voice/Video calling
- [ ] File sharing
- [ ] Group chats
- [ ] Message reactions
- [ ] Read receipts
- [ ] Message search
- [ ] Export chat history
- [ ] Theme customization
- [ ] Multi-device sync
- [ ] Push notifications

---

<div align="center">
  <strong>Built with ❤️ for the decentralized web</strong>
  <br>
  <sub>© 2024 Whisperz Team. All rights reserved.</sub>
</div>
