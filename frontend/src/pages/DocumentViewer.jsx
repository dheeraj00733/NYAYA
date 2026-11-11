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
