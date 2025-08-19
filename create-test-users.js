#!/usr/bin/env node

import Gun from 'gun/gun.js';
import 'gun/sea.js';
import 'gun/axe.js';

// Configuration
const RELAY_PEERS = [
  'https://relay.peer.ooo/gun',
  'https://gun-relay.herokuapp.com/gun',
  'https://gunjs.herokuapp.com/gun'
];

// Initialize Gun
const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: false,
  radisk: false
});

const user = gun.user();

// Function to create a user
async function createUser(username, password) {
  return new Promise((resolve, reject) => {
    user.create(username, password, (ack) => {
      if (ack.err) {
        console.error(`❌ Failed to create ${username}:`, ack.err);
        reject(ack.err);
      } else {
        console.log(`✅ Created user: ${username}`);
        
        // Now login to get the public key
        user.auth(username, password, (authAck) => {
          if (authAck.err) {
            console.error(`❌ Failed to auth ${username}:`, authAck.err);
            reject(authAck.err);
          } else {
            const publicKey = user.is.pub;
            console.log(`   Public Key: ${publicKey}`);
            console.log(`   Alias: ${user.is.alias}`);
            resolve({ username, publicKey, user: user.is });
          }
        });
      }
    });
  });
}

// Function to generate invite for a user
async function generateInvite(username, password) {
  return new Promise((resolve, reject) => {
    // Login first
    user.auth(username, password, async (authAck) => {
      if (authAck.err) {
        console.error(`❌ Failed to auth ${username}:`, authAck.err);
        reject(authAck.err);
        return;
      }
      
      // Generate invite code
      const inviteCode = 'INV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const inviteData = {
        from: user.is.pub,
        nickname: username,
        createdAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        used: false
      };
      
      // Sign the invite
      const signature = await Gun.SEA.sign(JSON.stringify({
        from: inviteData.from,
        nickname: inviteData.nickname,
        createdAt: inviteData.createdAt
      }), user.is);
      
      inviteData.signature = signature;
      
      // Store in Gun
      gun.get('invites').get(inviteCode).put(inviteData);
      user.get('invites').get(inviteCode).put(inviteData);
      
      const inviteLink = `http://localhost:5173/?invite=${inviteCode}`;
      console.log(`\n🎟️  Invite generated for ${username}:`);
      console.log(`   Code: ${inviteCode}`);
      console.log(`   Link: ${inviteLink}`);
      console.log(`   Expires: ${new Date(inviteData.expiresAt).toLocaleString()}`);
      
      resolve({ inviteCode, inviteLink, inviteData });
    });
  });
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📝 Usage:
  node create-test-users.js create <username> <password>
  node create-test-users.js invite <username> <password>
  node create-test-users.js demo

Examples:
  node create-test-users.js create alice password123
  node create-test-users.js invite alice password123
  node create-test-users.js demo  # Creates alice & bob, generates invite
    `);
    process.exit(0);
  }
  
  const command = args[0];
  
  try {
    switch(command) {
      case 'create':
        if (args.length < 3) {
          console.error('❌ Please provide username and password');
          process.exit(1);
        }
        await createUser(args[1], args[2]);
        break;
        
      case 'invite':
        if (args.length < 3) {
          console.error('❌ Please provide username and password');
          process.exit(1);
        }
        await generateInvite(args[1], args[2]);
        break;
        
      case 'demo':
        console.log('🚀 Creating demo users...\n');
        
        // Create Alice
        const alice = await createUser('alice' + Date.now(), 'password123');
        
        // Generate invite from Alice
        const invite = await generateInvite(alice.username, 'password123');
        
        console.log('\n📋 Demo Setup Complete!');
        console.log('1. Alice is created and logged in');
        console.log('2. Invite link generated');
        console.log('3. Open invite link in another browser to create Bob');
        console.log(`\n🔗 Invite Link: ${invite.inviteLink}\n`);
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
    
    // Keep connection alive for a bit to ensure data syncs
    console.log('\n⏳ Syncing with Gun network...');
    setTimeout(() => {
      console.log('✅ Done!');
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run
main();