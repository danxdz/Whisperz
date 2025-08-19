# Friend System Test Plan

## Test Setup
Dev server running at: http://localhost:5173

## Test Flow:

### 1. Create Admin User (User A)
- Navigate to: http://localhost:5173/?setup=admin
- Register: `alice` / `password123`
- Should auto-login

### 2. Generate Invite
- Click friends panel (swipe right on mobile)
- Click "Generate Invite" button
- Copy invite link
- Check DevTools > Friends tab - should show pending invite

### 3. Create User B (New Browser/Incognito)
- Open invite link in incognito/different browser
- Register: `bob` / `password456`
- Should see "Invite accepted" message

### 4. Verify Friendship
- **User B**: Should immediately see Alice in friends
- **User A**: Should see Bob after ~2-10 seconds (real-time update)
- Both can now chat

### 5. Test Edge Cases
- Try using same invite again - should fail "Invalid invite"
- Generate new invite, let it expire (24h)
- Test remove friend functionality

## Expected Console Logs:
```
Attempt 1/5 - Invite not found yet, retrying...
Attempt 2/5 - Invite not found yet, retrying...
[Invite data syncs]
✅ Friendship established
```

## What's Fixed:
1. ✅ Retry mechanism for invite sync (5 attempts, 2s apart)
2. ✅ Pending invites tracking
3. ✅ Real-time friend updates
4. ✅ One-time use validation
5. ✅ QR code generation in InviteModal

## Known Issues to Watch:
- In 100% private mode, users can't find each other
- Mobile needs good network for WebSocket
- First sync might take 2-10 seconds