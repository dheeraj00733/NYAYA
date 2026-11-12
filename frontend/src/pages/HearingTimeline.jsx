import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Scale, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  ArrowRight,
  Briefcase
} from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function HearingTimeline() {
  const [hearings, setHearings] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [caseFilter, setCaseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Schedule Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hearingForm, setHearingForm] = useState({
    case_id: '',
    hearing_date: '',
    hearing_time: '10:30',
    court_room: '',
    purpose: 'preliminary',
    presiding_judge: '',
    status: 'scheduled',
    outcome_summary: '',
    next_steps: ''
  });

  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    fetchHearings();
  }, [caseFilter, statusFilter]);

  const fetchCases = async () => {
    try {
      const res = await api.getCases({ limit: 100 });
      if (res.success) {
        setCases(res.cases);
        if (!hearingForm.case_id && res.cases.length > 0) {
          setHearingForm(prev => ({ ...prev, case_id: res.cases[0].id }));
        }
      }
    } catch (e) {
      console.warn('Could not fetch cases', e);
    }
  };

  const fetchHearings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getHearings({
        case_id: caseFilter || undefined,
        status: statusFilter || undefined
      });
      if (res.success) {
        setHearings(res.hearings);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch hearings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHearing = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createHearing(hearingForm);
      if (res.success) {
        showSuccess('Court proceeding scheduled.');
        setIsModalOpen(false);
        fetchHearings();
      }
    } catch (err) {
      showError(err.message || 'Failed to schedule hearing.');
    }
  };
  const upcomingHearings = hearings.filter(h => new Date(h.hearing_date) >= new Date(new Date().setHours(0,0,0,0)));
  const pastHearings = hearings.filter(h => new Date(h.hearing_date) < new Date(new Date().setHours(0,0,0,0)));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Court Hearing Schedule & Timeline
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Chronological judicial proceedings, courtroom dockets, and recorded hearing outcomes
          </p>
        </div>

        {user?.role !== 'client' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Hearing</span>
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter Dockets:</span>
        </span>

        <select
          value={caseFilter}
          onChange={(e) => setCaseFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 max-w-xs"
        >
          <option value="">All Cases</option>
          {cases.map(c => (
            <option key={c.id} value={c.id}>{c.case_number} - {c.title}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="adjourned">Adjourned</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
