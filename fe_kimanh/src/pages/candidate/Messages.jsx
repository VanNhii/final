import {useCallback, useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router';
import {useSelector} from 'react-redux';
import candidateService from '../../services/candidateService';
import socketService from '../../services/socketService';
import {getAvatarUrl} from '../../utils/helpers';

const CandidateMessages = () => {
  const {user, token} = useSelector((state) => state.auth);
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
  const [deleteId, setDeleteId] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  const generateConversationId = (userId1, userId2) => {
    if (!userId1 || !userId2) return null;
    const ids = [userId1, userId2].sort();
    return `conversation_${ids[0]}_${ids[1]}`;
  };

  const handleNewMessage = useCallback((message) => {
    const messageSenderId = message.sender_id?._id || message.sender_id;
    const messageReceiverId = message.receiver_id?._id || message.receiver_id;
    const otherUserId = messageSenderId === user._id ? messageReceiverId : messageSenderId;
    const conversationId = generateConversationId(user._id, otherUserId);

    if (!conversationId) return;

    if (activeConversation === conversationId) {
      setMessages(prev => {
        const messageId = message._id || message.id;
        const exists = prev.some(m => (m._id || m.id) === messageId);
        if (exists) return prev;
        return [...prev, message];
      });

      if (messageReceiverId === user._id) {
        setTimeout(() => {
          socketService.markAsRead(message._id || message.id);
        }, 500);
      }
    }

    setConversations(prev => {
      let updated = prev.map(conv =>
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

      const exists = updated.some(c => c.id === conversationId);
      if (!exists && otherUserId) {
        const otherUser = messageSenderId === user._id ? message.receiver_id : message.sender_id;
        const recruiterProfile = otherUser?.recruiter_profile;
        const companyName = recruiterProfile?.company_name && recruiterProfile?.company_name !== 'Not specified' ? recruiterProfile.company_name : null;
        const fullName = otherUser?.first_name
          ? `${otherUser.first_name} ${otherUser.last_name || ''}`
          : otherUser?.email || 'Người dùng mới';

        const newConv = {
          id: conversationId,
          userId: otherUserId,
          userName: companyName || fullName,
          userAvatar: otherUser?.avatar_url || recruiterProfile?.logo_url,
          userRole: otherUser?.role,
          companyName: companyName || '',
          lastMessage: message.content,
          lastMessageTime: message.sent_at || message.created_at || new Date(),
          unreadCount: messageReceiverId === user._id && activeConversation !== conversationId ? 1 : 0,
          status: onlineUsers[otherUserId] ? 'online' : 'offline'
        };
        updated = [newConv, ...updated];
      }

      return updated.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    });

    if (messageReceiverId === user._id && activeConversation !== conversationId) {
      setUnreadCount(prev => prev + 1);
    }
  }, [user._id, activeConversation, onlineUsers]);

  const handleMessageRead = useCallback(({messageId, readBy}) => {
    setMessages(prev => prev.map(msg => (msg._id || msg.id) === messageId ? {...msg, is_read: true} : msg));
  }, []);

  const handleTyping = useCallback(({userId, isTyping}) => {
    setTypingUsers(prev => ({...prev, [userId]: isTyping}));
  }, []);

  const handleUserStatusChange = useCallback(({userId, status}) => {
    if (status === 'online') {
      setOnlineUsers(prev => ({...prev, [userId]: true}));
      setConversations(prev => prev.map(conv => conv.userId === userId ? {...conv, status: 'online'} : conv));
    } else if (status === 'offline') {
      setOnlineUsers(prev => {
        const newOnlineUsers = {...prev};
        delete newOnlineUsers[userId];
        return newOnlineUsers;
      });
      setConversations(prev => prev.map(conv => conv.userId === userId ? {...conv, status: 'offline'} : conv));
    }
  }, []);

  const handleOnlineUsersList = useCallback((userIds) => {
    const onlineMap = {};
    userIds.forEach(id => {
      if (id !== user._id) onlineMap[id] = true;
    });
    setOnlineUsers(onlineMap);
    setConversations(prev => prev.map(conv => onlineMap[conv.userId] ? {...conv, status: 'online'} : {...conv, status: 'offline'}));
  }, [user._id]);

  useEffect(() => {
    if (!token) return;
    socketService.connect(token);
    socketService.onNewMessage(handleNewMessage);
    socketService.onMessageRead(handleMessageRead);
    socketService.onTyping(handleTyping);
    socketService.onUserStatusChange(handleUserStatusChange);

    // Custom listener for the initial online list we just added to backend
    socketService.socket?.on('online_users', handleOnlineUsersList);

    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('message_read', handleMessageRead);
      socketService.off('user_typing', handleTyping);
      socketService.off('user_status_change', handleUserStatusChange);
      socketService.socket?.off('online_users', handleOnlineUsersList);
    };
  }, [token, handleNewMessage, handleMessageRead, handleTyping, handleUserStatusChange, handleOnlineUsersList]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await candidateService.getMessages();
      if (response.success && response.data) {
        const conversationsMap = {};
        response.data.forEach((msg) => {
          const isSender = msg.sender_id?._id === user._id;
          const otherUser = isSender ? msg.receiver_id : msg.sender_id;
          if (!otherUser) return;
          const conversationId = generateConversationId(user._id, otherUser._id);
          if (!conversationsMap[conversationId]) {
            const recruiterProfile = otherUser.recruiter_profile;
            const companyName = recruiterProfile?.company_name && recruiterProfile?.company_name !== 'Not specified' ? recruiterProfile.company_name : null;
            const fullName = otherUser.first_name && otherUser.last_name ? `${otherUser.first_name} ${otherUser.last_name}` : otherUser.email || 'Người dùng';
            conversationsMap[conversationId] = {
              id: conversationId,
              userId: otherUser._id,
              userName: companyName || fullName,
              userAvatar: otherUser.avatar_url || recruiterProfile?.logo_url,
              userRole: otherUser.role,
              companyName: companyName,
              lastMessage: msg.content,
              lastMessageTime: msg.sent_at || msg.created_at,
              unreadCount: 0,
              status: onlineUsers[otherUser._id] ? 'online' : 'offline'
            };
          }
          if (!isSender && !msg.is_read) conversationsMap[conversationId].unreadCount++;
          const msgTime = new Date(msg.sent_at || msg.created_at);
          const lastTime = new Date(conversationsMap[conversationId].lastMessageTime);
          if (msgTime > lastTime) {
            conversationsMap[conversationId].lastMessage = msg.content;
            conversationsMap[conversationId].lastMessageTime = msg.sent_at || msg.created_at;
          }
        });
        setConversations(Object.values(conversationsMap).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)));
      }
    } catch (error) {console.error(error);} finally {setLoading(false);}
  };

  const loadConversationMessages = async (conversationId) => {
    try {
      const conv = conversations.find(c => c.id === conversationId);
      if (!conv) return;
      const response = await candidateService.getConversationMessages(conv.userId, {limit: 50});
      if (response.success && response.data) {
        const conversationMessages = [...response.data].reverse();
        setMessages(conversationMessages);
        const unreadMessages = conversationMessages.filter(msg => msg.receiver_id?._id === user._id && !msg.is_read);
        if (unreadMessages.length > 0) {
          const messageIds = unreadMessages.map(msg => msg._id);
          await candidateService.markMessagesAsRead(messageIds);
          setMessages(prev => prev.map(msg => messageIds.includes(msg._id) ? {...msg, is_read: true, read_at: new Date()} : msg));
          setConversations(prev => prev.map(conv => conv.id === conversationId ? {...conv, unreadCount: 0} : conv));
          setUnreadCount(prev => Math.max(0, prev - unreadMessages.length));
        }
      }
    } catch (error) {console.error(error);}
  };

  const loadUnreadCount = async () => {
    try {
      const response = await candidateService.getUnreadCount();
      if (response.success) setUnreadCount(response.data.count);
    } catch (error) {console.error(error);}
  };

  useEffect(() => {
    if (token) loadMessages();
  }, [token, onlineUsers]); // Re-run when onlineUsers changes to update status in list

  useEffect(() => {
    loadUnreadCount();
  }, []);

  useEffect(() => {
    if (location.state?.startConversationWith && !loading && user) {
      const {startConversationWith, recruiterInfo, initialMessage} = location.state;
      const generatedId = generateConversationId(user._id, startConversationWith);
      if (generatedId) {
        const existingConv = conversations.find(c => c.id === generatedId);
        if (initialMessage && newMessage !== initialMessage) setNewMessage(initialMessage);
        if (existingConv) {
          if (activeConversation !== generatedId) setActiveConversation(generatedId);
        } else {
          const companyName = recruiterInfo?.company_name && recruiterInfo?.company_name !== 'Not specified' ? recruiterInfo.company_name : null;
          const fullName = recruiterInfo?.first_name ? `${recruiterInfo.first_name} ${recruiterInfo.last_name || ''}` : 'Nhà tuyển dụng';

          const newConv = {
            id: generatedId,
            userId: startConversationWith,
            userName: companyName || fullName,
            userAvatar: recruiterInfo?.company_logo_url || recruiterInfo?.avatar_url || null,
            userRole: 'recruiter',
            companyName: companyName || '',
            lastMessage: initialMessage || 'Bắt đầu cuộc trò chuyện mới',
            lastMessageTime: new Date(),
            unreadCount: 0,
            status: onlineUsers[startConversationWith] ? 'online' : 'offline'
          };
          setConversations(prev => prev.find(c => c.id === generatedId) ? prev : [newConv, ...prev]);
          setActiveConversation(generatedId);
        }
      }
    }
  }, [location.state, loading, user, conversations, onlineUsers]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  useEffect(() => {scrollToBottom();}, [messages]);
  useEffect(() => {
    if (activeConversation) {
      loadConversationMessages(activeConversation);
      socketService.joinConversation(activeConversation);
    }
  }, [activeConversation]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || sending) return;
    const conv = conversations.find(c => c.id === activeConversation);
    if (!conv) return;
    try {
      setSending(true);
      const response = await candidateService.sendMessage({
        receiver_id: conv.userId,
        subject: `Message from ${user.first_name || user.email}`,
        content: newMessage.trim(),
        message_type: 'general',
        related_job_id: location.state?.jobId || null
      });
      if (response.success) {
        setConversations(prev => prev.map(c => c.id === activeConversation ? {...c, lastMessage: newMessage.trim(), lastMessageTime: new Date()} : c));
        setNewMessage('');
        socketService.stopTyping(conv.userId);
      }
    } catch (error) {alert('Không thể gửi tin nhắn.');} finally {setSending(false);}
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!activeConversation) return;
    const conv = conversations.find(c => c.id === activeConversation);
    if (!conv) return;
    socketService.startTyping(conv.userId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socketService.stopTyping(conv.userId), 2000);
  };

  const deleteConversation = (id, e) => {e.stopPropagation(); setDeleteId(id);};
  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const conv = conversations.find(c => c.id === deleteId);
      if (conv?.userId) await candidateService.deleteConversation(conv.userId);
      setConversations(prev => prev.filter(c => c.id !== deleteId));
      if (activeConversation === deleteId) setActiveConversation(null);
    } catch (error) {alert('Không thể xóa cuộc trò chuyện.');} finally {setDeleteId(null);}
  };

  const formatTime = (t) => {
    const d = new Date(t);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }
    return d.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'});
  };
  const formatMessageTime = (t) => new Date(t).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

  const filteredConversations = conversations.filter(conv => (conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) || (conv.companyName && conv.companyName.toLowerCase().includes(searchQuery.toLowerCase()))) && (filter === 'all' || (filter === 'unread' && conv.unreadCount > 0)));
  const activeConv = conversations.find(conv => conv.id === activeConversation);
  const isTyping = activeConv && typingUsers[activeConv.userId];

  if (loading && conversations.length === 0) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-medium animate-pulse">Đang tải tin nhắn...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F0F2F5] overflow-hidden">
      {/* LEFT SIDEBAR */}
      <div className="w-full max-w-[360px] md:max-w-[400px] bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">Nhắn tin</h1>
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 py-0.5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</span>}
            </div>
          </div>
          <div className="relative mb-4">
            <input type="text" placeholder="Tìm kiếm công ty hoặc tên..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20" />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-semibold ${filter === 'all' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-600'}`}>Tất cả</button>
            <button onClick={() => setFilter('unread')} className={`px-4 py-2 rounded-xl text-xs font-semibold ${filter === 'unread' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-600'}`}>Chưa đọc</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar">
          {filteredConversations.map(conv => (
            <div key={conv.id} onClick={() => setActiveConversation(conv.id)} className={`flex items-center gap-4 p-4 mb-2 rounded-2xl cursor-pointer transition-all duration-200 group relative ${activeConversation === conv.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden border border-white">
                  {conv.userAvatar ? <img src={getAvatarUrl(conv.userAvatar)} alt={conv.userName} className="w-full h-full object-cover" /> : <span className="text-xl font-bold text-blue-400">{conv.userName.charAt(0)}</span>}
                </div>
                {conv.status === 'online' && <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`text-sm font-bold truncate ${activeConversation === conv.id ? 'text-blue-800' : 'text-slate-900'}`}>{conv.userName}</h3>
                  <span className="text-[10px] text-slate-400 font-medium">{formatTime(conv.lastMessageTime)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-xs truncate max-w-[180px] ${conv.unreadCount > 0 ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'}`}>{conv.lastMessage}</p>
                  {conv.unreadCount > 0 && <span className="flex items-center justify-center min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full">{conv.unreadCount}</span>}
                </div>
              </div>
              <button onClick={(e) => deleteConversation(conv.id, e)} className="absolute right-2 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT CHAT AREA */}
      <div className="flex-1 flex flex-col relative bg-white z-10 transition-all">
        {activeConv ? (
          <>
            <header className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md shadow-sm z-30">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white border-4 border-blue-50 shadow-md">
                    {activeConv.userAvatar ? <img src={getAvatarUrl(activeConv.userAvatar)} className="w-full h-full object-cover rounded-xl" /> : <span className="text-xl font-bold">{activeConv.userName.charAt(0)}</span>}
                  </div>
                  {activeConv.status === 'online' && <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">{activeConv.userName}</h2>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {onlineUsers[activeConv.userId] ? (
                      <span className="flex items-center text-[11px] font-bold text-green-500 animate-pulse">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>Đang trực tuyến
                      </span>
                    ) : <span className="text-[11px] font-semibold text-slate-400">Đang ngoại tuyến</span>}
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC] custom-scrollbar-chat relative">
              <div className="flex flex-col gap-4">
                {messages.map((msg, idx) => {
                  const isSentByMe = msg.sender_id._id === user._id;
                  return (
                    <div key={msg._id || idx} className={`flex items-end gap-3 ${isSentByMe ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}>
                      <div className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                        <div className={`p-4 rounded-3xl text-sm shadow-sm relative ${isSentByMe ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'}`}>
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 px-1">
                          <span className="text-[10px] font-bold text-slate-400">{formatMessageTime(msg.created_at)}</span>
                          {isSentByMe && <div className={msg.is_read ? 'text-blue-500' : 'text-slate-300'}><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg></div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {isTyping && <div className="text-xs text-slate-400 italic font-bold">Nhà tuyển dụng đang nhập...</div>}
              <div ref={messagesEndRef} />
            </div>

            <footer className="p-5 bg-white border-t border-slate-100 z-30">
              <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-2 flex items-center gap-2 shadow-inner">
                <input type="text" value={newMessage} onChange={handleInputChange} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Viết phản hồi cho nhà tuyển dụng..." className="flex-1 bg-transparent border-none py-3 text-sm focus:ring-0 placeholder:text-slate-400 font-medium" />
                <button onClick={sendMessage} disabled={!newMessage.trim() || sending} className={`p-3.5 rounded-full shadow-lg transition-all ${newMessage.trim() && !sending ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gradient-to-b from-slate-50 to-white italic font-bold text-slate-400">Chọn một hội thoại để bắt đầu</div>
        )}
      </div>

      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar-chat::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-chat::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default CandidateMessages;
