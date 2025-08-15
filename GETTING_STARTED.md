# 🚀 Getting Started with Whisperz

## How to Login and Use Whisperz

Since Whisperz is now an **invite-only** application, you need an invite link to create your first account. Here's how to get started:

## Option 1: First User Setup (For App Owner)

Since you're the app owner and this is a fresh deployment, you'll need to create the first account. Here's how:

### Step 1: Temporarily Enable Registration

1. **Locally modify the app** to allow the first registration:
   - Open `/src/App.jsx` 
   - Temporarily add a registration link back to the login page
   - Deploy this change

2. **Or use this quick workaround**:
   - Go to your deployed app: `https://your-app.vercel.app`
   - Open browser console (F12)
   - Run this command to bypass invite check for first user:
   ```javascript
   // This will take you directly to registration
   window.location.hash = '#register';
   ```

### Step 2: Create Your First Account

1. **Register** with:
   - Username: `admin` (or your preferred username)
   - Password: Choose a strong password
   - Nickname: Your display name

2. **Save your credentials** securely!

### Step 3: Generate Invite Links

Once logged in:
1. Click the **"+"** button (Add Friend)
2. Click **"Generate Invite Link"**
3. Copy the invite link
4. Share it with friends to let them join

## Option 2: Development/Testing Setup

For local development and testing:

### Create Test Accounts Locally

1. **Run the app locally**:
   ```bash
   cd /workspace/Whisperz-repo
   npm install
   npm run dev
   ```

2. **Open** `http://localhost:5173` in your browser

3. **Create test accounts**:
   - Since it's in development mode, the invite requirement is relaxed
   - You can create accounts for testing

## Option 3: Manual Database Setup (Advanced)

If you need to create accounts programmatically:

1. **Use the Gun.js console**:
   ```javascript
   // In browser console when app is running
   const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
   const user = gun.user();
   
   // Create a user
   user.create('testuser', 'testpass123', (ack) => {
     if(ack.err) {
       console.error('Error:', ack.err);
     } else {
       console.log('User created!');
       // Now login
       user.auth('testuser', 'testpass123', (ack) => {
         if(ack.err) {
           console.error('Login error:', ack.err);
         } else {
           console.log('Logged in!', ack);
         }
       });
     }
   });
   ```

## 🔐 Login Process

### For Existing Users:

1. **Go to** your Whisperz app
2. **Enter** your username and password
3. **Click** "Login"

### For New Users (Invite Required):

1. **Get an invite link** from an existing user
2. **Click the invite link** - it will redirect you to registration
3. **Create your account** with username, password, and nickname
4. **After registration**, you'll be automatically connected with the person who invited you

## 🎯 Quick Start for App Owner

Since you're setting up Whisperz for the first time, here's the fastest way:

### Create Your Admin Account:

1. **Open your Vercel deployment**: `https://whisperz.vercel.app` (or your custom domain)

2. **Open browser Developer Console** (F12)

3. **Run this command** to go directly to registration:
   ```javascript
   window.location.pathname = '/register';
   window.location.reload();
   ```

4. **Register** your admin account

5. **Start inviting friends!**

## 📱 Mobile Access

- The app works on mobile browsers
- Add to home screen for app-like experience:
  - iOS: Safari → Share → Add to Home Screen
  - Android: Chrome → Menu → Add to Home Screen

## 🛠️ Troubleshooting

### Can't Login?
- Make sure you're using the correct username (not nickname)
- Passwords are case-sensitive
- Clear browser cache if having issues

### Invite Link Not Working?
- Invite links are single-use
- They expire after being used once
- Generate a new link if needed

### Black Screen?
- Check browser console for errors (F12)
- Make sure JavaScript is enabled
- Try a different browser
- Clear cache and cookies

## 🔑 Security Notes

- **Never share your password**
- **Invite links are single-use** for security
- **Messages are end-to-end encrypted**
- **No central server** stores your messages

## 💡 Tips

1. **Username vs Nickname**: 
   - Username is for login (unique)
   - Nickname is your display name (can be anything)

2. **Offline Messages**: 
   - Messages sent while friend is offline will be delivered when they come online

3. **Developer Tools**: 
   - Press Ctrl+D (Cmd+D on Mac) to open debug panel
   - Useful for troubleshooting connection issues

## Need Help?

If you're still having issues logging in, check:
1. The browser console for errors
2. Your network connection
3. That JavaScript is enabled
4. Try incognito/private mode

---

*Remember: Whisperz is invite-only for security. The first user needs to use one of the workarounds above to create the initial account.*