import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Plus, 
  FileText,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function ExtractedFacts() {
  const [facts, setFacts] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedCase, setSelectedCase] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [search, setSearch] = useState('');

  // Edit / Review Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFact, setEditingFact] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editVerified, setEditVerified] = useState(true);

  // New Fact Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFact, setNewFact] = useState({
    case_id: '',
    fact_type: 'legal_section',
    key_field: '',
    fact_value: '',
    source_page: 1,
    excerpt: ''
  });

  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    fetchFacts();
  }, [selectedCase, selectedType, verifiedFilter]);

  const fetchCases = async () => {
    try {
      const res = await api.getCases({ limit: 100 });
      if (res.success) {
        setCases(res.cases);
        if (!newFact.case_id && res.cases.length > 0) {
          setNewFact(prev => ({ ...prev, case_id: res.cases[0].id }));
        }
      }
    } catch (e) {
      console.warn('Failed to load cases', e);
    }
  };

  const fetchFacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getFacts({
        case_id: selectedCase || undefined,
        fact_type: selectedType || undefined,
        is_verified: verifiedFilter !== '' ? verifiedFilter : undefined
      });
      if (res.success) {
        setFacts(res.facts);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch extracted facts.');
    } finally {
      setLoading(false);
    }
  };
    const openEditModal = (fact) => {
    setEditingFact(fact);
    setEditKey(fact.key_field);
    setEditValue(fact.fact_value);
    setEditVerified(fact.is_verified);
    setIsEditModalOpen(true);
  };

  const handleUpdateFact = async (e) => {
    e.preventDefault();
    if (!editingFact) return;

    try {
      const res = await api.verifyFact(editingFact.id, {
        is_verified: editVerified,
        corrected_value: editValue,
        key_field: editKey
      });

      if (res.success) {
        showSuccess('Fact entry successfully verified and updated.');
        setIsEditModalOpen(false);
        fetchFacts();
      }
    } catch (err) {
      showError(err.message || 'Failed to update fact.');
    }
  };

  const handleCreateFact = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createFact(newFact);
      if (res.success) {
        showSuccess('New factual entity recorded.');
        setIsAddModalOpen(false);
        setNewFact({
          case_id: cases[0]?.id || '',
          fact_type: 'legal_section',
          key_field: '',
          fact_value: '',
          source_page: 1,
          excerpt: ''
        });
        fetchFacts();
      }
    } catch (err) {
      showError(err.message || 'Failed to create fact.');
    }
  };
    const handleDeleteFact = async (factId) => {
    if (!window.confirm('Delete this extracted fact record?')) return;
    try {
      const res = await api.deleteFact(factId);
      if (res.success) {
        showSuccess('Fact removed.');
        fetchFacts();
      }
    } catch (err) {
      showError(err.message || 'Failed to delete fact.');
    }
  };

  // Filtered facts by search
  const filteredFacts = facts.filter(f => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      f.fact_value.toLowerCase().includes(term) ||
      f.key_field.toLowerCase().includes(term) ||
      f.case_number?.toLowerCase().includes(term) ||
      f.document_title?.toLowerCase().includes(term)
    );
  });

  const factTypes = [
    'petitioner', 'respondent', 'advocate', 'court', 
    'case_number', 'filing_date', 'hearing_date', 'legal_section', 
    'event', 'outcome', 'directive'
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Verified Legal Facts & Entities
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Structured information extracted from filings with exact page citations and lawyer verification
          </p>
        </div>

        {user?.role !== 'client' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Record Legal Fact</span>
          </button>
        )}
      </div>
       {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search across extracted facts, sections, or parties..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
                <div className="flex flex-wrap items-center gap-2">
          {/* Case Filter */}
          <select
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 max-w-[180px] truncate"
          >
            <option value="">All Cases</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.case_number} - {c.title}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 capitalize"
          >
            <option value="">All Entity Types</option>
            {factTypes.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>

          {/* Verification Filter */}
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
          >
            <option value="">All Verification</option>
            <option value="true">Verified by Counsel</option>
            <option value="false">Unverified (Pending Review)</option>
          </select>
        </div>
      </div>

