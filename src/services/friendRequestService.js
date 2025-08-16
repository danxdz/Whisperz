import gunAuthService from './gunAuthService';
import friendsService from './friendsService';

class FriendRequestService {
  constructor() {
    this.gun = null;
    this.user = null;
    this.requestHandlers = new Set();
  }

  initialize() {
    this.gun = gunAuthService.gun;
    this.user = gunAuthService.user;
    
    // Listen for incoming friend requests
    this.listenForRequests();
  }

  // Send a friend request
  async sendFriendRequest(recipientPublicKey, message = '') {
    const currentUser = gunAuthService.getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    // Check if already friends
    const existingFriend = await friendsService.getFriend(recipientPublicKey);
    if (existingFriend) {
      throw new Error('Already friends with this user');
    }

    // Check if request already sent
    const existingRequest = await this.getRequest(recipientPublicKey, currentUser.pub);
    if (existingRequest && existingRequest.status === 'pending') {
      throw new Error('Friend request already sent');
    }

    const requestId = `req_${Date.now()}_${Math.random()}`;
    const request = {
      id: requestId,
      from: currentUser.pub,
      to: recipientPublicKey,
      message: message || 'Would like to connect with you',
      timestamp: Date.now(),
      status: 'pending',
      senderNickname: await friendsService.getUserNickname()
    };

    // Store request in both sender and recipient spaces
    // Sender's outgoing requests
    this.user.get('friend_requests')
      .get('sent')
      .get(requestId)
      .put(request);

    // Recipient's incoming requests
    this.gun.get('friend_requests')
      .get(recipientPublicKey)
      .get('received')
      .get(requestId)
      .put(request);

    console.log('📤 Friend request sent:', request);
    return request;
  }

  // Accept a friend request
  async acceptFriendRequest(requestId) {
    const currentUser = gunAuthService.getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    // Get the request
    const request = await this.getRequestById(requestId);
    if (!request) throw new Error('Friend request not found');
    if (request.to !== currentUser.pub) throw new Error('This request is not for you');
    if (request.status !== 'pending') throw new Error('Request already processed');

    // Update request status
    request.status = 'accepted';
    request.acceptedAt = Date.now();

    // Update in both places
    this.gun.get('friend_requests')
      .get(currentUser.pub)
      .get('received')
      .get(requestId)
      .put(request);

    this.gun.get('friend_requests')
      .get(request.from)
      .get('sent')
      .get(requestId)
      .put(request);

    // Add as friends (both ways)
    const conversationId = `conv_${Date.now()}_${Math.random()}`;
    
    // Add friend for current user
    await friendsService.addFriendDirectly(request.from, request.senderNickname, conversationId);
    
    // Add friend for sender (they add us)
    const myNickname = await friendsService.getUserNickname();
    this.gun.get('users')
      .get(request.from)
      .get('friends')
      .get(currentUser.pub)
      .put({
        publicKey: currentUser.pub,
        nickname: myNickname,
        addedAt: Date.now(),
        conversationId: conversationId
      });

    console.log('✅ Friend request accepted:', requestId);
    
    // Notify handlers
    this.notifyHandlers('accepted', request);
    
    return request;
  }

  // Reject a friend request
  async rejectFriendRequest(requestId) {
    const currentUser = gunAuthService.getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    // Get the request
    const request = await this.getRequestById(requestId);
    if (!request) throw new Error('Friend request not found');
    if (request.to !== currentUser.pub) throw new Error('This request is not for you');
    if (request.status !== 'pending') throw new Error('Request already processed');

    // Update request status
    request.status = 'rejected';
    request.rejectedAt = Date.now();

    // Update in both places
    this.gun.get('friend_requests')
      .get(currentUser.pub)
      .get('received')
      .get(requestId)
      .put(request);

    this.gun.get('friend_requests')
      .get(request.from)
      .get('sent')
      .get(requestId)
      .put(request);

    console.log('❌ Friend request rejected:', requestId);
    
    // Notify handlers
    this.notifyHandlers('rejected', request);
    
    return request;
  }

  // Get pending friend requests
  async getPendingRequests() {
    const currentUser = gunAuthService.getCurrentUser();
    if (!currentUser) return { sent: [], received: [] };

    return new Promise((resolve) => {
      const sent = [];
      const received = [];
      let sentLoaded = false;
      let receivedLoaded = false;

      const checkResolve = () => {
        if (sentLoaded && receivedLoaded) {
          resolve({ 
            sent: sent.filter(r => r.status === 'pending'),
            received: received.filter(r => r.status === 'pending')
          });
        }
      };

      // Load sent requests
      this.user.get('friend_requests')
        .get('sent')
        .map()
        .once((data, key) => {
          if (data && data.id) {
            sent.push(data);
          }
        });

      setTimeout(() => {
        sentLoaded = true;
        checkResolve();
      }, 500);

      // Load received requests
      this.gun.get('friend_requests')
        .get(currentUser.pub)
        .get('received')
        .map()
        .once((data, key) => {
          if (data && data.id) {
            received.push(data);
          }
        });

      setTimeout(() => {
        receivedLoaded = true;
        checkResolve();
      }, 500);
    });
  }

  // Get a specific request
  async getRequest(from, to) {
    return new Promise((resolve) => {
      let found = false;
      
      this.gun.get('friend_requests')
        .get(to)
        .get('received')
        .map()
        .once((data, key) => {
          if (data && data.from === from && data.to === to && !found) {
            found = true;
            resolve(data);
          }
        });

      setTimeout(() => {
        if (!found) resolve(null);
      }, 500);
    });
  }

  // Get request by ID
  async getRequestById(requestId) {
    const currentUser = gunAuthService.getCurrentUser();
    if (!currentUser) return null;

    return new Promise((resolve) => {
      let found = false;
      
      // Check received requests
      this.gun.get('friend_requests')
        .get(currentUser.pub)
        .get('received')
        .get(requestId)
        .once((data) => {
          if (data && data.id === requestId && !found) {
            found = true;
            resolve(data);
          }
        });

      // Check sent requests
      this.user.get('friend_requests')
        .get('sent')
        .get(requestId)
        .once((data) => {
          if (data && data.id === requestId && !found) {
            found = true;
            resolve(data);
          }
        });

      setTimeout(() => {
        if (!found) resolve(null);
      }, 500);
    });
  }

  // Cancel a sent request
  async cancelRequest(requestId) {
    const currentUser = gunAuthService.getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    const request = await this.getRequestById(requestId);
    if (!request) throw new Error('Request not found');
    if (request.from !== currentUser.pub) throw new Error('You did not send this request');
    if (request.status !== 'pending') throw new Error('Request already processed');

    // Update status
    request.status = 'cancelled';
    request.cancelledAt = Date.now();

    // Update in both places
    this.user.get('friend_requests')
      .get('sent')
      .get(requestId)
      .put(request);

    this.gun.get('friend_requests')
      .get(request.to)
      .get('received')
      .get(requestId)
      .put(request);

    console.log('🚫 Friend request cancelled:', requestId);
    return request;
  }

  // Listen for incoming friend requests
  listenForRequests() {
    const currentUser = gunAuthService.getCurrentUser();
    if (!currentUser) return;

    this.gun.get('friend_requests')
      .get(currentUser.pub)
      .get('received')
      .map()
      .on((data, key) => {
        if (data && data.status === 'pending') {
          console.log('📨 New friend request:', data);
          this.notifyHandlers('new', data);
        }
      });
  }

  // Subscribe to friend request updates
  onRequest(handler) {
    this.requestHandlers.add(handler);
    return () => this.requestHandlers.delete(handler);
  }

  // Notify all handlers
  notifyHandlers(type, request) {
    this.requestHandlers.forEach(handler => {
      try {
        handler(type, request);
      } catch (error) {
        console.error('Error in request handler:', error);
      }
    });
  }

  // Get request statistics
  async getRequestStats() {
    const { sent, received } = await this.getPendingRequests();
    
    return {
      pendingSent: sent.length,
      pendingReceived: received.length,
      totalPending: sent.length + received.length
    };
  }
}

const friendRequestService = new FriendRequestService();
export default friendRequestService;