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

      {/* Timeline Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs text-slate-500">Loading judicial calendar...</p>
        </div>
      ) : hearings.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center max-w-md mx-auto">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Hearings Scheduled</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Schedule hearing dates, courtroom numbers, and bench details for your matters.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Upcoming Court Hearings ({upcomingHearings.length})
              </h3>
            </div>

            {upcomingHearings.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {upcomingHearings.map(h => (
                  <div key={h.id} className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-600"></div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-blue-700">{h.case_number}</span>
                        <Badge variant={h.purpose} size="xs">{h.purpose.replace(/_/g, ' ')}</Badge>
                      </div>
                      <Badge variant={h.status} size="xs">{h.status}</Badge>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">{h.case_title}</h4>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="font-bold text-slate-900">
                          {new Date(h.hearing_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {h.hearing_time && <span className="text-slate-500">• {h.hearing_time.slice(0, 5)} hrs</span>}
                      </p>
                      <p className="flex items-center space-x-2">
                        <Scale className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{h.court_name} {h.court_room ? `(${h.court_room})` : ''}</span>
                      </p>
                      {h.presiding_judge && (
                        <p className="text-[11px] text-slate-400">Bench: {h.presiding_judge}</p>
                      )}
                    </div>

                    {h.next_steps && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <span className="font-semibold">Next steps:</span> {h.next_steps}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No future hearings scheduled.</p>
            )}
          </div>

          {/* Past Hearings Section */}
          {pastHearings.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Past Court Proceedings ({pastHearings.length})
                </h3>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Case</th>
                      <th className="px-6 py-3">Purpose</th>
                      <th className="px-6 py-3">Outcome Summary</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pastHearings.map(h => (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                          {new Date(h.hearing_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="font-semibold text-blue-700 block">{h.case_number}</span>
                          <span className="text-[11px] text-slate-500 truncate block max-w-xs">{h.case_title}</span>
                        </td>
                        <td className="px-6 py-3.5 capitalize">{h.purpose.replace(/_/g, ' ')}</td>
                        <td className="px-6 py-3.5 max-w-xs text-slate-700">{h.outcome_summary || 'Adjourned'}</td>
                        <td className="px-6 py-3.5">
                          <Badge variant={h.status} size="xs">{h.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Hearing Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule Judicial Hearing">
        <form onSubmit={handleCreateHearing} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Case *</label>
            <select
              required
              value={hearingForm.case_id}
              onChange={(e) => setHearingForm({ ...hearingForm, case_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              {cases.map(c => (
                <option key={c.id} value={c.id}>[{c.case_number}] {c.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Date *</label>
              <input
                type="date"
                required
                value={hearingForm.hearing_date}
                onChange={(e) => setHearingForm({ ...hearingForm, hearing_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Time</label>
              <input
                type="time"
                value={hearingForm.hearing_time}
                onChange={(e) => setHearingForm({ ...hearingForm, hearing_time: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Court Room</label>
              <input
                type="text"
                value={hearingForm.court_room}
                onChange={(e) => setHearingForm({ ...hearingForm, court_room: e.target.value })}
                placeholder="e.g. Courtroom 24"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Purpose</label>
              <select
                value={hearingForm.purpose}
                onChange={(e) => setHearingForm({ ...hearingForm, purpose: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs capitalize"
              >
                {['preliminary', 'admission', 'framing_of_issues', 'evidence', 'final_argument', 'judgment', 'status_conference', 'bail_hearing'].map(pur => (
                  <option key={pur} value={pur}>{pur.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Presiding Judge</label>
            <input
              type="text"
              value={hearingForm.presiding_judge}
              onChange={(e) => setHearingForm({ ...hearingForm, presiding_judge: e.target.value })}
              placeholder="Hon'ble Justice ..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">Save Hearing</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
