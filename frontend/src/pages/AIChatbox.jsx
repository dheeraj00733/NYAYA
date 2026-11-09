import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Send, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { useNotification } from '../context/NotificationContext';

export default function AIChatbot() {
  const [searchParams] = useSearchParams();
  const chatIdParam = searchParams.get('chatId');
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('caseId') || '');
  const [inputQuery, setInputQuery] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingQuery, setSendingQuery] = useState(false);
  const messagesEndRef = useRef(null);
  const { showError } = useNotification();

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

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!inputQuery.trim()) return;
    if (!activeChat) {
      showError('Start or select a chat before sending a message.');
      return;
    }

    const query = inputQuery.trim();
    setInputQuery('');
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      sender_type: 'user',
      content: query,
      created_at: new Date().toISOString()
    };
    setMessages(previous => [...previous, tempUserMsg]);

    try {
      setSendingQuery(true);
      const res = await api.sendMessage(activeChat.id, { content: query });
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

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-6 overflow-hidden bg-slate-100">
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <span className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>AI Co-Counsel Threads</span>
          </span>
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
            <button
              key={chat.id}
              onClick={() => {
                setActiveChat(chat);
                loadChatMessages(chat.id);
              }}
              className={`w-full text-left p-3 rounded-xl text-xs font-medium transition-all ${
                activeChat?.id === chat.id ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="font-bold truncate block">{chat.title}</span>
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
        </header>

        <section className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs max-w-3xl mx-auto">
            <strong>Legal Research Disclaimer:</strong> NyayaFlow AI synthesizes information from uploaded case documents and does not constitute formal legal representation.
          </div>
          {messages.map(message => {
            const isUser = message.sender_type === 'user';
            return (
              <div key={message.id} className={`flex max-w-3xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-4 rounded-2xl text-[13px] leading-relaxed max-w-[90%] ${
                  isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-900 rounded-bl-none border border-slate-200'
                }`}>
                  <p className="whitespace-pre-line">{message.content}</p>
                </div>
              </div>
            );
          })}
          {loadingMessages && <div className="text-center text-xs text-slate-500">Loading conversation...</div>}
          {sendingQuery && <div className="text-center text-xs text-slate-500">Searching case documents and preparing a response...</div>}
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
