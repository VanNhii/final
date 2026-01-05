const Message = require('../models/Message');
const { getPaginationParams, buildPaginationResponse, applyPagination } = require('../utils/pagination');
const { sendNotificationToUser } = require('../utils/socket');

// @desc    Get all messages for user
// @route   GET /api/v1/messages
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    
    const query = {
      $or: [
        { sender_id: req.user.id },
        { receiver_id: req.user.id }
      ]
    };
    
    const messagesQuery = Message.find(query)
      .populate('sender_id', 'first_name last_name email avatar_url role')
      .populate('receiver_id', 'first_name last_name email avatar_url role')
      .sort('-sent_at');
    
    const messages = await applyPagination(messagesQuery, page, limit, skip);
    const total = await Message.countDocuments(query);
    
    res.status(200).json(buildPaginationResponse(messages, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get inbox messages
// @route   GET /api/v1/messages/inbox
// @access  Private
exports.getInboxMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ receiver_id: req.user.id })
      .sort('-sent_at');
    
    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sent messages
// @route   GET /api/v1/messages/sent
// @access  Private
exports.getSentMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ sender_id: req.user.id })
      .sort('-sent_at');
    
    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single message
// @route   GET /api/v1/messages/:id
// @access  Private
exports.getMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Make sure user is sender or receiver
    if (message.sender_id.toString() !== req.user.id && message.receiver_id.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this message'
      });
    }
    
    // Mark as read if user is receiver
    if (message.receiver_id.toString() === req.user.id && !message.is_read) {
      await Message.findByIdAndUpdate(req.params.id, {
        is_read: true,
        read_at: new Date()
      });
    }
    
    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message
// @route   POST /api/v1/messages
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    req.body.sender_id = req.user.id;
    
    const message = await Message.create(req.body);
    
    // Populate the message
    await message.populate('sender_id', 'first_name last_name email avatar_url role');
    await message.populate('receiver_id', 'first_name last_name email avatar_url role');
    
    // Send real-time notification via socket
    const senderName = req.user.first_name && req.user.last_name
      ? `${req.user.first_name} ${req.user.last_name}`
      : req.user.email;
    
    // Emit new_message event to both users
    const { sendSocketEventToUser } = require('../utils/socket');
    sendSocketEventToUser(req.body.receiver_id, 'new_message', message);
    sendSocketEventToUser(req.user.id, 'new_message', message);
    
    // Also send notification
    sendNotificationToUser(req.body.receiver_id, {
      type: 'new_message',
      messageId: message._id,
      senderId: req.user.id,
      senderName: senderName,
      subject: message.subject,
      content: message.content.substring(0, 100) + '...',
      timestamp: message.sent_at
    });
    
    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reply to message
// @route   POST /api/v1/messages/:id/reply
// @access  Private
exports.replyToMessage = async (req, res, next) => {
  try {
    const originalMessage = await Message.findById(req.params.id);
    
    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Original message not found'
      });
    }
    
    // Create reply
    const replyData = {
      sender_id: req.user.id,
      receiver_id: originalMessage.sender_id,
      subject: `Re: ${originalMessage.subject}`,
      content: req.body.content,
      message_type: originalMessage.message_type,
      replied_to: originalMessage._id,
      related_application_id: originalMessage.related_application_id,
      related_job_id: originalMessage.related_job_id
    };
    
    const reply = await Message.create(replyData);
    
    res.status(201).json({
      success: true,
      data: reply
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message
// @route   DELETE /api/v1/messages/:id
// @access  Private
exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Make sure user is sender or receiver
    if (message.sender_id.toString() !== req.user.id && message.receiver_id.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }
    
    await message.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark messages as read
// @route   PUT /api/v1/messages/mark-read
// @access  Private
exports.markMessagesAsRead = async (req, res, next) => {
  try {
    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        success: false,
        message: 'messageIds array is required'
      });
    }

    // Update multiple messages at once
    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        receiver_id: req.user.id,
        is_read: false
      },
      {
        is_read: true,
        read_at: new Date()
      }
    );

    // Emit socket events for each marked message
    const { sendSocketEventToUser } = require('../utils/socket');
    const messages = await Message.find({ _id: { $in: messageIds } });
    
    messages.forEach(msg => {
      sendSocketEventToUser(msg.sender_id.toString(), 'message_read', {
        messageId: msg._id,
        readBy: req.user.id,
        readAt: new Date()
      });
    });

    res.status(200).json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread message count
// @route   GET /api/v1/messages/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.countDocuments({
      receiver_id: req.user.id,
      is_read: false
    });

    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
};
