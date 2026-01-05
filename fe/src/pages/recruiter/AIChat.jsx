import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import aiChatService from '@/services/aiChatService';

const STORAGE_KEY = 'recruiter_ai_chat_sessions';

const createSession = () => ({
  id: `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  title: 'New chat',
  sessionId: '',
  jobId: '',
  messages: [],
  updatedAt: Date.now()
});

const buildJobsList = (jobs = []) => {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];
  return jobs.map((job, index) => ({
    idx: index + 1,
    title: job.title || 'Untitled job',
    city: job.city || '',
    jobId: job.job_id || ''
  }));
};

const AIChat = () => {
  const user = useSelector((state) => state.auth.user);
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [input, setInput] = useState('');
  const [sendingSessions, setSendingSessions] = useState({});
  const scrollRef = useRef(null);
  const storageKey = useMemo(() => {
    const userId = user?._id || user?.id || 'anon';
    return `${STORAGE_KEY}_${userId}`;
  }, [user?._id, user?.id]);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveId(parsed[0].id);
          return;
        }
      } catch (error) {
        // Ignore parse errors, start fresh
      }
    }
    const initial = createSession();
    setSessions([initial]);
    setActiveId(initial.id);
  }, [storageKey]);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(sessions));
    }
  }, [sessions, storageKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [sessions, activeId]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId),
    [sessions, activeId]
  );
  const isSending = Boolean(activeSession && sendingSessions[activeSession.id]);

  const updateSession = (sessionId, updater) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? updater(s) : s))
    );
  };

  const handleNewChat = () => {
    const next = createSession();
    setSessions((prev) => [next, ...prev]);
    setActiveId(next.id);
  };

  const handleSelectChat = (sessionId) => {
    setActiveId(sessionId);
  };

  const handleDeleteChat = (sessionId) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      if (next.length === 0) {
        const fresh = createSession();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (sessionId === activeId) {
        setActiveId(next[0].id);
      }
      return next;
    });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeSession) return;
    const currentSessionId = activeSession.id;
    if (sendingSessions[currentSessionId]) return;

    setInput('');
    setSendingSessions((prev) => ({ ...prev, [currentSessionId]: true }));

    const userMessage = {
      role: 'user',
      content: text,
      at: new Date().toISOString()
    };

    updateSession(currentSessionId, (s) => ({
      ...s,
      messages: [...s.messages, userMessage],
      updatedAt: Date.now()
    }));

    try {
      const payload = {
        question: text,
        session_id: activeSession.sessionId || undefined,
        job_id: activeSession.jobId || undefined
      };

      const response = await aiChatService.recruiterChat(payload);
      const messageText = response?.message || 'No reply from AI.';
      const state = response?.data?.state || {};
      const result = response?.data?.result || {};
      const jobs = buildJobsList(result.jobs || result?.jobs || []);

      const assistantMessage = {
        role: 'assistant',
        content: messageText,
        items: jobs,
        at: new Date().toISOString()
      };

      updateSession(currentSessionId, (s) => ({
        ...s,
        sessionId: state.session_id || s.sessionId,
        jobId: state.payload?.job_id || s.jobId,
        messages: [...s.messages, assistantMessage],
        updatedAt: Date.now(),
        title: s.title === 'New chat' ? text.slice(0, 32) : s.title
      }));
    } catch (error) {
      toast.error(error.message || 'Chat failed');
      const assistantMessage = {
        role: 'assistant',
        content: 'AI error. Please try again.',
        at: new Date().toISOString()
      };
      updateSession(currentSessionId, (s) => ({
        ...s,
        messages: [...s.messages, assistantMessage],
        updatedAt: Date.now()
      }));
    } finally {
      setSendingSessions((prev) => ({ ...prev, [currentSessionId]: false }));
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">AI Chat</h1>
        <p className="mt-2 text-gray-600">
          Trợ lý tuyển dụng cho xếp hạng, phân tích và chọn job.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start md:items-stretch">
        <div className="w-full md:w-1/4 md:flex-none md:sticky md:top-24">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col md:h-[calc(100vh-220px)] h-full">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Lịch sử</h2>
                <p className="text-xs text-gray-500">Các cuộc trò chuyện</p>
              </div>
              <button
                onClick={handleNewChat}
                className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700"
              >
                Mới
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">Chưa có cuộc trò chuyện.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`flex items-start gap-2 px-4 py-3 hover:bg-gray-50 transition ${
                        session.id === activeId ? 'bg-green-50' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectChat(session.id)}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {session.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(session.updatedAt).toLocaleString()}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteChat(session.id)}
                        className="text-xs font-semibold text-gray-400 hover:text-red-500 shrink-0"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full md:w-3/4 md:flex-none">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col min-h-[520px] md:h-[calc(100vh-220px)]">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {activeSession?.title || 'AI Chat'}
                  </h2>
                  <p className="text-xs text-gray-500">Trợ lý tuyển dụng</p>
                </div>
                {activeSession?.jobId ? (
                  <span className="text-xs text-gray-500">
                    Job: {activeSession.jobId}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {(activeSession?.messages || []).length === 0 ? (
                <div className="text-sm text-gray-500">Gợi ý: "Cho top 5 ứng viên phù hợp nhất".</div>
              ) : (
                activeSession.messages.map((msg, index) => (
                  <div
                    key={`${msg.at || 'msg'}_${index}`}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-green-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {Array.isArray(msg.items) && msg.items.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {msg.items.map((item) => (
                            <div
                              key={`${item.jobId || item.idx}`}
                              className="text-xs bg-white text-gray-700 rounded-lg px-3 py-2 border border-gray-200"
                            >
                              {item.idx}. {item.title}
                              {item.city ? ` (${item.city})` : ''}
                            </div>
                          ))}
                          <div className="text-xs text-gray-500">
                            Trả lời "chọn 1" để chọn job.
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
              {isSending ? (
                <div className="flex justify-start">
                  <div className="max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm bg-gray-100 text-gray-800 rounded-bl-sm">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
                      <span>Đang suy nghĩ...</span>
                    </span>
                  </div>
                </div>
              ) : null}
              <div ref={scrollRef} />
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-end gap-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {isSending ? 'Đang gửi...' : 'Gửi'}
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Enter để gửi, Shift+Enter để xuống dòng.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
