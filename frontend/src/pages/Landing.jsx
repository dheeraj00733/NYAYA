import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Scale, 
  Sparkles, 
  ShieldCheck, 
  FileSearch, 
  Layers, 
  Cpu, 
  Database, 
  ArrowRight, 
  CheckCircle, 
  ChevronRight,
  BookOpen
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Navigation */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Nyaya<span className="text-blue-600">Flow</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm transition-all shadow-blue-500/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Legal Intelligence & Case Management</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.15]">
            Smarter Case Management.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Verifiable AI Legal Intelligence.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            NyayaFlow combines a deeply normalized PostgreSQL relational schema with private, local Retrieval-Augmented Generation (RAG). Extract key legal facts, synthesize complex petitions, and query case documents with citation-backed precision.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition-all text-base"
            >
              <span>Explore Demo Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold transition-all text-base shadow-sm"
            >
              Create Account
            </Link>
          </div>

          {/* Highlights Grid */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <Database className="w-5 h-5 text-blue-600 mb-2" />
              <div className="font-bold text-slate-900 text-sm">PostgreSQL + pgvector</div>
              <div className="text-xs text-slate-500 mt-1">1NF to 5NF normalized relational schema</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <FileSearch className="w-5 h-5 text-indigo-600 mb-2" />
              <div className="font-bold text-slate-900 text-sm">PyMuPDF + OCR</div>
              <div className="text-xs text-slate-500 mt-1">Scanned order & petition ingestion</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <Cpu className="w-5 h-5 text-blue-600 mb-2" />
              <div className="font-bold text-slate-900 text-sm">Local MiniLM & Ollama</div>
              <div className="text-xs text-slate-500 mt-1">Zero paid APIs or cloud token costs</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mb-2" />
              <div className="font-bold text-slate-900 text-sm">Verifiable Citations</div>
              <div className="text-xs text-slate-500 mt-1">Grounded answers with page references</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Engineered for Modern Legal Practices
            </h2>
            <p className="mt-4 text-slate-600">
              From filing to final judgment, NyayaFlow maintains an audit-proof, relational record of every case, document, and judicial directive.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                  <FileSearch className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Automated Legal Fact Extraction
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Extracts petitioners, respondents, appearing advocates, judicial forums, statutory sections (IPC, CrPC, IT Act), and hearing dates with exact page references.
                </p>
              </div>
              <ul className="mt-6 space-y-2 text-xs text-slate-500 font-medium">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Lawyer review & verification workflow</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Multi-tenant case authorization boundary</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Grounded AI Legal Co-Counsel
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Ask deep questions across entire case dockets. Every synthesized answer cites the specific document title, page number, and supporting excerpt.
                </p>
              </div>
              <ul className="mt-6 space-y-2 text-xs text-slate-500 font-medium">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Strict anti-hallucination prompts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Sub-second pgvector cosine retrieval</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-6">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Rigorous Database Architecture
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Normalized across 12 relational tables to eliminate insertion, update, and deletion anomalies. Demonstrates true 1NF to 5NF compliance.
                </p>
              </div>
              <ul className="mt-6 space-y-2 text-xs text-slate-500 font-medium">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>ACID transaction safety & cascade rules</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Immutable activity audit logging</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2 mb-4 sm:mb-0">
            <Scale className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">NyayaFlow Legal Intelligence</span>
            <span>— Open-Source Legal Tech</span>
          </div>
          <div className="flex space-x-6">
            <Link to="/login" className="hover:text-slate-900">Sign In</Link>
            <Link to="/register" className="hover:text-slate-900">Register</Link>
            <Link to="/system-design" className="hover:text-slate-900">Database & System Design</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
