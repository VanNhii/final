import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Join conversation room
  joinConversation(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  // Leave conversation room
  leaveConversation(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  // Send message
  sendMessage(messageData) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('send_message', messageData, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Failed to send message'));
        }
      });
    });
  }

  // Mark message as read
  markAsRead(messageId) {
    if (this.socket?.connected) {
      this.socket.emit('mark_as_read', { messageId });
    }
  }

  // Typing indicator
  startTyping(receiverId) {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { receiverId });
    }
  }

  stopTyping(receiverId) {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { receiverId });
    }
  }

  // Event listeners
  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  onMessageRead(callback) {
    if (this.socket) {
      this.socket.on('message_read', callback);
    }
  }

  onTyping(callback) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  onUserStatusChange(callback) {
    if (this.socket) {
      this.socket.on('user_status_change', callback);
    }
  }

  // Remove listeners
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.connected && this.socket?.connected;
  }
}

export default new SocketService();
