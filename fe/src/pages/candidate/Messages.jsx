import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router';
import candidateService from '../../services/candidateService';
import socketService from '../../services/socketService';

const CandidateMessages = () => {
  const { user, token } = useSelector((state) => state.auth);
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeConversationRef = useRef(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    // Connect socket
    socketService.connect(token);

    // Setup socket event listeners
    socketService.onNewMessage(handleNewMessage);
    socketService.onMessageRead(handleMessageRead);
    socketService.onTyping(handleTyping);
    socketService.onUserStatusChange(handleUserStatusChange);

    // Load messages
    loadMessages();

    return () => {
      // Cleanup
      if (activeConversation) {
        socketService.leaveConversation(activeConversation);
      }
      socketService.off('new_message', handleNewMessage);
      socketService.off('message_read', handleMessageRead);
      socketService.off('user_typing', handleTyping);
      socketService.off('user_status_change', handleUserStatusChange);
    };
  }, [token]);

  // Handle userId from URL params - separate effect to run after conversations load
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId && !loading && user?._id) { // Only run after loading is complete
      const conversationId = generateConversationId(user._id, userId);

      // Check if conversation exists
      const exists = conversations.find(c => c.id === conversationId);

      if (!exists) {
        // Create placeholder conversation
        createPlaceholderConversation(userId, conversationId);
      }

      // Set as active (regardless of whether it existed or was just created)
      setActiveConversation(conversationId);
    }
  }, [searchParams, loading, conversations, user?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (activeConversation) {
      loadConversationMessages(activeConversation);
      socketService.joinConversation(activeConversation);
    }
  }, [activeConversation]);

  useEffect(() => {
    loadUnreadCount();
  }, []);

  const loadUnreadCount = async () => {
    try {
      const response = await candidateService.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createPlaceholderConversation = async (userId, conversationId) => {
    // Create placeholder conversation
    const newConversation = {
      id: conversationId,
      userId: userId,
      userName: 'Đang tải...',
      userAvatar: null,
      userRole: 'recruiter', // Assume recruiter for candidate view
      lastMessage: 'Bắt đầu cuộc trò chuyện mới',
      lastMessageTime: new Date(),
      unreadCount: 0,
      status: 'offline'
    };

    setConversations(prev => [newConversation, ...prev]);
    setMessages([]); // Empty messages for new conversation

    // Fetch user info in background to update placeholder
    try {
      const response = await candidateService.getUserInfo(userId);
      if (response.data) {
        const userData = response.data.data || response.data; // Handle both wrapped and unwrapped
        setConversations(prev => prev.map(conv =>
          conv.id === conversationId
            ? {
              ...conv,
              userName: userData.first_name && userData.last_name
                ? `${userData.first_name} ${userData.last_name}`
                : userData.email || 'Người dùng',
              userAvatar: userData.avatar_url,
              userRole: userData.role,
              lastMessage: 'Bắt đầu cuộc trò chuyện'
            }
            : conv
        ));
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      // Update with minimal info on error
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, userName: 'Người dùng', lastMessage: '' }
          : conv
      ));
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      console.log('Loading all messages for conversations...');
      const response = await candidateService.getMessages();

      console.log('Messages response:', response);

      if (response.success && response.data) {
        console.log('Total messages received:', response.data.length);

        // Group messages by conversation
        const conversationsMap = {};

        response.data.forEach((msg) => {
          const isSender = msg.sender_id?._id === user._id;
          const otherUser = isSender ? msg.receiver_id : msg.sender_id;

          if (!otherUser) {
            console.log('Message missing user info:', msg);
            return;
          }

          const conversationId = generateConversationId(user._id, otherUser._id);

          if (!conversationsMap[conversationId]) {
            const fullName = otherUser.first_name && otherUser.last_name
              ? `${otherUser.first_name} ${otherUser.last_name}`
              : otherUser.email || 'Unknown User';

            conversationsMap[conversationId] = {
              id: conversationId,
              userId: otherUser._id,
              userName: fullName,
              userAvatar: otherUser.avatar_url,
              userRole: otherUser.role,
              companyName: otherUser.company_name,
              lastMessage: msg.content,
              lastMessageTime: msg.sent_at || msg.created_at,
              unreadCount: 0,
              status: onlineUsers[otherUser._id] ? 'online' : 'offline'
            };
          }

          // Count unread messages
          if (!isSender && !msg.is_read) {
            conversationsMap[conversationId].unreadCount++;
          }

          // Update last message if newer
          const msgTime = new Date(msg.sent_at || msg.created_at);
          const lastTime = new Date(conversationsMap[conversationId].lastMessageTime);
          if (msgTime > lastTime) {
            conversationsMap[conversationId].lastMessage = msg.content;
            conversationsMap[conversationId].lastMessageTime = msg.sent_at || msg.created_at;
          }
        });

        const conversationsList = Object.values(conversationsMap).sort((a, b) =>
          new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
        );

        console.log('[CANDIDATE] Conversations loaded:', conversationsList.length);

        // Check if we need placeholder for URL param userId
        const userId = searchParams.get('userId');
        if (userId && user?._id) {
          const placeholderConvId = generateConversationId(user._id, userId);
          const existsInLoaded = conversationsList.find(c => c.id === placeholderConvId);
          if (!existsInLoaded) {
            console.log('[CANDIDATE] Will create placeholder for userId:', userId);
          }
        }

        setConversations(conversationsList);
      } else {
        console.log('[CANDIDATE] No messages in response or unsuccessful');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      console.error('Error details:', error.response || error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationMessages = async (conversationId) => {
    try {
      const conv = conversations.find(c => c.id === conversationId);
      if (!conv) {
        console.log('Conversation not found:', conversationId);
        return;
      }

      console.log('Loading messages for conversation:', conv.userId);

      // Use the new optimized endpoint
      const response = await candidateService.getConversationMessages(conv.userId, { limit: 100 });

      console.log('Conversation messages response:', response);

      if (response.success && response.data) {
        // Backend returns descending order, reverse for chronological display
        const conversationMessages = Array.isArray(response.data)
          ? [...response.data].reverse()
          : [];

        console.log('Loaded messages:', conversationMessages.length);
        setMessages(conversationMessages);

        // Mark unread messages as read (bulk API call)
        const unreadMessages = conversationMessages.filter(
          msg => msg.receiver_id?._id === user._id && !msg.is_read
        );

        if (unreadMessages.length > 0) {
          const messageIds = unreadMessages.map(msg => msg._id);
          await candidateService.markMessagesAsRead(messageIds);

          // Update local state
          setMessages(prev => prev.map(msg =>
            messageIds.includes(msg._id) ? { ...msg, is_read: true, read_at: new Date() } : msg
          ));

          // Update conversation unread count
          setConversations(prev => prev.map(conv =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
          ));

          // Decrease total unread count
          setUnreadCount(prev => Math.max(0, prev - unreadMessages.length));
        }

      } else {
        console.log('No messages or unsuccessful response:', response);
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      console.error('Error details:', error.response || error.message);
    }
  };

  const generateConversationId = (userId1, userId2) => {
    if (!userId1 || !userId2) {
      console.error('Invalid user IDs for conversation:', userId1, userId2);
      return null;
    }
    const ids = [userId1, userId2].sort();
    return `conversation_${ids[0]}_${ids[1]}`;
  };

  const handleNewMessage = (message) => {
    console.log('New message received:', message);

    // Determine other user
    const messageSenderId = message.sender_id?._id || message.sender_id;
    const messageReceiverId = message.receiver_id?._id || message.receiver_id;
    const otherUserId = messageSenderId === user._id ? messageReceiverId : messageSenderId;
    const conversationId = generateConversationId(user._id, otherUserId);

    if (!conversationId) {
      console.error('Cannot generate conversationId, invalid user IDs');
      return;
    }

    console.log('Active conversation:', activeConversationRef.current, 'Message conversation:', conversationId);

    // Update messages if in active conversation
    if (activeConversationRef.current === conversationId) {
      console.log('Adding message to active conversation');
      // Check if message already exists to avoid duplicates
      setMessages(prev => {
        const messageId = message._id || message.id;
        const exists = prev.some(m => (m._id || m.id) === messageId);
        if (exists) {
          console.log('Message already exists, skipping');
          return prev;
        }
        console.log('Adding new message to list');
        return [...prev, message];
      });

      // Mark as read if received and user is viewing
      if (messageReceiverId === user._id) {
        setTimeout(() => {
          socketService.markAsRead(message._id || message.id);
        }, 500);
      }
    }

    // Update conversation last message without full reload
    setConversations(prev => {
      const updated = prev.map(conv =>
        conv.id === conversationId
          ? {
            ...conv,
            lastMessage: message.content,
            lastMessageTime: message.sent_at || message.created_at || new Date(),
            unreadCount: messageReceiverId === user._id && activeConversationRef.current !== conversationId
              ? (conv.unreadCount || 0) + 1
              : conv.unreadCount || 0
          }
          : conv
      );

      // If conversation doesn't exist, it might be a new one
      const exists = updated.some(c => c.id === conversationId);
      if (!exists && otherUserId) {
        // Will be created when user navigates to it
      }

      return updated;
    });

    // Update total unread count if this is a received message
    if (messageReceiverId === user._id && activeConversationRef.current !== conversationId) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const handleMessageRead = ({ messageId, readBy }) => {
    // Update message read status
    setMessages(prev =>
      prev.map(msg =>
        msg._id === messageId ? { ...msg, is_read: true } : msg
      )
    );

    // Decrease unread count if we sent this message
    const message = messages.find(m => m._id === messageId);
    if (message && message.sender_id?._id === user._id) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleTyping = ({ userId, isTyping }) => {
    setTypingUsers(prev => ({
      ...prev,
      [userId]: isTyping
    }));
  };

  const handleUserStatusChange = ({ userId, status }) => {
    console.log(`User ${userId} status changed to ${status}`);

    if (status === 'online') {
      setOnlineUsers(prev => ({ ...prev, [userId]: true }));
      setConversations(prev =>
        prev.map(conv =>
          conv.userId === userId ? { ...conv, status: 'online' } : conv
        )
      );
    } else if (status === 'offline') {
      setOnlineUsers(prev => {
        const newOnlineUsers = { ...prev };
        delete newOnlineUsers[userId];
        return newOnlineUsers;
      });
      setConversations(prev =>
        prev.map(conv =>
          conv.userId === userId ? { ...conv, status: 'offline' } : conv
        )
      );
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || sending) return;

    const conv = conversations.find(c => c.id === activeConversation);
    if (!conv) {
      console.error('[CANDIDATE] No conversation found for activeConversation:', activeConversation);
      return;
    }

    console.log('[CANDIDATE] Sending message to conversation:', {
      conversationId: conv.id,
      targetUserId: conv.userId,
      targetUserName: conv.userName,
      activeConversation: activeConversation
    });

    try {
      setSending(true);

      const messageData = {
        receiver_id: conv.userId,
        subject: `Message from ${user.first_name || user.email}`,
        content: newMessage.trim(),
        message_type: 'general'
      };

      // Send via API
      const response = await candidateService.sendMessage(messageData);

      if (response.success) {
        // Add message to UI immediately
        const newMsg = {
          ...response.data,
          sender_id: {
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            avatar_url: user.avatar_url
          },
          receiver_id: {
            _id: conv.userId
          }
        };

        setMessages(prev => {
          // Check if message already exists (e.g. received via socket before API response)
          const msgId = newMsg._id || newMsg.id;
          if (prev.some(m => (m._id || m.id) === msgId)) {
            return prev;
          }
          return [...prev, newMsg];
        });

        // Update conversation last message
        setConversations(prev => prev.map(c =>
          c.id === activeConversation
            ? { ...c, lastMessage: newMessage.trim(), lastMessageTime: new Date() }
            : c
        ));

        setNewMessage('');
        socketService.stopTyping(conv.userId);

        // Socket will receive the message via 'new_message' event from backend
        // No need to send via socket separately to avoid duplicates
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (!activeConversation) return;

    const conv = conversations.find(c => c.id === activeConversation);
    if (!conv) return;

    // Send typing indicator
    socketService.startTyping(conv.userId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(conv.userId);
    }, 2000);
  };

  const markConversationAsRead = (conversationId) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      )
    );
  };

  const deleteConversation = (id, e) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const conv = conversations.find(c => c.id === deleteId);
      if (conv?.userId) {
        await candidateService.deleteConversation(conv.userId);
      }
      setConversations(prev => prev.filter(c => c.id !== deleteId));
      if (activeConversation === deleteId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Không thể xóa cuộc trò chuyện. Vui lòng thử lại.');
    } finally {
      setDeleteId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-400';
      case 'away': return 'bg-yellow-400';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) {
      return `${Math.floor(diff / (1000 * 60))} phút trước`;
    } else if (hours < 24) {
      return `${Math.floor(hours)} giờ trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const msgDate = new Date(dateString);
    const diffMs = now - msgDate;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ trước`;

    const diffDays = Math.floor(diffMins / 1440);
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return msgDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: msgDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.companyName && conv.companyName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filter === 'unread') {
      return matchesSearch && conv.unreadCount > 0;
    }

    return matchesSearch;
  });

  const activeConv = conversations.find(conv => conv.id === activeConversation);
  const isTyping = activeConv && typingUsers[activeConv.userId];

  const quickReplies = [
    'Cảm ơn anh/chị!',
    'Em rất quan tâm đến vị trí này.',
    'Em có thể cung cấp thêm thông tin.',
    'Khi nào có thể sắp xếp buổi phỏng vấn?',
    'Em đã gửi hồ sơ, mong nhận được phản hồi.'
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải tin nhắn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Conversations Sidebar */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-gray-900">Tin nhắn</h1>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filters */}
          <div className="flex space-x-2 mt-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm ${filter === 'all'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-full text-sm ${filter === 'unread'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Chưa đọc
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => {
                  setActiveConversation(conversation.id);
                  markConversationAsRead(conversation.id);
                }}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 relative group ${activeConversation === conversation.id
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : conversation.unreadCount > 0
                    ? 'bg-red-50/30 border-l-4 border-l-red-400'
                    : ''
                  }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {conversation.userAvatar ? (
                        <img src={conversation.userAvatar} alt={conversation.userName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-xl text-gray-400">🏢</span>
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(conversation.status)}`}></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className={`text-sm ${conversation.unreadCount > 0 ? 'font-bold' : 'font-medium'} text-gray-900 truncate`}>
                        {conversation.userName}
                      </h3>
                      <span className="text-xs text-gray-500">{formatTime(conversation.lastMessageTime)}</span>
                    </div>
                    {conversation.companyName && (
                      <p className="text-xs text-blue-600 mb-1">{conversation.companyName}</p>
                    )}
                    <p className={`text-sm ${conversation.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'} truncate`}>
                      {conversation.lastMessage}
                    </p>

                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500">Nhà tuyển dụng</span>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1 animate-pulse">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete button - appears on hover */}
                <button
                  onClick={(e) => deleteConversation(conversation.id, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  title="Xóa cuộc trò chuyện"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <svg className="w-20 h-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có tin nhắn'}
              </h3>
              <p className="text-sm text-gray-500 text-center max-w-sm">
                {searchQuery
                  ? `Không có kết quả cho "${searchQuery}"`
                  : 'Tin nhắn của bạn với nhà tuyển dụng sẽ xuất hiện ở đây'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {activeConv.userAvatar ? (
                        <img src={activeConv.userAvatar} alt={activeConv.userName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-lg text-gray-400">🏢</span>
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(activeConv.status)}`}></div>
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">{activeConv.userName}</h2>
                    {activeConv.companyName && (
                      <p className="text-sm text-blue-600">{activeConv.companyName}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {activeConv.status === 'online' ? 'Đang hoạt động' : 'Không hoạt động'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isSentByMe = message.sender_id._id === user._id;
                return (
                  <div
                    key={message._id}
                    className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isSentByMe
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                      }`}>
                      <p className="text-sm">{message.content}</p>
                      <div className={`flex items-center justify-between mt-1 ${isSentByMe ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                        <span className="text-xs">{formatMessageTime(message.created_at)}</span>
                        {isSentByMe && (
                          <div className="ml-2">
                            {message.is_read ? (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            <div className="bg-gray-50 px-4 py-2">
              <div className="flex space-x-2 overflow-x-auto">
                {quickReplies.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => setNewMessage(reply)}
                    className="flex-shrink-0 px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Nhập tin nhắn..."
                  maxLength={1000}
                  className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows="3"
                />
                <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                  <span className={`text-xs ${newMessage.length > 900 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    {newMessage.length}/1000
                  </span>
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? 'Đang gửi...' : 'Gửi'}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chọn một cuộc trò chuyện</h3>
              <p className="text-gray-500">Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin.</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 transform transition-all animate-fade-in">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Xóa cuộc trò chuyện?</h3>
              <p className="text-gray-600 mb-6">
                Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Tất cả tin nhắn sẽ bị xóa vĩnh viễn và không thể khôi phục.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add custom styles for animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CandidateMessages;
