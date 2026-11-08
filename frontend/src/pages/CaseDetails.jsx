import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Briefcase, Scale, Calendar, ChevronLeft, Sparkles, FileText } from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';

export default function CaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCaseDetails();
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
          <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight leading-snug">{caseData.title}</h2>
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center space-x-1">
              <Scale className="w-4 h-4 text-slate-400" />
              <span>{caseData.court_name}</span>
            </span>
            {caseData.judge_name && <span>• Bench: {caseData.judge_name}</span>}
            {caseData.filing_date && <span>• Filed: {new Date(caseData.filing_date).toLocaleDateString()}</span>}
          </div>
        </div>
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

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-3">Case Context & Description</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {caseData.description || 'No detailed background description provided for this legal matter.'}
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200/60 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Next Hearing Notice</span>
              <p className="text-lg font-extrabold text-slate-900 mt-1">
                {caseData.next_hearing_date ? new Date(caseData.next_hearing_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'No upcoming hearing date scheduled'}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">{caseData.court_name}</p>
            </div>
            <span className="flex items-center space-x-1 text-blue-700 text-xs font-semibold">
              <Calendar className="w-4 h-4" />
              <span>Hearing</span>
            </span>
          </div>
        </div>

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
    </div>
  );
}
