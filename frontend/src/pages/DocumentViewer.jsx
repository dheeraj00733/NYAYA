import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  ChevronLeft, 
  Download, 
  Sparkles, 
  Scale, 
  MessageSquare, 
  CheckCircle, 
  Check, 
  AlertCircle,
  ExternalLink,
  BookOpen,
  Send,
  Layers
} from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import { useNotification } from '../context/NotificationContext';


export default function DocumentViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useNotification();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRightTab, setActiveRightTab] = useState('summary'); // 'summary' | 'facts' | 'chat'

  // Document chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Summarize loading
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    fetchDocumentDetails();
  }, [id]);

  const fetchDocumentDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDocumentById(id);
      if (res.success) {
        setDocument(res.document);
      }
    } catch (err) {
      setError(err.message || 'Failed to load document.');
    } finally {
      setLoading(false);
    }
  };
   const handleVerifyFact = async (factId) => {
    try {
      const res = await api.verifyFact(factId, { is_verified: true });
      if (res.success) {
        showSuccess('Fact verified by counsel.');
        fetchDocumentDetails();
      }
    } catch (err) {
      showError(err.message || 'Failed to verify fact.');
    }
  };
   const handleRegenerateSummary = async () => {
    try {
      setSummarizing(true);
      showInfo('AI model analyzing text across all pages...');
      const res = await api.summarizeDocument(id);
      if (res.success) {
        showSuccess('Summary updated!');
        fetchDocumentDetails();
      }
    } catch (err) {
      showError(err.message || 'Summary regeneration failed.');
    } finally {
      setSummarizing(false);
    }
  };

  const handleSendDocQuery = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !document) return;

    const userText = chatInput.trim();
    setChatInput('');

    // Optimistic user message
    const newMsg = { sender_type: 'user', content: userText };
    setChatMessages(prev => [...prev, newMsg]);

    try {
      setChatLoading(true);

      // Create a temporary chat or use direct RAG endpoint
      let activeChatId = document.active_chat_id;
      if (!activeChatId) {
        const chatRes = await api.createChat({
          case_id: document.case_id,
          document_id: document.id,
          title: `Document Q&A: ${document.title.slice(0, 30)}`
        });
        activeChatId = chatRes.chat.id;
        document.active_chat_id = activeChatId;
      }

       const res = await api.sendMessage(activeChatId, { content: userText });
      if (res.success) {
        setChatMessages(prev => [
          ...prev,
          {
            sender_type: 'assistant',
            content: res.assistant_message.content,
            citations: res.citations || []
          }
        ]);
      }
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          sender_type: 'assistant',
          content: `Query failed: ${err.message}`
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-xs text-slate-500">Opening document viewer...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center max-w-lg mx-auto mt-12">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900">Document Unavailable</h3>
        <p className="text-xs text-slate-600 mt-1 mb-4">{error || 'Document not found.'}</p>
        <button
          onClick={() => navigate('/documents')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
        >
          Return to Documents
        </button>
      </div>
    );
  }

