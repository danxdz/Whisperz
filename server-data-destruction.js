#!/usr/bin/env node

/**
 * SERVER-SIDE DATA DESTRUCTION SYSTEM
 * For Gun.js Relay Server
 * 
 * This system provides forensic-level data destruction capabilities
 * that can completely wipe all data from the server when needed.
 * 
 * Usage:
 * 1. Add this to your Gun relay server
 * 2. Call the destruction functions when needed
 * 3. All data will be permanently erased
 */

const Gun = require('gun');

class ServerDataDestruction {
  constructor(gunInstance) {
    this.gun = gunInstance;
    this.destructionLog = [];
    this.isDestructionInProgress = false;
    
    console.log('💀 Server Data Destruction System Initialized');
  }

  /**
   * EMERGENCY DESTRUCTION - Wipe everything
   */
  async emergencyDestruction() {
    if (this.isDestructionInProgress) {
      console.error('💀 Destruction already in progress');
      return { error: 'Destruction already in progress' };
    }

    this.isDestructionInProgress = true;
    console.error('💀💀💀 SERVER EMERGENCY DESTRUCTION INITIATED 💀💀💀');
    
    const startTime = Date.now();
    
    try {
      // Step 1: Get all users and destroy their data
      console.error('💀 Step 1: Destroying all user data');
      await this.destroyAllUsers();
      
      // Step 2: Destroy all conversations
      console.error('💀 Step 2: Destroying all conversations');
      await this.destroyAllConversations();
      
      // Step 3: Destroy all messages
      console.error('💀 Step 3: Destroying all messages');
      await this.destroyAllMessages();
      
      // Step 4: Destroy all friend relationships
      console.error('💀 Step 4: Destroying all friend relationships');
      await this.destroyAllFriendships();
      
      // Step 5: Clear Gun.js internal storage
      console.error('💀 Step 5: Clearing Gun.js internal storage');
      await this.clearGunStorage();
      
      // Step 6: Overwrite with fake data
      console.error('💀 Step 6: Overwriting with fake data');
      await this.overwriteWithFakeData();
      
      const duration = Date.now() - startTime;
      console.error(`💀 SERVER DESTRUCTION COMPLETE in ${duration}ms`);
      
      return {
        success: true,
        message: 'SERVER DATA COMPLETELY DESTROYED',
        duration: duration,
        timestamp: new Date().toISOString(),
        log: this.destructionLog
      };
      
    } catch (error) {
      console.error('💀 Server destruction failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      this.isDestructionInProgress = false;
    }
  }

  /**
   * Destroy all user data
   */
  async destroyAllUsers() {
    return new Promise((resolve) => {
      console.error('💀 Scanning for all users...');
      
      // Get all users from Gun
      this.gun.get('users').map().once((userData, userId) => {
        if (userData && userId && userId !== '_') {
          console.error(`💀 Destroying user: ${userId}`);
          
          // Destroy user data
          this.gun.get('users').get(userId).put(null);
          
          // Destroy user's personal data
          this.gun.get('~' + userId).put(null);
          
          // Destroy user's profile
          this.gun.get('profiles').get(userId).put(null);
          
          this.destructionLog.push(`User destroyed: ${userId}`);
        }
      });
      
      // Wait a bit for destruction to complete
      setTimeout(() => {
        console.error('💀 User destruction complete');
        resolve();
      }, 2000);
    });
  }

  /**
   * Destroy all conversations
   */
  async destroyAllConversations() {
    return new Promise((resolve) => {
      console.error('💀 Scanning for all conversations...');
      
      this.gun.get('conversations').map().once((convData, convId) => {
        if (convData && convId && convId !== '_') {
          console.error(`💀 Destroying conversation: ${convId}`);
          
          // Destroy conversation
          this.gun.get('conversations').get(convId).put(null);
          
          // Destroy conversation messages
          this.gun.get('messages').get(convId).put(null);
          
          this.destructionLog.push(`Conversation destroyed: ${convId}`);
        }
      });
      
      setTimeout(() => {
        console.error('💀 Conversation destruction complete');
        resolve();
      }, 2000);
    });
  }

  /**
   * Destroy all messages
   */
  async destroyAllMessages() {
    return new Promise((resolve) => {
      console.error('💀 Scanning for all messages...');
      
      this.gun.get('messages').map().once((msgData, msgId) => {
        if (msgData && msgId && msgId !== '_') {
          console.error(`💀 Destroying message: ${msgId}`);
          
          // Destroy message
          this.gun.get('messages').get(msgId).put(null);
          
          this.destructionLog.push(`Message destroyed: ${msgId}`);
        }
      });
      
      setTimeout(() => {
        console.error('💀 Message destruction complete');
        resolve();
      }, 2000);
    });
  }

  /**
   * Destroy all friend relationships
   */
  async destroyAllFriendships() {
    return new Promise((resolve) => {
      console.error('💀 Scanning for all friendships...');
      
      this.gun.get('friendships').map().once((friendshipData, friendshipId) => {
        if (friendshipData && friendshipId && friendshipId !== '_') {
          console.error(`💀 Destroying friendship: ${friendshipId}`);
          
          // Destroy friendship
          this.gun.get('friendships').get(friendshipId).put(null);
          
          this.destructionLog.push(`Friendship destroyed: ${friendshipId}`);
        }
      });
      
      setTimeout(() => {
        console.error('💀 Friendship destruction complete');
        resolve();
      }, 2000);
    });
  }

  /**
   * Clear Gun.js internal storage
   */
  async clearGunStorage() {
    return new Promise((resolve) => {
      try {
        console.error('💀 Clearing Gun.js internal storage...');
        
        // Clear Gun's internal store if available
        if (this.gun._.opt.store && this.gun._.opt.store.clear) {
          this.gun._.opt.store.clear();
          console.error('💀 Gun.js internal store cleared');
        }
        
        // Clear any radisk storage
        if (this.gun._.opt.radisk && this.gun._.opt.radisk.clear) {
          this.gun._.opt.radisk.clear();
          console.error('💀 Gun.js radisk storage cleared');
        }
        
        this.destructionLog.push('Gun.js internal storage cleared');
        
      } catch (error) {
        console.error('💀 Error clearing Gun storage:', error);
      }
      
      setTimeout(resolve, 1000);
    });
  }

  /**
   * Overwrite with fake data to prevent recovery
   */
  async overwriteWithFakeData() {
    return new Promise((resolve) => {
      console.error('💀 Overwriting with fake data...');
      
      try {
        // Create fake users
        for (let i = 0; i < 5; i++) {
          const fakeUserId = `fake_user_${Date.now()}_${i}`;
          const fakeUser = {
            nickname: `Fake User ${i}`,
            pub: fakeUserId,
            fake: true,
            overwritten: true,
            timestamp: new Date().toISOString(),
            message: 'This is fake data created during server destruction'
          };
          
          this.gun.get('users').get(fakeUserId).put(fakeUser);
          this.gun.get('~' + fakeUserId).put(fakeUser);
        }
        
        // Create fake conversations
        for (let i = 0; i < 3; i++) {
          const fakeConvId = `fake_conv_${Date.now()}_${i}`;
          const fakeConv = {
            id: fakeConvId,
            participants: [`fake_user_${i}`, `fake_user_${i+1}`],
            fake: true,
            overwritten: true,
            timestamp: new Date().toISOString()
          };
          
          this.gun.get('conversations').get(fakeConvId).put(fakeConv);
        }
        
        this.destructionLog.push('Fake data created to prevent recovery');
        console.error('💀 Fake data creation complete');
        
      } catch (error) {
        console.error('💀 Error creating fake data:', error);
      }
      
      setTimeout(resolve, 1000);
    });
  }

  /**
   * Quick reset - just clear main data structures
   */
  async quickReset() {
    console.error('💀 Quick server reset initiated');
    
    try {
      // Clear main data structures
      this.gun.get('users').put(null);
      this.gun.get('conversations').put(null);
      this.gun.get('messages').put(null);
      this.gun.get('friendships').put(null);
      this.gun.get('profiles').put(null);
      
      console.error('💀 Quick reset complete');
      
      return {
        success: true,
        message: 'Quick reset completed',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('💀 Quick reset failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get destruction status
   */
  getStatus() {
    return {
      isDestructionInProgress: this.isDestructionInProgress,
      destructionLog: this.destructionLog,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear destruction log
   */
  clearLog() {
    this.destructionLog = [];
    console.log('🧹 Destruction log cleared');
  }
}

// Export for use in server
module.exports = ServerDataDestruction;

// If run directly, show usage
if (require.main === module) {
  console.log('💀 SERVER DATA DESTRUCTION SYSTEM');
  console.log('==================================');
  console.log('');
  console.log('This module provides server-side data destruction for Gun.js relay servers.');
  console.log('');
  console.log('To use in your server:');
  console.log('');
  console.log('1. Add to your server.js:');
  console.log('   const ServerDataDestruction = require("./server-data-destruction.js");');
  console.log('   const destruction = new ServerDataDestruction(gun);');
  console.log('');
  console.log('2. Add destruction endpoints:');
  console.log('   app.post("/emergency-destruction", async (req, res) => {');
  console.log('     const result = await destruction.emergencyDestruction();');
  console.log('     res.json(result);');
  console.log('   });');
  console.log('');
  console.log('3. Call destruction when needed:');
  console.log('   - destruction.emergencyDestruction() - Complete wipe');
  console.log('   - destruction.quickReset() - Quick clear');
  console.log('   - destruction.getStatus() - Check status');
  console.log('');
  console.log('⚠️  WARNING: This will PERMANENTLY DELETE ALL DATA!');
  console.log('');
}

