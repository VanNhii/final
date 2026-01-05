import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router';
import recruiterService from '../../services/recruiterService';
import socketService from '../../services/socketService';

const RecruiterMessages = () => {
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

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    // Connect socket
    socketService.connect(token);

    // Setup socket event listeners
    socketService.onNewMessage(handleNewMessage);
    socketService.onMessageRead(handleMessageRead);
    socketService.onTyping(handleTyping);
  socketService.onUserStatusChange(handleUserStatusChange);
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
    if (userId && !loading) { // Only run after loading is complete
      const conversationId = generateConversationId(user._id, userId);
      
      // Check if conversation exists
      const exists = conversations.find(c => c.id === conversationId);
      
      if (!exists) {
        // Create placeholder conversation
        createPlaceholderConversation(userId, conversationId);
      }
      
      // Set as active
      setActiveConversation(conversationId);
    }
  }, [searchParams, loading]); // Re-run only when URL params or loading state changes

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
      const response = await recruiterService.getUnreadCount();
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
      userRole: 'candidate',
      lastMessage: 'Bắt đầu cuộc trò chuyện mới',
      lastMessageTime: new Date(),
      unreadCount: 0,
      status: 'offline'
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setMessages([]); // Empty messages for new conversation
    
    // Fetch user info in background to update placeholder
    try {
      const response = await recruiterService.getUserInfo(userId);
      if (response.success) {
        const userData = response.data;
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

  const loadConversations = async () => {
    try {
      setLoading(true);
      // Use existing messages API
      const response = await recruiterService.getMessagesLegacy();
      
      if (response.success && response.data) {
        // Group messages by conversation (other user)
        const conversationsMap = {};
        
        response.data.forEach((msg) => {
          const isSender = msg.sender_id?._id === user._id;
          const otherUser = isSender ? msg.receiver_id : msg.sender_id;
          
          if (!otherUser) return;
          
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

        setConversations(Object.values(conversationsMap).sort((a, b) => 
          new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
        ));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationMessages = async (conversationId) => {
    try {
      const conv = conversations.find(c => c.id === conversationId);
      if (!conv) return;

      const response = await recruiterService.getMessagesLegacy();
      
      if (response.success && response.data) {
        // Filter messages for this conversation
        const conversationMessages = response.data
          .filter(msg => {
            const senderId = msg.sender_id?._id;
            const receiverId = msg.receiver_id?._id;
            return (
              (senderId === user._id && receiverId === conv.userId) ||
              (senderId === conv.userId && receiverId === user._id)
            );
          })
          .sort((a, b) => new Date(a.sent_at || a.created_at) - new Date(b.sent_at || b.created_at));

        setMessages(conversationMessages);

        // Mark unread messages as read (bulk API call)
        const unreadMessages = conversationMessages.filter(
          msg => msg.receiver_id?._id === user._id && !msg.is_read
        );
        
        if (unreadMessages.length > 0) {
          const messageIds = unreadMessages.map(msg => msg._id);
          await recruiterService.markMessagesAsRead(messageIds);
          
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
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
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
    
    console.log('Active conversation:', activeConversation, 'Message conversation:', conversationId);
    
    // Update messages if in active conversation
    if (activeConversation === conversationId) {
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
              unreadCount: messageReceiverId === user._id && activeConversation !== conversationId 
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
    if (messageReceiverId === user._id && activeConversation !== conversationId) {
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
    if (!conv) return;

    try {
      setSending(true);

      const messageData = {
        receiver_id: conv.userId,
        subject: `Message from ${user.first_name || user.email}`,
        content: newMessage.trim(),
        message_type: 'general'
      };

      // Send via API
      const response = await recruiterService.sendMessageLegacy(messageData);

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
        setMessages(prev => [...prev, newMsg]);
        
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

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.userName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'unread') {
      return matchesSearch && conv.unreadCount > 0;
    }
    
    return matchesSearch;
  });

  const activeConv = conversations.find(conv => conv.id === activeConversation);
  const isTyping = activeConv && typingUsers[activeConv.userId];

  const quickReplies = [
    'Cảm ơn bạn đã quan tâm!',
    'Chúng tôi sẽ xem xét và phản hồi trong thời gian sớm nhất.',
    'Bạn có thể cung cấp thêm thông tin về kinh nghiệm không?',
    'Chúng tôi muốn mời bạn tham gia phỏng vấn.',
    'Bạn có thể bắt đầu làm việc khi nào?'
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filters */}
          <div className="flex space-x-2 mt-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'all' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'unread' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Chưa đọc
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => {
                setActiveConversation(conversation.id);
                markConversationAsRead(conversation.id);
              }}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                activeConversation === conversation.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    {conversation.userAvatar ? (
                      <img src={conversation.userAvatar} alt={conversation.userName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xl text-gray-400">👤</span>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(conversation.status)}`}></div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{conversation.userName}</h3>
                    <span className="text-xs text-gray-500">{formatTime(conversation.lastMessageTime)}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500">{conversation.userRole === 'candidate' ? 'Ứng viên' : 'Nhà tuyển dụng'}</span>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredConversations.length === 0 && (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-500 text-sm">Không tìm thấy cuộc trò chuyện nào</p>
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
                        <span className="text-lg text-gray-400">👤</span>
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(activeConv.status)}`}></div>
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">{activeConv.userName}</h2>
                    <p className="text-sm text-gray-500">
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
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isSentByMe
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <div className={`flex items-center justify-between mt-1 ${
                        isSentByMe ? 'text-green-100' : 'text-gray-500'
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
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
                  placeholder="Nhập tin nhắn..."
                  disabled={sending}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {sending ? 'Đang gửi...' : 'Gửi'}
                </button>
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
    </div>
  );
};

export default RecruiterMessages;
