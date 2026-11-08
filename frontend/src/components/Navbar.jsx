import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Compute page title based on path
  const getPageTitle = (pathname) => {
    if (pathname === '/dashboard') return 'Intelligence Overview';
    if (pathname.startsWith('/cases')) return 'Legal Matters & Cases';
    if (pathname.startsWith('/documents')) return 'Document Repository';
    if (pathname.startsWith('/chat')) return 'AI Legal Co-Counsel (RAG)';
    if (pathname.startsWith('/facts')) return 'Verified Legal Entities & Facts';
    if (pathname.startsWith('/hearings')) return 'Court Hearing Calendar';
    if (pathname.startsWith('/system-design')) return 'Architecture & Schema Normalization';
    if (pathname.startsWith('/settings')) return 'Settings & Model Configuration';
    return 'NyayaFlow';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Path */}
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
          {getPageTitle(location.pathname)}
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Relational Database Intelligence & Local RAG
        </p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Quick Launch Chat */}
        <button
          onClick={() => navigate('/chat')}
          className="hidden sm:flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Ask Legal AI</span>
        </button>

        {/* User Role Pill */}
        <div className="flex items-center space-x-2 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <span className="capitalize">{user?.role || 'Guest'}</span>
          {user?.organization && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 truncate max-w-[120px]">{user.organization}</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
