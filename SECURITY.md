# Security Policy

## 🔒 Security Features

### Encryption
- **End-to-End Encryption**: All messages encrypted with AES-256-CBC + HMAC-SHA256
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Public Key Cryptography**: Invite links now use Gun.SEA signatures (no shared secrets in client)
- **Message Authentication**: HMAC verification for all encrypted messages

### Authentication
- **Gun.SEA**: Cryptographic user authentication
- **Public Key Verification**: Invites verified using sender's public key
- **Rate Limiting**: Login attempts limited to prevent brute force
- **Session Management**: Automatic timeout and secure logout

### Data Protection
- **No Central Server**: Fully decentralized architecture
- **Offline Message Limits**: Max 100 messages per recipient, 10KB per message
- **Input Validation**: XSS protection via HTML escaping
- **Content Security Policy**: Restrictive CSP headers

## ⚠️ Known Limitations

### WebRTC
- **IP Address Exposure**: WebRTC may leak real IP addresses
- **STUN/TURN Dependency**: Relies on third-party signaling servers
- **Browser Compatibility**: Requires modern browser with WebRTC support

### Gun.js
- **Public Relay Servers**: Default relays are publicly accessible
- **Data Persistence**: Messages stored on relay servers (encrypted)
- **No Perfect Forward Secrecy**: Same keys used for all messages in a conversation

## 🛡️ Security Best Practices

### For Users
1. **Strong Passwords**: Use unique, complex passwords
2. **Verify Invites**: Only accept invites from trusted sources
3. **Regular Logouts**: Log out when not in use
4. **Private Networks**: Avoid public WiFi when possible

### For Deployment
1. **Environment Variables**: Never commit secrets to repository
2. **HTTPS Only**: Always deploy with SSL/TLS
3. **Custom Relays**: Consider running your own Gun.js relay servers
4. **Regular Updates**: Keep dependencies updated (now pinned for stability)

## 🔍 Security Auditing

### Recent Improvements (v2.1.0)
- ✅ Removed shared secrets from client build
- ✅ Added connection status indicators
- ✅ Implemented offline message queue limits
- ✅ Pinned all dependencies to exact versions
- ✅ Added comprehensive error handling

### Pending Improvements
- [ ] WebRTC/WebCrypto fallback detection
- [ ] Automated security tests
- [ ] Light theme for accessibility
- [ ] Perfect forward secrecy
- [ ] Custom STUN/TURN servers

## 🐛 Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities.

Instead, please email security concerns to the maintainer with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## 📊 Security Metrics

- **Encryption Strength**: AES-256 + PBKDF2 (100k iterations)
- **Max Offline Queue**: 100 messages per recipient
- **Max Message Size**: 10KB
- **Session Timeout**: 30 minutes of inactivity
- **Login Rate Limit**: 5 attempts per 15 minutes

## 🔐 Cryptographic Details

### Message Encryption
```javascript
Algorithm: AES-256-CBC
Key Derivation: PBKDF2-SHA256 (100,000 iterations)
Authentication: HMAC-SHA256
IV: Random 16 bytes per message
```

### Invite System
```javascript
Signature: Gun.SEA.sign() with user's private key
Verification: Gun.SEA.verify() with sender's public key
Expiration: 24 hours
Single-use: Enforced via Gun.js storage
```

## 📝 Compliance

This application is designed for personal use and may not meet regulatory requirements for:
- HIPAA (healthcare)
- GDPR (without additional measures)
- Financial services regulations

Users are responsible for ensuring compliance with applicable laws.

## 🚀 Version History

- **v2.1.0** (Current): Major security improvements, removed client secrets
- **v2.0.0**: Enhanced encryption, invite-only system
- **v1.0.0**: Initial release with basic encryption

Last Updated: December 2024