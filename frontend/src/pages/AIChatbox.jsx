import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Sparkles,
  Plus,
  Trash2,
  Scale,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info
} from 'lucide-react';
import { api } from '../api/client';
import { useNotification } from '../context/NotificationContext';

export default function AIChatbot() {
  const [searchParams, setSearchParams] = useSearchParams();
  const chatIdParam = searchParams.get('chatId');
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('caseId') || '');
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sendingQuery]);

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
        const chat = chatsRes.chats.find(item => item.id === chatIdParam) || chatsRes.chats[0];
        if (chat) {
          setActiveChat(chat);
          setSelectedCaseId(chat.case_id);
          loadChatMessages(chat.id);
        }
      }
    } catch (err) {
      console.error('Failed to load initial chat workspace:', err);
    }
  };

  const loadChatMessages = async (chatId) => {
    try {
      setLoadingMessages(true);
      const res = await api.getMessages(chatId);
      if (res.success) {
        setMessages(res.messages);
        const chat = chats.find(item => item.id === chatId);
        if (chat) {
          setActiveChat(chat);
          setSelectedCaseId(chat.case_id);
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
      const selectedCase = cases.find(caseItem => caseItem.id === selectedCaseId);
      const res = await api.createChat({
        case_id: selectedCaseId,
        title: `Inquiry - ${selectedCase?.case_number || 'Case Docket'}`
      });

      if (res.success) {
        setChats(previous => [res.chat, ...previous]);
        setActiveChat(res.chat);
        setMessages([]);
        setSearchParams({ chatId: res.chat.id, caseId: selectedCaseId });
        showSuccess('New grounded AI session initialized.');
      }
    } catch (err) {
      showError(err.message || 'Could not start new chat.');
    }
  };

  const handleDeleteChat = async (event, chatId) => {
    event.stopPropagation();
    if (!window.confirm('Delete this conversation history?')) return;

    try {
      const res = await api.deleteChat(chatId);
      if (res.success) {
        setChats(previous => previous.filter(chat => chat.id !== chatId));
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

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!inputQuery.trim()) return;

    const query = inputQuery.trim();
    setInputQuery('');
    let currentChatId = activeChat?.id;

    if (!currentChatId) {
      if (!selectedCaseId) {
        showError('Please select a case first.');
        return;
      }

      try {
        const createRes = await api.createChat({
          case_id: selectedCaseId,
          title: `${query.slice(0, 35)}...`
        });
        currentChatId = createRes.chat.id;
        setActiveChat(createRes.chat);
        setChats(previous => [createRes.chat, ...previous]);
        setSearchParams({ chatId: currentChatId, caseId: selectedCaseId });
      } catch {
        showError('Could not initialize session.');
        return;
      }
    }

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      sender_type: 'user',
      content: query,
      created_at: new Date().toISOString()
    };
    setMessages(previous => [...previous, tempUserMsg]);

    try {
      setSendingQuery(true);
      const res = await api.sendMessage(currentChatId, { content: query });
      if (res.success) {
        setMessages(previous => [
          ...previous.filter(message => message.id !== tempUserMsg.id),
          res.user_message,
          res.assistant_message
        ]);
      }
    } catch (err) {
      setMessages(previous => previous.filter(message => message.id !== tempUserMsg.id));
      showError(err.message || 'AI RAG processing failed.');
    } finally {
      setSendingQuery(false);
    }
  };

  const toggleCitation = (messageId, citationIndex) => {
    const key = `${messageId}-${citationIndex}`;
    setExpandedCitations(previous => ({ ...previous, [key]: !previous[key] }));
  };

  const samplePrompts = [
    'What legal grounds does the petitioner cite for quashing the FIR?',
    'What interim relief or protection was granted by the court?',
    'Summarize the main claims and monetary damages sought.',
    'Explain the legal ingredients required under Section 66 IT Act.'
  ];

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-6 overflow-hidden bg-slate-100">
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <span className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>AI Co-Counsel Threads</span>
          </span>
          <button
            onClick={handleCreateNewChat}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Matter Scope:</label>
            <select
              value={selectedCaseId}
              onChange={(event) => setSelectedCaseId(event.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
            >
              {cases.map(caseItem => (
                <option key={caseItem.id} value={caseItem.id}>{caseItem.case_number} - {caseItem.title.slice(0, 24)}...</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => {
                setActiveChat(chat);
                loadChatMessages(chat.id);
                setSearchParams({ chatId: chat.id, caseId: chat.case_id });
              }}
              className={`w-full text-left p-3 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                activeChat?.id === chat.id ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-start justify-between">
                <span className="font-bold truncate">{chat.title}</span>
                <button
                  type="button"
                  onClick={(event) => handleDeleteChat(event, chat.id)}
                  className="ml-2 p-1 text-slate-400 hover:text-rose-600"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 truncate block">{chat.case_number}</span>
            </button>
          ))}
          {chats.length === 0 && <p className="text-center py-8 text-xs text-slate-400">No conversations started yet.</p>}
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center space-x-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{activeChat?.title || 'Legal Intelligence Co-Counsel'}</h3>
            <p className="text-[11px] text-slate-500">Grounded RAG • SentenceTransformers + Ollama + pgvector</p>
          </div>
          <div className="ml-auto hidden sm:flex items-center space-x-1.5 text-[11px] text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>Model: Qwen2.5 / MiniLM-L6</span>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs max-w-3xl mx-auto">
            <div className="flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Legal Research Disclaimer:</strong> NyayaFlow AI synthesizes information from uploaded case documents and does not constitute formal legal representation.
              </p>
            </div>
          </div>
          {messages.length === 0 && !loadingMessages && (
            <div className="text-center py-8 max-w-lg mx-auto space-y-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <Scale className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Ask Questions Grounded in Case Filings</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Search documents filed under this case for supporting excerpts and explanations.
              </p>
              <div className="pt-2 grid gap-2 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">Suggested Inquiries</span>
                {samplePrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setInputQuery(prompt)}
                    className="p-3 text-xs bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-slate-700 text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map(message => {
            const isUser = message.sender_type === 'user';
            const citations = typeof message.citations === 'string'
              ? JSON.parse(message.citations)
              : (message.citations || []);
            return (
              <div key={message.id} className={`flex flex-col max-w-3xl mx-auto ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl text-[13px] leading-relaxed max-w-[90%] shadow-sm ${
                  isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-900 rounded-bl-none border border-slate-200'
                }`}>
                  <p className="whitespace-pre-line">{message.content}</p>
                  {citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-2">
                      <div className="flex items-center space-x-1.5 text-blue-700 font-bold uppercase tracking-wider text-[10px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verifiable Document Citations ({citations.length}):</span>
                      </div>
                      {citations.map((citation, index) => {
                        const expanded = expandedCitations[`${message.id}-${index}`];
                        return (
                          <div key={index} className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-slate-800">
                            <button
                              type="button"
                              onClick={() => toggleCitation(message.id, index)}
                              className="w-full flex items-center justify-between text-left"
                            >
                              <span className="font-bold text-blue-900 truncate">
                                {citation.document_title || 'Case Document'} • Page {citation.page_number}
                              </span>
                              <span className="flex items-center space-x-2 text-[10px] text-slate-500">
                                {citation.similarity_score && (
                                  <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                                    Match {(citation.similarity_score * 100).toFixed(0)}%
                                  </span>
                                )}
                                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </span>
                            </button>
                            {expanded && (
                              <p className="mt-2 text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100">
                                "{citation.excerpt}"
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          {loadingMessages && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {sendingQuery && (
            <div className="max-w-3xl mx-auto flex items-center space-x-3 text-xs text-slate-500 bg-white p-3.5 rounded-2xl border border-slate-200">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Searching vector index, retrieving chunks, and generating a grounded answer...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </section>

        <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center space-x-3">
            <input
              type="text"
              value={inputQuery}
              onChange={(event) => setInputQuery(event.target.value)}
              placeholder="Ask a question about this legal case..."
              disabled={sendingQuery}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
            />
            <button
              type="submit"
              disabled={sendingQuery || !inputQuery.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
