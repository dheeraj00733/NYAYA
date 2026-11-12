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


      {/* Facts Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs text-slate-500">Querying extracted facts repository...</p>
        </div>
      ) : filteredFacts.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center max-w-md mx-auto">
          <Scale className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Legal Facts Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Upload petitions or orders to run the automated NLP legal fact extractor.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Entity / Key Field</th>
                <th className="px-6 py-3.5">Extracted Value</th>
                <th className="px-6 py-3.5">Source Citation</th>
                <th className="px-6 py-3.5">Verification</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFacts.map(fact => (
                <tr key={fact.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                    <Badge variant="default" size="xs">{fact.key_field}</Badge>
                    <span className="block text-[11px] text-slate-400 capitalize font-normal mt-1">
                      {fact.fact_type.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-slate-800 font-medium max-w-md">
                    <p className="line-clamp-2">{fact.fact_value}</p>
                    {fact.excerpt && (
                      <p className="text-[11px] text-slate-400 italic line-clamp-1 mt-1">
                        "{fact.excerpt}"
                      </p>
                    )}
                  </td>

                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                    <div className="font-semibold text-blue-700">{fact.case_number}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                      {fact.document_title || 'Case Document'} (Page {fact.source_page || 1})
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {fact.is_verified ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Pending Review</span>
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                    <button
                      onClick={() => openEditModal(fact)}
                      title="Review / Correct / Verify Fact"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {user?.role !== 'client' && (
                      <button
                        onClick={() => handleDeleteFact(fact.id)}
                        title="Delete Fact"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

       {/* Review / Edit Fact Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Review & Verify Legal Fact"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleUpdateFact} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Entity Field</label>
            <input
              type="text"
              required
              value={editKey}
              onChange={(e) => setEditKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Extracted Fact Value</label>
            <textarea
              rows={3}
              required
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {editingFact?.excerpt && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-600 block mb-1">Source Excerpt (Page {editingFact.source_page}):</span>
              <p className="text-slate-500 italic">"{editingFact.excerpt}"</p>
            </div>
          )}

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="verify-checkbox"
              checked={editVerified}
              onChange={(e) => setEditVerified(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300"
            />
            <label htmlFor="verify-checkbox" className="text-xs font-bold text-slate-800">
              Confirm fact as verified by legal counsel
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
            >
              Save & Verify Fact
            </button>
          </div>
        </form>
      </Modal>

      {/* Record New Fact Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Specific Legal Fact"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateFact} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Associated Case *</label>
            <select
              required
              value={newFact.case_id}
              onChange={(e) => setNewFact({ ...newFact, case_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              {cases.map(c => (
                <option key={c.id} value={c.id}>[{c.case_number}] {c.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Fact Category</label>
              <select
                value={newFact.fact_type}
                onChange={(e) => setNewFact({ ...newFact, fact_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs capitalize"
              >
                {factTypes.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Key Label *</label>
              <input
                type="text"
                required
                value={newFact.key_field}
                onChange={(e) => setNewFact({ ...newFact, key_field: e.target.value })}
                placeholder="e.g. Interim Injunction"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Fact Value *</label>
            <textarea
              rows={3}
              required
              value={newFact.fact_value}
              onChange={(e) => setNewFact({ ...newFact, fact_value: e.target.value })}
              placeholder="e.g. Injunction granted restraining trademark use until final disposal."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">Record Fact</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}



