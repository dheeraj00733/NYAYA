import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  Search, 
  Plus, 
  Filter, 
  Calendar, 
  FileText, 
  Users, 
  Scale, 
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function CasesList() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  
  // Create Case Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    case_number: '',
    title: '',
    description: '',
    category: 'criminal',
    priority: 'medium',
    court_name: 'High Court of Delhi',
    court_type: 'High Court',
    judge_name: '',
    filing_date: new Date().toISOString().split('T')[0],
    next_hearing_date: '',
    petitioner_name: '',
    respondent_name: ''
  });

  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCases();
  }, [search, statusFilter, categoryFilter, priorityFilter]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCases({
        search,
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
        limit: 50
      });
      if (res.success) {
        setCases(res.cases);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch cases from database.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setCreateLoading(true);

      const parties = [];
      if (formData.petitioner_name.trim()) {
        parties.push({
          name: formData.petitioner_name.trim(),
          party_role: 'petitioner',
          party_type: 'individual'
        });
      }
      if (formData.respondent_name.trim()) {
        parties.push({
          name: formData.respondent_name.trim(),
          party_role: 'respondent',
          party_type: 'government_body'
        });
      }

      const payload = {
        case_number: formData.case_number.trim(),
        title: formData.title.trim(),
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        court_name: formData.court_name,
        court_type: formData.court_type,
        judge_name: formData.judge_name,
        filing_date: formData.filing_date || null,
        next_hearing_date: formData.next_hearing_date || null,
        parties
      };

      const res = await api.createCase(payload);
      if (res.success) {
        showSuccess(`Case [${res.case.case_number}] created successfully!`);
        setIsModalOpen(false);
        setFormData({
          case_number: '',
          title: '',
          description: '',
          category: 'criminal',
          priority: 'medium',
          court_name: 'High Court of Delhi',
          court_type: 'High Court',
          judge_name: '',
          filing_date: new Date().toISOString().split('T')[0],
          next_hearing_date: '',
          petitioner_name: '',
          respondent_name: ''
        });
        fetchCases();
      }
    } catch (err) {
      showError(err.message || 'Could not create legal case.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Legal Matters & Cases
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your litigation dockets, filings, hearings, and associated intelligence
          </p>
        </div>

        {user?.role !== 'client' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Legal Case</span>
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case number, title, court, or keywords..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Statuses</option>
            <option value="filed">Filed</option>
            <option value="pending">Pending</option>
            <option value="hearing">Hearing</option>
            <option value="decided">Decided</option>
            <option value="closed">Closed</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Categories</option>
            <option value="criminal">Criminal</option>
            <option value="corporate">Corporate</option>
            <option value="civil">Civil</option>
            <option value="constitutional">Constitutional</option>
            <option value="ipr">IPR</option>
            <option value="tax">Tax</option>
            <option value="family">Family</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Cases List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs text-slate-500">Retrieving case records from database...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-white rounded-2xl border border-rose-200 text-center text-rose-700 text-sm">
          {error}
        </div>
      ) : cases.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center max-w-md mx-auto">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Legal Cases Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            No matters match your filter criteria or no cases have been created yet.
          </p>
          {user?.role !== 'client' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Create New Matter
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400/80 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Header row with badges */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {c.case_number}
                    </span>
                    <Badge variant={c.category} size="xs">{c.category}</Badge>
                    <Badge variant={c.priority} size="xs">{c.priority}</Badge>
                  </div>
                  <Badge variant={c.status} size="xs">{c.status}</Badge>
                </div>

                {/* Case Title */}
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
                  {c.title}
                </h3>

                {/* Description */}
                {c.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                    {c.description}
                  </p>
                )}

                {/* Judicial Forum Details */}
                <div className="text-xs text-slate-500 space-y-1 mb-4">
                  <p className="flex items-center space-x-1.5 truncate">
                    <Scale className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="font-medium text-slate-700">{c.court_name}</span>
                    {c.judge_name && <span className="text-slate-400">• {c.judge_name}</span>}
                  </p>
                  {c.next_hearing_date && (
                    <p className="flex items-center space-x-1.5 text-amber-700 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>Next Hearing: {new Date(c.next_hearing_date).toLocaleDateString()}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Aggregates Bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1" title="Documents count">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{c.documents_count || 0} Docs</span>
                  </span>
                  <span className="flex items-center space-x-1" title="Hearings count">
                    <Calendar className="w-3.5 h-3.5 text-purple-500" />
                    <span>{c.hearings_count || 0} Hearings</span>
                  </span>
                  <span className="flex items-center space-x-1" title="Extracted facts">
                    <Scale className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{c.facts_count || 0} Facts</span>
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-blue-600 group-hover:translate-x-1 transition-transform">
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Case Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="File New Legal Case Matter"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Case Number / Docket No. *
              </label>
              <input
                type="text"
                required
                value={formData.case_number}
                onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                placeholder="e.g. CRL-WP-2025-1049"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Legal Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 capitalize"
              >
                {['criminal', 'corporate', 'civil', 'constitutional', 'ipr', 'tax', 'family', 'labor', 'arbitration'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Case Caption / Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Mehta BioTech Ltd. vs. Union of India & Anr."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description & Context
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief summary of prayer, relief sought, and background..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Court / Judicial Forum *
              </label>
              <input
                type="text"
                required
                value={formData.court_name}
                onChange={(e) => setFormData({ ...formData, court_name: e.target.value })}
                placeholder="High Court of Delhi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Presiding Judge / Bench
              </label>
              <input
                type="text"
                value={formData.judge_name}
                onChange={(e) => setFormData({ ...formData, judge_name: e.target.value })}
                placeholder="Hon'ble Justice ..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Filing Date
              </label>
              <input
                type="date"
                value={formData.filing_date}
                onChange={(e) => setFormData({ ...formData, filing_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Next Hearing Date
              </label>
              <input
                type="date"
                value={formData.next_hearing_date}
                onChange={(e) => setFormData({ ...formData, next_hearing_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-700 mb-2">Initial Parties (Optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  value={formData.petitioner_name}
                  onChange={(e) => setFormData({ ...formData, petitioner_name: e.target.value })}
                  placeholder="Petitioner / Claimant name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={formData.respondent_name}
                  onChange={(e) => setFormData({ ...formData, respondent_name: e.target.value })}
                  placeholder="Respondent / Defendant name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {createLoading ? 'Registering Matter...' : 'File Case in System'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
