# Gun Relay Setup Instructions for New Agent

## Overview
This document contains everything needed to create and deploy a Gun.js relay server for the Whisperz P2P chat application.

## Purpose
The Gun relay server allows mobile devices and browsers behind NAT/firewalls to connect to each other. Without this, users can't connect directly due to network restrictions.

## Files to Create

### 1. Create Directory
```bash
mkdir gun-relay
cd gun-relay
git init
```

### 2. Create `package.json`
```json
{
  "name": "gun-relay",
  "version": "1.0.0",
  "description": "Private Gun.js relay server for Whisperz P2P chat",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "engines": {
    "node": ">=14.0.0"
  },
  "dependencies": {
    "gun": "^0.2020.1239",
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "keywords": ["gun", "relay", "p2p", "websocket"],
  "author": "",
  "license": "MIT"
}
```

### 3. Create `server.js`
```javascript
const Gun = require('gun');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8765;

// Enable CORS for all origins
app.use(cors());

// Serve Gun
app.use(Gun.serve);

// Health check endpoint
app.get('/', (req, res) => {
  res.send(`
    <h1>🔫 Gun Relay Server Active</h1>
    <p>Status: ✅ Running</p>
    <p>Port: ${PORT}</p>
    <p>WebSocket endpoint: wss://${req.get('host')}/gun</p>
    <hr>
    <p>Add this to your Whisperz app:</p>
    <code>localStorage.setItem('GUN_CUSTOM_PEERS', 'https://${req.get('host')}/gun')</code>
  `);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Gun relay server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/gun`);
});

// Initialize Gun with the server
const gun = Gun({ 
  web: server,
  radisk: true, // Enable storage
  localStorage: false, // Disable in Node.js
  peers: [] // No default peers - pure relay
});

// Optional: Log connections
gun.on('hi', peer => {
  console.log('👋 Peer connected:', peer.url || 'direct');
});

gun.on('bye', peer => {
  console.log('👻 Peer disconnected:', peer.url || 'direct');
});

console.log('✅ Gun.js relay initialized');
console.log('🔒 No public peers - private relay mode');
```

### 4. Create `.gitignore`
```
node_modules/
.env
.env.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
data/
radata/
*.log
```

### 5. Create `render.yaml` (for Render.com deployment)
```yaml
services:
  - type: web
    name: gun-relay
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: PORT
        value: 10000
```

### 6. Create `README.md`
```markdown
# Gun Relay Server for Whisperz

Private Gun.js relay server for Whisperz P2P chat.

## Deploy to Render

1. Push this code to GitHub
2. Go to [render.com](https://render.com)
3. New > Web Service
4. Connect your GitHub repo
5. Deploy with free tier

## Connect from Whisperz

Add your relay URL:
\`\`\`javascript
localStorage.setItem('GUN_CUSTOM_PEERS', 'https://your-relay.onrender.com/gun')
\`\`\`

## Local Testing
\`\`\`bash
npm install
npm start
\`\`\`
```

## Deployment Steps

### Step 1: Create GitHub Repository
```bash
# In gun-relay directory
git add -A
git commit -m "Initial commit - Gun relay server"
git branch -M main
git remote add origin https://github.com/danxdz/gun-relay.git
git push -u origin main
```

### Step 2: Deploy to Render.com (Recommended - FREE)

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Deploy the Relay**
   - Click "New +" → "Web Service"
   - Connect GitHub repository `gun-relay`
   - Settings:
     - **Name**: gun-relay (or any name)
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: Free
   - Click "Create Web Service"

3. **Get Your Relay URL**
   - After deployment, you'll get: `https://gun-relay-xxxx.onrender.com`
   - Visit the URL to see the status page

### Step 3: Configure Whisperz to Use Relay

Users need to add the relay URL to their Whisperz app:

**Option A: Browser Console**
```javascript
// Open Whisperz app
// Press F12 for console
// Run this command:
localStorage.setItem('GUN_CUSTOM_PEERS', 'https://gun-relay-xxxx.onrender.com/gun')
// Refresh the page
```

**Option B: Add UI Settings (for developer)**
Add this to Whisperz settings component:
```javascript
const addCustomRelay = (relayUrl) => {
  localStorage.setItem('GUN_CUSTOM_PEERS', relayUrl);
  window.location.reload();
};
```

## Alternative Deployment Options

### Deploy to Glitch.com (FREE)
1. Go to [glitch.com](https://glitch.com)
2. New Project → Import from GitHub
3. Import `github.com/danxdz/gun-relay`
4. Your relay: `https://your-project.glitch.me`

### Deploy to Railway (Paid - $5/month)
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select gun-relay repository
4. Deploy

### Deploy to Heroku (Free tier discontinued)
- No longer recommended

## Testing the Relay

### Test Locally
```bash
cd gun-relay
npm install
npm start
# Visit http://localhost:8765
```

### Test Connection
```javascript
// In browser console
const testGun = Gun({peers: ['https://your-relay.onrender.com/gun']});
testGun.get('test').put({hello: 'world'});
testGun.get('test').on(data => console.log('Received:', data));
```

## How It Works

1. **Mobile User A** → Connects to Relay → Sends encrypted message
2. **Relay** → Forwards message (can't decrypt it)
3. **Mobile User B** → Receives from Relay → Decrypts message

## Security Notes

- Relay CANNOT decrypt messages (E2E encrypted)
- Relay only forwards data between peers
- No permanent storage of messages
- Each user can run their own relay for privacy

## Troubleshooting

### Relay Not Connecting
- Check if WebSocket port is open
- Ensure CORS is enabled
- Check Render logs: Dashboard → Logs

### Mobile Can't Connect
- Ensure using HTTPS (not HTTP)
- Check if relay URL is correct
- Clear localStorage and re-add relay

## Multiple Relays for Redundancy

Users can add multiple relays:
```javascript
localStorage.setItem('GUN_CUSTOM_PEERS', 
  'https://relay1.onrender.com/gun,https://relay2.onrender.com/gun'
)
```

## Current Status

- **Whisperz Repo**: https://github.com/danxdz/Whisperz
- **Gun-Relay Repo**: https://github.com/danxdz/gun-relay (needs creation)
- **Deployment**: Ready for Render.com

## For New Agent

To complete setup:
1. Create files above in `/workspace/gun-relay/`
2. Push to GitHub repository `danxdz/gun-relay`
3. Deploy to Render.com
4. Share relay URL with users

The relay enables mobile devices to use Whisperz P2P chat!