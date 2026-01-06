const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

let io;

const connectedUsers = new Set();

// Initialize Socket.IO server
const initializeSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || !user.is_active) {
        return next(new Error('Authentication error'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    const userId = socket.user.id.toString();
    console.log(`User ${socket.user.full_name} (${userId}) connected with socket ID: ${socket.id}`);
    
    // Add to connected users
    connectedUsers.add(userId);
    
    // Join user to their personal room
    socket.join(`user_${userId}`);
    
    // Send list of online users to the newly connected user
    socket.emit('online_users', Array.from(connectedUsers));
    
    // Broadcast user online status to others
    socket.broadcast.emit('user_status_change', {
      userId: userId,
      status: 'online'
    });
    
    // Join conversation rooms
    socket.on('join_conversation', async (conversationId) => {
      console.log(`User ${userId} joining conversation: ${conversationId}`);
      socket.join(conversationId);
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, subject, content, messageType, relatedJobId, relatedApplicationId } = data;
        
        const messageData = {
          sender_id: userId,
          receiver_id: receiverId,
          subject: subject || 'New Message',
          content,
          message_type: messageType || 'general',
          related_job_id: relatedJobId || null,
          related_application_id: relatedApplicationId || null
        };

        const message = await Message.create(messageData);
        await message.populate('sender_id', 'first_name last_name email avatar_url role');
        await message.populate('receiver_id', 'first_name last_name email avatar_url role');

        const conversationId = generateConversationId(userId, receiverId);
        io.to(conversationId).emit('new_message', {
          message,
          conversationId
        });

        const senderName = socket.user.first_name && socket.user.last_name
          ? `${socket.user.first_name} ${socket.user.last_name}`
          : socket.user.email;
        io.to(`user_${receiverId}`).emit('message_notification', {
          messageId: message._id,
          senderId: userId,
          senderName: senderName,
          subject: message.subject,
          content: message.content.substring(0, 100) + '...',
          timestamp: message.sent_at
        });

        socket.emit('message_sent', { 
          success: true, 
          messageId: message._id,
          timestamp: message.sent_at
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', { success: false, error: error.message });
      }
    });

    // Handle message read status
    socket.on('mark_as_read', async (data) => {
      try {
        const { messageId } = data;
        const message = await Message.findById(messageId);
        if (message && message.receiver_id.toString() === userId && !message.is_read) {
          await Message.findByIdAndUpdate(messageId, {
            is_read: true,
            read_at: new Date()
          });

          io.to(`user_${message.sender_id}`).emit('message_read', {
            messageId: messageId,
            readBy: userId,
            readAt: new Date()
          });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { receiverId } = data;
      const conversationId = generateConversationId(userId, receiverId);
      socket.to(conversationId).emit('user_typing', {
        userId: userId,
        userName: socket.user.full_name,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { receiverId } = data;
      const conversationId = generateConversationId(userId, receiverId);
      socket.to(conversationId).emit('user_typing', {
        userId: userId,
        userName: socket.user.full_name,
        isTyping: false
      });
    });

    // Handle online status manual update
    socket.on('update_status', (status) => {
      socket.broadcast.emit('user_status_change', {
        userId: userId,
        status: status
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.full_name} disconnected`);
      connectedUsers.delete(userId);
      socket.broadcast.emit('user_status_change', {
        userId: userId,
        status: 'offline'
      });
    });
  });

  return io;
};

// Generate consistent conversation ID for two users
const generateConversationId = (userId1, userId2) => {
  const ids = [userId1, userId2].sort();
  return `conversation_${ids[0]}_${ids[1]}`;
};

// Send notification to specific user
const sendNotificationToUser = (userId, notification) => {
  if (io) {
    io.to(`user_${userId}`).emit('notification', notification);
  }
};

// Send real-time updates for applications
const sendApplicationUpdate = (recruiterId, candidateId, applicationData) => {
  if (io) {
    // Notify recruiter
    io.to(`user_${recruiterId}`).emit('application_update', {
      type: 'application_received',
      data: applicationData
    });

    // Notify candidate
    io.to(`user_${candidateId}`).emit('application_update', {
      type: 'application_status_changed',
      data: applicationData
    });
  }
};

// Send interview updates
const sendInterviewUpdate = (recruiterId, candidateId, interviewData) => {
  if (io) {
    // Notify both parties
    [recruiterId, candidateId].forEach(userId => {
      io.to(`user_${userId}`).emit('interview_update', {
        type: 'interview_scheduled',
        data: interviewData
      });
    });
  }
};

// Send socket event to specific user
const sendSocketEventToUser = (userId, eventName, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(eventName, data);
  }
};

module.exports = {
  initializeSocketIO,
  sendNotificationToUser,
  sendApplicationUpdate,
  sendInterviewUpdate,
  sendSocketEventToUser,
  getIO: () => io
};
