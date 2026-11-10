import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  FileText, 
  Calendar, 
  MessageSquare, 
  Scale, 
  Clock, 
  ArrowUpRight, 
  Sparkles, 
  Plus, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { api } from '../api/client';
import Badge from '../components/Badge';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardAnalytics();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      setError(err.message || 'Failed to load intelligence metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-slate-500">Querying legal database metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-rose-200 shadow-sm max-w-xl mx-auto my-12 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Database Connection Required</h3>
        <p className="text-sm text-slate-600 mt-1 mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { counts, status_distribution, category_distribution, recent_documents, upcoming_hearings, recent_chats, recent_activities } = data || {};

  const STATUS_COLORS = {
    filed: '#3B82F6',
    pending: '#F59E0B',
    hearing: '#8B5CF6',
    decided: '#10B981',
    closed: '#64748B',
    archived: '#94A3B8'
  };

  const chartData = (status_distribution || []).map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    color: STATUS_COLORS[item.status] || '#2563EB'
  }));

  const categoryChartData = (category_distribution || []).map(item => ({
    name: item.category.toUpperCase(),
    cases: item.count
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Legal Intelligence Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time analytics aggregated across your relational cases and vector indices
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/cases')}
            className="flex items-center space-x-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Briefcase className="w-4 h-4 text-slate-500" />
            <span>View All Cases</span>
          </button>
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center space-x-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Legal Co-Counsel</span>
          </button>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Cases</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{counts?.total_cases || 0}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">Relational Matters</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Litigation</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600">{counts?.active_cases || 0}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">Filed, Pending & Hearing</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Decided / Closed</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">{counts?.closed_cases || 0}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">Resolved Matters</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Documents Ingested</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-indigo-600">{counts?.total_documents || 0}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">Indexed with pgvector</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Upcoming Hearings</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-purple-600">{counts?.upcoming_hearings || 0}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">Scheduled Court Dates</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status Distribution Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Case Status Breakdown</h3>
              <p className="text-xs text-slate-500">Distribution across active and resolved litigation stages</p>
            </div>
            <span className="text-xs font-medium text-slate-400">PostgreSQL COUNT()</span>
          </div>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle" 
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No cases recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Category Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Cases by Legal Domain</h3>
              <p className="text-xs text-slate-500">Distribution across Criminal, Corporate, Civil, IPR & Tax</p>
            </div>
            <span className="text-xs font-medium text-slate-400">Grouped by Category</span>
          </div>
          <div className="h-64 w-full">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} 
                  />
                  <Bar dataKey="cases" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No categorized cases found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Row: Upcoming Hearings & Recent Documents */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Hearings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Upcoming Court Proceedings</span>
            </h3>
            <Link to="/hearings" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1">
              <span>Calendar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {upcoming_hearings && upcoming_hearings.length > 0 ? (
              upcoming_hearings.map(h => (
                <div key={h.id} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 transition-colors flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">{h.case_number}</span>
                      <Badge variant={h.purpose} size="xs">{h.purpose}</Badge>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1">{h.case_title}</p>
                    <p className="text-[11px] text-slate-500">
                      {h.court_name} {h.court_room ? `• ${h.court_room}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-bold text-blue-600">
                      {new Date(h.hearing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {h.hearing_time && (
                      <div className="text-[11px] text-slate-400">{h.hearing_time.slice(0, 5)}</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No hearings scheduled for the coming weeks.
              </div>
            )}
          </div>
        </div>

        {/* Recently Uploaded Documents */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Recently Uploaded Documents</span>
            </h3>
            <Link to="/documents" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1">
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recent_documents && recent_documents.length > 0 ? (
              recent_documents.map(doc => (
                <div 
                  key={doc.id} 
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="p-2 rounded-lg bg-red-50 text-red-600 flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">{doc.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">{doc.case_number} • {doc.total_pages || 1} pages</p>
                    </div>
                  </div>
                  <Badge variant={doc.processing_status} size="xs">
                    {doc.processing_status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No documents uploaded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent AI Chats & Audit Activity Feed */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent AI Chats */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Recent AI Query Sessions</span>
            </h3>
            <Link to="/chat" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1">
              <span>Start New</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recent_chats && recent_chats.length > 0 ? (
              recent_chats.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => navigate(`/chat?chatId=${chat.id}`)}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">{chat.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{chat.case_number} • {chat.message_count} messages</p>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 flex-shrink-0">
                    {new Date(chat.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No previous AI chat sessions found.
              </div>
            )}
          </div>
        </div>

        {/* Audit Activity Log */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <Scale className="w-4 h-4 text-slate-700" />
              <span>Audit Activity Stream</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Immutable Audit Trail</span>
          </div>

          <div className="space-y-3">
            {recent_activities && recent_activities.length > 0 ? (
              recent_activities.map(act => (
                <div key={act.id} className="text-xs flex items-start space-x-3 py-1.5 border-b border-slate-50 last:border-none">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-medium truncate">
                      <span className="font-semibold text-slate-900">{act.user_name || 'System User'}</span>
                      {' '}<span className="text-slate-500">{act.action_type}d</span>{' '}
                      <span className="font-semibold">{act.entity_type}</span>
                      {act.case_number && ` in [${act.case_number}]`}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(act.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No activity logs recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
