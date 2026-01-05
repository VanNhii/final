const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

let io;

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
    console.log(`User ${socket.user.full_name} connected with socket ID: ${socket.id}`);
    
    // Join user to their personal room
    socket.join(`user_${socket.user.id}`);
    
    // Broadcast user online status
    socket.broadcast.emit('user_status_change', {
      userId: socket.user.id,
      status: 'online'
    });
    
    // Join conversation rooms
    socket.on('join_conversation', async (conversationId) => {
      console.log(`User ${socket.user.id} joining conversation: ${conversationId}`);
      socket.join(conversationId);
      console.log(`User ${socket.user.id} joined conversation: ${conversationId}`);
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, subject, content, messageType, relatedJobId, relatedApplicationId } = data;
        
        // Create message in database
        const messageData = {
          sender_id: socket.user.id,
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

        // Send to conversation room
        const conversationId = generateConversationId(socket.user.id, receiverId);
        io.to(conversationId).emit('new_message', {
          message,
          conversationId
        });

        // Send notification to receiver's personal room
        const senderName = socket.user.first_name && socket.user.last_name
          ? `${socket.user.first_name} ${socket.user.last_name}`
          : socket.user.email;
        io.to(`user_${receiverId}`).emit('message_notification', {
          messageId: message._id,
          senderId: socket.user.id,
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
        socket.emit('message_error', { 
          success: false, 
          error: error.message 
        });
      }
    });

    // Handle message read status
    socket.on('mark_as_read', async (data) => {
      try {
        const { messageId } = data;
        
        const message = await Message.findById(messageId);
        if (message && message.receiver_id.toString() === socket.user.id && !message.is_read) {
          await Message.findByIdAndUpdate(messageId, {
            is_read: true,
            read_at: new Date()
          });

          // Notify sender about read status
          io.to(`user_${message.sender_id}`).emit('message_read', {
            messageId: messageId,
            readBy: socket.user.id,
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
      console.log(`User ${socket.user.id} is typing to ${receiverId}`);
      const conversationId = generateConversationId(socket.user.id, receiverId);
      socket.to(conversationId).emit('user_typing', {
        userId: socket.user.id,
        userName: socket.user.full_name,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { receiverId } = data;
      const conversationId = generateConversationId(socket.user.id, receiverId);
      socket.to(conversationId).emit('user_typing', {
        userId: socket.user.id,
        userName: socket.user.full_name,
        isTyping: false
      });
    });

    // Handle online status
    socket.on('update_status', (status) => {
      socket.broadcast.emit('user_status_change', {
        userId: socket.user.id,
        status: status
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.full_name} disconnected`);
      socket.broadcast.emit('user_status_change', {
        userId: socket.user.id,
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
