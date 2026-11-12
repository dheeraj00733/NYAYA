import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Briefcase, 
  Scale, 
  Calendar, 
  FileText, 
  Users, 
  MessageSquare, 
  Plus, 
  CheckCircle, 
  Clock, 
  ChevronLeft,
  Download,
  Trash2,
  Sparkles,
  UserPlus,
  Shield,
  FileCheck
} from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function CaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);

  // Form states
  const [partyForm, setPartyForm] = useState({ name: '', party_type: 'individual', party_role: 'respondent', advocate_name: '' });
  const [memberForm, setMemberForm] = useState({ user_id: '', role_in_case: 'co_counsel', can_edit: true, can_upload: true, can_chat: true });
  const [hearingForm, setHearingForm] = useState({ hearing_date: '', hearing_time: '10:30', court_room: '', purpose: 'evidence', status: 'scheduled' });
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    fetchCaseDetails();
    fetchUsersForAssignment();
  }, [id]);

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCaseById(id);
      if (res.success) {
        setCaseData(res.case);
      }
    } catch (err) {
      setError(err.message || 'Failed to load case details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersForAssignment = async () => {
    try {
      const res = await api.getUsers({});
      if (res.success) {
        setAllUsers(res.users);
      }
    } catch (e) {
      console.warn('Could not fetch user list', e);
    }
  };

  const handleAddParty = async (e) => {
    e.preventDefault();
    try {
      const res = await api.addCaseParty(id, partyForm);
      if (res.success) {
        showSuccess('Party linked to case successfully.');
        setIsPartyModalOpen(false);
        setPartyForm({ name: '', party_type: 'individual', party_role: 'respondent', advocate_name: '' });
        fetchCaseDetails();
      }
    } catch (err) {
      showError(err.message || 'Failed to add party.');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      const res = await api.addCaseMember(id, memberForm);
      if (res.success) {
        showSuccess('Team member assigned to case.');
        setIsMemberModalOpen(false);
        fetchCaseDetails();
      }
    } catch (err) {
      showError(err.message || 'Failed to assign member.');
    }
  };

  const handleAddHearing = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createHearing({ ...hearingForm, case_id: id });
      if (res.success) {
        showSuccess('Hearing scheduled on judicial calendar.');
        setIsHearingModalOpen(false);
        setHearingForm({ hearing_date: '', hearing_time: '10:30', court_room: '', purpose: 'evidence', status: 'scheduled' });
        fetchCaseDetails();
      }
    } catch (err) {
      showError(err.message || 'Failed to schedule hearing.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-xs text-slate-500">Loading case details...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center max-w-lg mx-auto mt-12">
        <h3 className="text-base font-bold text-slate-900">Case Record Unavailable</h3>
        <p className="text-xs text-slate-600 mt-2 mb-4">{error || 'Case not found or permission denied.'}</p>
        <button
          onClick={() => navigate('/cases')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
        >
          Return to Cases
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-slate-500">
        <button
          onClick={() => navigate('/cases')}
          className="flex items-center space-x-1 text-slate-600 hover:text-slate-900 font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Cases</span>
        </button>
        <span>/</span>
        <span className="font-mono font-bold text-blue-700">{caseData.case_number}</span>
      </div>

      {/* Case Header Hero */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
              {caseData.case_number}
            </span>
            <Badge variant={caseData.category}>{caseData.category}</Badge>
            <Badge variant={caseData.priority}>{caseData.priority}</Badge>
            <Badge variant={caseData.status}>{caseData.status}</Badge>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight leading-snug">
            {caseData.title}
          </h2>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center space-x-1">
              <Scale className="w-4 h-4 text-slate-400" />
              <span>{caseData.court_name}</span>
            </span>
            {caseData.judge_name && (
              <span>• Bench: {caseData.judge_name}</span>
            )}
            {caseData.filing_date && (
              <span>• Filed: {new Date(caseData.filing_date).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => navigate(`/chat?caseId=${caseData.id}`)}
            className="flex items-center space-x-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Co-Counsel Chat</span>
          </button>
          <button
            onClick={() => navigate(`/documents?case_id=${caseData.id}`)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            <span>Documents ({caseData.documents?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-semibold">
        {[
          { key: 'overview', label: 'Matter Overview', icon: Briefcase },
          { key: 'parties', label: `Parties (${caseData.parties?.length || 0})`, icon: Scale },
          { key: 'hearings', label: `Hearings (${caseData.hearings?.length || 0})`, icon: Calendar },
          { key: 'documents', label: `Documents (${caseData.documents?.length || 0})`, icon: FileText },
          { key: 'members', label: `Team & Members (${caseData.members?.length || 0})`, icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-3">Case Context & Description</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {caseData.description || 'No detailed background description provided for this legal matter.'}
              </p>
            </div>

            {/* Next Scheduled Hearing Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200/60 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Next Hearing Notice</span>
                <p className="text-lg font-extrabold text-slate-900 mt-1">
                  {caseData.next_hearing_date ? new Date(caseData.next_hearing_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'No upcoming hearing date scheduled'}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">{caseData.court_name}</p>
              </div>
              <button
                onClick={() => setIsHearingModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                Schedule Hearing
              </button>
            </div>
          </div>

          {/* Right Summary Column */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Matter Summary</h3>
              <div className="text-xs space-y-3">
                <div>
                  <span className="text-slate-400 block font-medium">Judicial Forum</span>
                  <span className="font-semibold text-slate-800">{caseData.court_name} ({caseData.court_type})</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Filing Date</span>
                  <span className="font-semibold text-slate-800">
                    {caseData.filing_date ? new Date(caseData.filing_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Matter Initiator</span>
                  <span className="font-semibold text-slate-800">{caseData.creator_name || 'System Counsel'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Case UUID (Primary Key)</span>
                  <span className="font-mono text-[11px] text-slate-500 break-all">{caseData.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Parties Involved */}
      {activeTab === 'parties' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900">Litigation Parties & Retained Counsel</h3>
            <button
              onClick={() => setIsPartyModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Party</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {caseData.parties?.map(p => (
              <div key={p.case_party_id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{p.name}</span>
                  <Badge variant={p.party_role} size="xs">{p.party_role}</Badge>
                </div>
                <p className="text-xs text-slate-500 capitalize">{p.party_type}</p>
                {p.advocate_name && (
                  <p className="text-xs text-slate-700 pt-2 border-t border-slate-100">
                    <span className="font-medium text-slate-500">Appearing Counsel:</span> {p.advocate_name}
                  </p>
                )}
                {p.address && (
                  <p className="text-[11px] text-slate-400">{p.address}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Hearings */}
      {activeTab === 'hearings' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900">Judicial Calendar & Order History</h3>
            <button
              onClick={() => setIsHearingModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Hearing</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Hearing Date & Time</th>
                  <th className="px-6 py-3">Purpose</th>
                  <th className="px-6 py-3">Courtroom & Judge</th>
                  <th className="px-6 py-3">Outcome / Directives</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {caseData.hearings?.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {new Date(h.hearing_date).toLocaleDateString()}
                      {h.hearing_time && <span className="block text-[11px] text-slate-400 font-normal">{h.hearing_time.slice(0, 5)}</span>}
                    </td>
                    <td className="px-6 py-4 capitalize">{h.purpose.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {h.court_room || 'Main Court'}
                      {h.presiding_judge && <span className="block text-[11px] text-slate-400">{h.presiding_judge}</span>}
                    </td>
                    <td className="px-6 py-4 max-w-xs text-slate-600">
                      {h.outcome_summary || 'Order awaited'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={h.status} size="xs">{h.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900">Case Documents Repository</h3>
            <button
              onClick={() => navigate(`/documents?case_id=${caseData.id}`)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload PDF</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {caseData.documents?.map(doc => (
              <div 
                key={doc.id}
                onClick={() => navigate(`/documents/${doc.id}`)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1">{doc.title}</span>
                    <Badge variant={doc.processing_status} size="xs">{doc.processing_status}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">{doc.file_name} • {doc.total_pages || 1} pages</p>
                  {doc.summary_text && (
                    <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      "{doc.summary_text.replace(/###/g, '').slice(0, 150)}..."
                    </p>
                  )}
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold mt-3">
                  <span>Open Split Reader</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Team Members */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900">Assigned Team Members & Authorization</h3>
            <button
              onClick={() => setIsMemberModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Assign Member</span>
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {caseData.members?.map(m => (
              <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                    {m.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{m.full_name}</h4>
                    <p className="text-[11px] text-slate-500 capitalize">{m.role_in_case.replace(/_/g, ' ')}</p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                  <p className="flex items-center space-x-2">
                    <CheckCircle className={`w-3.5 h-3.5 ${m.can_edit ? 'text-emerald-500' : 'text-slate-300'}`} />
                    <span>Can Edit Case: {m.can_edit ? 'Yes' : 'No'}</span>
                  </p>
                  <p className="flex items-center space-x-2">
                    <CheckCircle className={`w-3.5 h-3.5 ${m.can_upload ? 'text-emerald-500' : 'text-slate-300'}`} />
                    <span>Can Upload Docs: {m.can_upload ? 'Yes' : 'No'}</span>
                  </p>
                  <p className="flex items-center space-x-2">
                    <CheckCircle className={`w-3.5 h-3.5 ${m.can_chat ? 'text-emerald-500' : 'text-slate-300'}`} />
                    <span>Can Use AI Chat: {m.can_chat ? 'Yes' : 'No'}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Party Modal */}
      <Modal isOpen={isPartyModalOpen} onClose={() => setIsPartyModalOpen(false)} title="Link Party to Legal Matter">
        <form onSubmit={handleAddParty} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Party Name *</label>
            <input
              type="text"
              required
              value={partyForm.name}
              onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })}
              placeholder="e.g. Apex Infrastructure Ltd."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Party Role *</label>
              <select
                value={partyForm.party_role}
                onChange={(e) => setPartyForm({ ...partyForm, party_role: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs capitalize"
              >
                {['petitioner', 'respondent', 'appellant', 'appellee', 'plaintiff', 'defendant', 'intervenor'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Entity Type</label>
              <select
                value={partyForm.party_type}
                onChange={(e) => setPartyForm({ ...partyForm, party_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs capitalize"
              >
                {['individual', 'corporation', 'government_body', 'ngo', 'trust'].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Advocate Name (Optional)</label>
            <input
              type="text"
              value={partyForm.advocate_name}
              onChange={(e) => setPartyForm({ ...partyForm, advocate_name: e.target.value })}
              placeholder="e.g. Adv. Priya Menon"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-3">
            <button type="button" onClick={() => setIsPartyModalOpen(false)} className="px-4 py-2 border rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">Save Party</button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} title="Assign Team Member to Case">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select User *</label>
            <select
              required
              value={memberForm.user_id}
              onChange={(e) => setMemberForm({ ...memberForm, user_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="">-- Choose User --</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.email}) - {u.role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Role in Case</label>
            <select
              value={memberForm.role_in_case}
              onChange={(e) => setMemberForm({ ...memberForm, role_in_case: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="lead_counsel">Lead Counsel</option>
              <option value="co_counsel">Co-Counsel</option>
              <option value="legal_assistant">Legal Assistant</option>
              <option value="client_observer">Client Observer</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-3">
            <button type="button" onClick={() => setIsMemberModalOpen(false)} className="px-4 py-2 border rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">Assign</button>
          </div>
        </form>
      </Modal>

      {/* Schedule Hearing Modal */}
      <Modal isOpen={isHearingModalOpen} onClose={() => setIsHearingModalOpen(false)} title="Schedule Court Hearing">
        <form onSubmit={handleAddHearing} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Hearing Date *</label>
              <input
                type="date"
                required
                value={hearingForm.hearing_date}
                onChange={(e) => setHearingForm({ ...hearingForm, hearing_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Hearing Time</label>
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
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Purpose *</label>
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
          <div className="flex justify-end space-x-3 pt-3">
            <button type="button" onClick={() => setIsHearingModalOpen(false)} className="px-4 py-2 border rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">Save Hearing</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
