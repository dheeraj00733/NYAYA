import React, { useState } from 'react';
import { Database, Layers, ShieldCheck, CheckCircle2, ArrowRight, GitFork } from 'lucide-react';

export default function SystemDesign() {
  const [activeTab, setActiveTab] = useState('erd'); // 'erd' | 'normalization' | 'architecture'

  const tables = [
    { name: 'users', pk: 'id (UUID)', fks: 'None', desc: 'System credentials, role-based access control (Lawyer, Client, Admin), Bar Council ID.' },
    { name: 'cases', pk: 'id (UUID)', fks: 'created_by -> users.id', desc: 'Core legal matter container, case number, status, court, filing date, priority.' },
    { name: 'case_members', pk: 'id (UUID)', fks: 'case_id -> cases.id, user_id -> users.id', desc: 'M:N access control junction table with granular permissions (can_edit, can_upload, can_chat).' },
    { name: 'parties', pk: 'id (UUID)', fks: 'None', desc: 'Normalized registry of legal entities (individuals, corporations, government bodies, trusts).' },
    { name: 'case_parties', pk: 'id (UUID)', fks: 'case_id -> cases.id, party_id -> parties.id', desc: 'M:N junction specifying party role (Petitioner, Respondent) and retained external counsel.' },
    { name: 'legal_documents', pk: 'id (UUID)', fks: 'case_id -> cases.id, uploaded_by -> users.id', desc: 'PDF file metadata, SHA-256 hash, category, page count, and AI processing status.' },
    { name: 'document_chunks', pk: 'id (UUID)', fks: 'document_id -> legal_documents.id', desc: 'RAG text chunks with page tracking and 384-dimensional vector embeddings.' },
    { name: 'extracted_facts', pk: 'id (UUID)', fks: 'document_id -> legal_documents.id, case_id -> cases.id', desc: 'Structured entities, statutes, and outcomes with page citations and lawyer verification.' },
    { name: 'chats', pk: 'id (UUID)', fks: 'case_id -> cases.id, user_id -> users.id', desc: 'Persistent conversation threads scoped to cases or individual documents.' },
    { name: 'messages', pk: 'id (UUID)', fks: 'chat_id -> chats.id', desc: 'User & assistant dialogue turns with verifiable citation JSONB payloads.' },
    { name: 'hearings', pk: 'id (UUID)', fks: 'case_id -> cases.id', desc: 'Judicial calendar events, courtrooms, presiding judges, purpose, and outcomes.' },
    { name: 'activity_logs', pk: 'id (UUID)', fks: 'case_id -> cases.id, user_id -> users.id', desc: 'Append-only immutable audit trail for legal compliance and dashboard activity feeds.' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Architecture & Database Normalization Specification
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Comprehensive relational modeling, 1NF to 5NF proofs, and decoupled AI microservice architecture
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold">
        {[
          { key: 'erd', label: '12-Table Schema & ERD', icon: Database },
          { key: 'normalization', label: '1NF to 5NF Proofs & Anomalies', icon: Layers }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: ERD & Tables */}
      {activeTab === 'erd' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((tbl, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {tbl.name}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">Table #{i + 1}</span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <p><span className="font-bold text-slate-800">PK:</span> <code className="font-mono">{tbl.pk}</code></p>
                  <p><span className="font-bold text-slate-800">FKs:</span> <code className="font-mono">{tbl.fks}</code></p>
                  <p className="text-slate-500 pt-1 leading-normal">{tbl.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Normalization */}
      {activeTab === 'normalization' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Mathematical Normalization Analysis</h3>
            
            <div className="grid md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-blue-700 uppercase tracking-wider block">First Normal Form (1NF)</span>
                <p className="text-slate-600">
                  All column domains are atomic. Repeating groups of parties or advocates are completely eliminated and decomposed into normalized independent entities (<code className="font-mono bg-white px-1">parties</code>, <code className="font-mono bg-white px-1">case_parties</code>).
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-blue-700 uppercase tracking-wider block">Second Normal Form (2NF)</span>
                <p className="text-slate-600">
                  Every non-prime attribute is fully functionally dependent on the entire primary key. In junction relations (<code className="font-mono bg-white px-1">case_members</code>, <code className="font-mono bg-white px-1">case_parties</code>), permissions and advocate roles depend strictly on the composite key.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-blue-700 uppercase tracking-wider block">Third Normal Form (3NF)</span>
                <p className="text-slate-600">
                  Transitive dependencies are eliminated. Party contact addresses and corporate tax IDs are held strictly in <code className="font-mono bg-white px-1">parties</code>, avoiding transitive duplication through cases.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-blue-700 uppercase tracking-wider block">Boyce-Codd Normal Form (BCNF)</span>
                <p className="text-slate-600">
                  Every determinant in all non-trivial functional dependencies is a superkey (surrogate UUID primary keys or natural candidate keys like <code className="font-mono bg-white px-1">case_number</code>).
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-blue-700 uppercase tracking-wider block">Fourth Normal Form (4NF)</span>
                <p className="text-slate-600">
                  Independent multivalued dependencies (cases having multiple lawyers AND multiple opposing parties AND multiple hearing dates) are isolated into independent binary relations, preventing Cartesian explosion anomalies.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-blue-700 uppercase tracking-wider block">Fifth Normal Form (5NF)</span>
                <p className="text-slate-600">
                  Evaluates join dependencies. Ternary relationships (Case-Party-Advocate representation) represent irreducible semantic units and are preserved without artificial or lossy over-decomposition.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
