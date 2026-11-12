import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  Scale, 
  FileText, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  Cpu,
  Info
} from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import { useNotification } from '../context/NotificationContext';

export default function AIChatbot() {
  const [searchParams, setSearchParams] = useSearchParams();
  const caseIdParam = searchParams.get('caseId');
  const chatIdParam = searchParams.get('chatId');

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(caseIdParam || '');
  const [inputQuery, setInputQuery] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingQuery, setSendingQuery] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState({});

  const messagesEndRef = useRef(null);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    loadCasesAndChats();
  }, []);

  useEffect(() => {
    if (chatIdParam) {
      loadChatMessages(chatIdParam);
    }
  }, [chatIdParam]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sendingQuery]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadCasesAndChats = async () => {
    try {
      const [casesRes, chatsRes] = await Promise.all([
        api.getCases({ limit: 50 }),
        api.getChats({})
      ]);

      if (casesRes.success) {
        setCases(casesRes.cases);
        if (!selectedCaseId && casesRes.cases.length > 0) {
          setSelectedCaseId(casesRes.cases[0].id);
        }
      }

      if (chatsRes.success) {
        setChats(chatsRes.chats);
        if (chatsRes.chats.length > 0 && !chatIdParam) {
          const firstChat = chatsRes.chats[0];
          setActiveChat(firstChat);
          loadChatMessages(firstChat.id);
        }
      }
    } catch (e) {
      console.error('Failed to load initial chat workspace:', e);
    }
  };

  const loadChatMessages = async (chatId) => {
    try {
      setLoadingMessages(true);
      const res = await api.getMessages(chatId);
      if (res.success) {
        setMessages(res.messages);
        const current = chats.find(c => c.id === chatId);
        if (current) {
          setActiveChat(current);
          setSelectedCaseId(current.case_id);
        }
      }
    } catch (err) {
      showError(err.message || 'Failed to load conversation history.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateNewChat = async () => {
    if (!selectedCaseId) {
      showError('Please select a case to ground the AI conversation.');
      return;
    }

    try {
      const selectedCase = cases.find(c => c.id === selectedCaseId);
      const res = await api.createChat({
        case_id: selectedCaseId,
        title: `Inquiry - ${selectedCase?.case_number || 'Case Docket'}`
      });

      if (res.success) {
        setChats(prev => [res.chat, ...prev]);
        setActiveChat(res.chat);
        setMessages([]);
        setSearchParams({ chatId: res.chat.id, caseId: selectedCaseId });
        showSuccess('New grounded AI session initialized.');
      }
    } catch (err) {
      showError(err.message || 'Could not start new chat.');
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation history?')) return;

    try {
      const res = await api.deleteChat(chatId);
      if (res.success) {
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (activeChat?.id === chatId) {
          setActiveChat(null);
          setMessages([]);
          setSearchParams({});
        }
        showSuccess('Conversation deleted.');
      }
    } catch (err) {
      showError(err.message || 'Failed to delete chat.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const query = inputQuery.trim();
    setInputQuery('');

    // Ensure we have an active chat session
    let currentChatId = activeChat?.id;
    if (!currentChatId) {
      if (!selectedCaseId) {
        showError('Please select a case first.');
        return;
      }
      try {
        const createRes = await api.createChat({
          case_id: selectedCaseId,
          title: query.slice(0, 35) + '...'
        });
        currentChatId = createRes.chat.id;
        setActiveChat(createRes.chat);
        setChats(prev => [createRes.chat, ...prev]);
        setSearchParams({ chatId: currentChatId, caseId: selectedCaseId });
      } catch (err) {
        showError('Could not initialize session.');
        return;
      }
    }

    // Optimistic user message
    const tempUserMsg = {
      id: 'temp-' + Date.now(),
      sender_type: 'user',
      content: query,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      setSendingQuery(true);
      const res = await api.sendMessage(currentChatId, { content: query });
      if (res.success) {
        setMessages(prev => [
          ...prev.filter(m => m.id !== tempUserMsg.id),
          res.user_message,
          res.assistant_message
        ]);
      }
    } catch (err) {
      showError(err.message || 'AI RAG processing failed.');
    } finally {
      setSendingQuery(false);
    }
  };

  const toggleCitation = (msgId, cIdx) => {
    const key = `${msgId}-${cIdx}`;
    setExpandedCitations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const samplePrompts = [
    "What legal grounds does the petitioner cite for quashing the FIR?",
    "What interim relief or protection was granted by the court?",
    "Summarize the main claims and monetary damages sought.",
    "Explain the legal ingredients required under Section 66 IT Act."
  ];

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-6 overflow-hidden bg-slate-100">
      {/* Left Chat Sessions Drawer */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">AI Co-Counsel Threads</span>
            <button
              onClick={handleCreateNewChat}
              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          </div>

          {/* Case Scope Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Matter Scope:
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
            >
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.case_number} - {c.title.slice(0, 24)}...</option>
              ))}
            </select>
          </div>
        </div>

        {/* Previous Chat Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.map(c => (
            <div
              key={c.id}
              onClick={() => {
                setActiveChat(c);
                loadChatMessages(c.id);
                setSearchParams({ chatId: c.id, caseId: c.case_id });
              }}
              className={`p-3 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-start justify-between group ${
                activeChat?.id === c.id
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : 'text-slate-700 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="min-w-0 pr-2">
                <p className="font-bold truncate">{c.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{c.case_number}</p>
              </div>
              <button
                onClick={(e) => handleDeleteChat(e, c.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {chats.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              No conversations started yet.
            </div>
          )}
        </div>
      </div>

      {/* Main Conversational Area */}
      <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden">
        {/* Chat Header */}
        <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                {activeChat ? activeChat.title : 'Legal Intelligence Co-Counsel'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Grounded RAG • SentenceTransformers (384-dim) + Ollama + pgvector
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 text-[11px] text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>Model: Qwen2.5 / MiniLM-L6</span>
            </div>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Legal Disclaimer Pill */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start space-x-2.5 text-amber-900 text-xs max-w-3xl mx-auto">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-bold">Legal Research Disclaimer:</span> NyayaFlow AI synthesizes ground truth directly from your uploaded case documents. It strictly avoids hallucinating legal citations and does not constitute formal legal representation.
            </p>
          </div>

          {messages.length === 0 && !loadingMessages && (
            <div className="text-center py-12 max-w-lg mx-auto space-y-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Scale className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Ask Questions Grounded in Case Filings
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                NyayaFlow performs vector similarity search across all documents filed under this case to extract supporting excerpts, verify statutes, and explain complex arguments.
              </p>

              <div className="pt-4 grid gap-2 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">Suggested Inquiries</span>
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputQuery(p)}
                    className="p-3 text-xs bg-white hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-xl text-slate-700 transition-all font-medium text-left shadow-2xs"
                  >
                    "{p}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingMessages && (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {messages.map((m) => {
            const isUser = m.sender_type === 'user';
            const citations = typeof m.citations === 'string' ? JSON.parse(m.citations) : (m.citations || []);

            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-3xl mx-auto ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-2xs ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-slate-900 rounded-bl-none border border-slate-200/90'
                  }`}
                >
                  <div className="whitespace-pre-line font-normal text-[13px] leading-relaxed">
                    {m.content}
                  </div>

                  {/* Verifiable Citations Drawer */}
                  {citations && citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-2">
                      <div className="flex items-center space-x-1.5 text-blue-700 font-bold uppercase tracking-wider text-[10px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verifiable Document Citations ({citations.length}):</span>
                      </div>

                      <div className="grid gap-2">
                        {citations.map((c, cIdx) => {
                          const isExpanded = expandedCitations[`${m.id}-${cIdx}`];
                          return (
                            <div
                              key={cIdx}
                              className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-slate-800"
                            >
                              <div
                                onClick={() => toggleCitation(m.id, cIdx)}
                                className="flex items-center justify-between cursor-pointer"
                              >
                                <span className="font-bold text-blue-900 truncate">
                                  {c.document_title || 'Case Document'} • Page {c.page_number}
                                </span>
                                <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                                  {c.similarity_score && (
                                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                                      Match {(c.similarity_score * 100).toFixed(0)}%
                                    </span>
                                  )}
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </div>
                              </div>

                              {isExpanded && (
                                <p className="mt-2 text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100 leading-normal">
                                  "{c.excerpt}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}

          {sendingQuery && (
            <div className="max-w-3xl mx-auto flex items-center space-x-3 text-xs text-slate-500 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Searching vector index, retrieving chunks, and generating grounded answer...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center space-x-3">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask a question about this legal case (e.g. grounds, relief, dates, sections)..."
              disabled={sendingQuery}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={sendingQuery || !inputQuery.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
