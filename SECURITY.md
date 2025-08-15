# Security Policy for Whisperz

## 🔒 Security Features

### Encryption
- **AES-CBC + HMAC-SHA256** for authenticated encryption
- **100,000 PBKDF2 iterations** for key derivation
- **Gun.SEA** for user authentication
- **End-to-end encryption** for all messages

### Authentication & Authorization
- **HMAC-signed invite links** with expiration
- **Single-use invites** to prevent reuse
- **Rate limiting** on login attempts (5 per minute)
- **Session timeout** after 30 minutes of inactivity

### Input Validation & XSS Protection
- **HTML escaping** for all user-generated content
- **Input sanitization** and length limits
- **Content Security Policy** headers
- **Secure error handling** without information leakage

## 🚨 Security Configuration

### Required Environment Variables

```bash
# Generate secure secrets (never use defaults!)
npm run generate-secrets
```

### Production Checklist

- [ ] Generate unique `VITE_INVITE_SECRET` (64+ characters)
- [ ] Use HTTPS only
- [ ] Enable CSP headers
- [ ] Regular security audits with `npm audit`
- [ ] Keep dependencies updated
- [ ] Monitor for security alerts

## 🛡️ Threat Model

### Protected Against
- ✅ XSS attacks
- ✅ CSRF attacks
- ✅ Brute force login attempts
- ✅ Message tampering
- ✅ Invite link reuse
- ✅ Timing attacks
- ✅ Session hijacking

### Known Limitations
- ⚠️ Client-side encryption (keys in browser memory)
- ⚠️ No perfect forward secrecy
- ⚠️ Relies on Gun.js relay security
- ⚠️ WebRTC may leak IP addresses

## 🔍 Security Auditing

### Run Security Checks
```bash
# Check for vulnerable dependencies
npm run security-check

# Update dependencies
npm update

# Audit and fix
npm audit fix
```

### Manual Security Review
1. Check for hardcoded secrets: `grep -r "secret\|password\|key" src/`
2. Review CSP violations in browser console
3. Test rate limiting by attempting multiple logins
4. Verify HTTPS is enforced in production

## 🚫 Security Anti-Patterns to Avoid

### Never Do This
```javascript
// ❌ NEVER use default secrets
const secret = process.env.SECRET || 'default-secret';

// ❌ NEVER store sensitive data in localStorage
localStorage.setItem('password', userPassword);

// ❌ NEVER use innerHTML with user input
element.innerHTML = userInput;

// ❌ NEVER log sensitive information
console.log('User password:', password);
```

### Always Do This
```javascript
// ✅ Require proper secrets
if (!secret || secret === 'default-secret') {
  throw new Error('Security configuration required');
}

// ✅ Use session storage sparingly
sessionStorage.setItem('tempData', nonSensitiveData);

// ✅ Escape user input
element.textContent = escapeHtml(userInput);

// ✅ Sanitize logs
console.log('Login attempt for user:', username);
```

## 📊 Security Metrics

### Key Security Indicators
- **PBKDF2 Iterations**: 100,000
- **Session Timeout**: 30 minutes
- **Rate Limit**: 5 attempts/minute
- **Invite Expiry**: 24 hours
- **Max Message Length**: 1,000 characters
- **Max Username Length**: 20 characters

## 🐛 Reporting Security Issues

### Responsible Disclosure

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. **DO NOT** exploit the vulnerability
3. Email security details to: [security@whisperz.app]
4. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Security Update Process

1. Vulnerability reported
2. Issue confirmed and assessed
3. Fix developed and tested
4. Security update released
5. Users notified to update

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Mozilla Web Security](https://infosec.mozilla.org/guidelines/web_security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [WebRTC Security](https://webrtc-security.github.io/)

## 🔄 Version History

| Version | Date | Security Changes |
|---------|------|-----------------|
| 2.0.0 | 2024 | Major security overhaul: authenticated encryption, rate limiting, CSP |
| 1.0.0 | 2024 | Initial release with basic encryption |

## ✅ Compliance

This application implements security best practices aligned with:
- OWASP Application Security Verification Standard (ASVS)
- Mozilla Web Security Guidelines
- NIST Cryptographic Standards

---

**Last Updated**: 2024
**Security Contact**: security@whisperz.app