#!/usr/bin/env node

// Quick test script for friend system
console.log(`
🧪 Quick Friend System Test

1. Create User A (Alice):
   http://localhost:5173/?setup=admin
   Username: alice${Date.now()}
   Password: test123

2. After login, open DevTools (F12) and run:
   await friendsService.generateInvite()
   
3. Copy the invite link from console

4. Open incognito/new browser with invite link

5. Register as Bob and test!

Alternative: Use curl to test the API directly
`);

// Generate test data
const timestamp = Date.now();
const inviteCode = 'TEST_' + timestamp + '_' + Math.random().toString(36).substr(2, 9);

console.log('\n📝 Test Data Generated:');
console.log('Timestamp:', timestamp);
console.log('Test Invite Code:', inviteCode);
console.log('Test URL: http://localhost:5173/?invite=' + inviteCode);
console.log('\nNote: This is just test data - you need to generate real invites through the app!');