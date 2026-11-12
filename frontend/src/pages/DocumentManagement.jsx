import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  UploadCloud, 
  Search, 
  Sparkles, 
  Scale, 
  Trash2, 
  Download, 
  ExternalLink,
  Eye,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function DocumentManagement() {
  const [searchParams] = useSearchParams();
  const caseIdFilter = searchParams.get('case_id') || '';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useNotification();

  const [documents, setDocuments] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(caseIdFilter);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCaseId, setUploadCaseId] = useState(caseIdFilter);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('petition');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [selectedCase, categoryFilter, search]);

  const fetchCases = async () => {
    try {
      const res = await api.getCases({ limit: 100 });
      if (res.success) {
        setCases(res.cases);
        if (!uploadCaseId && res.cases.length > 0) {
          setUploadCaseId(res.cases[0].id);
        }
      }
    } catch (e) {
      console.warn('Could not load cases list', e);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.getDocuments({
        case_id: selectedCase || undefined,
        category: categoryFilter || undefined,
        search: search || undefined
      });
      if (res.success) {
        setDocuments(res.documents);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showError('Please select a PDF document to upload.');
      return;
    }
    if (!uploadCaseId) {
      showError('Please associate the document with a legal case.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('case_id', uploadCaseId);
      formData.append('title', uploadTitle || uploadFile.name.replace(/\.[^/.]+$/, ''));
      formData.append('document_category', uploadCategory);

      const res = await api.uploadDocument(formData);
      if (res.success) {
        showSuccess('Document uploaded! AI text parsing and embedding generation initiated in background.');
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setUploadTitle('');
        fetchDocuments();
      }
    } catch (err) {
      showError(err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? Its vector embeddings and extracted facts will be removed.`)) {
      return;
    }
    try {
      const res = await api.deleteDocument(docId);
      if (res.success) {
        showSuccess('Document and vector embeddings deleted.');
        fetchDocuments();
      }
    } catch (err) {
      showError(err.message || 'Failed to delete document.');
    }
  };

  const handleTriggerSummary = async (docId) => {
    try {
      showInfo('Triggering AI legal summarization...');
      const res = await api.summarizeDocument(docId);
      if (res.success) {
        showSuccess('AI Summary updated successfully.');
        fetchDocuments();
      }
    } catch (err) {
      showError(err.message || 'Summarization failed.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Document Intelligence Repository
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            PDF text extraction, Tesseract OCR fallback, 384-dim semantic chunking, and pgvector storage
          </p>
        </div>

        {user?.role !== 'client' && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all self-start sm:self-auto"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Legal PDF</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search document title or file name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Case Filter */}
          <select
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 max-w-[200px] truncate"
          >
            <option value="">All Cases</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.case_number} - {c.title}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 capitalize"
          >
            <option value="">All Categories</option>
            {['petition', 'judgment', 'order', 'evidence', 'affidavit', 'contract', 'notice', 'pleading', 'other'].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs text-slate-500">Retrieving documents from repository...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center max-w-md mx-auto">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Documents Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Upload petitions, court orders, or contract PDFs to enable AI intelligence and RAG.
          </p>
          {user?.role !== 'client' && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
            >
              Upload First Document
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={doc.document_category} size="xs">{doc.document_category}</Badge>
                  <Badge variant={doc.processing_status} size="xs">{doc.processing_status}</Badge>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-1.5" title={doc.title}>
                  {doc.title}
                </h3>

                <p className="text-[11px] text-slate-500 mb-2 truncate">
                  <span className="font-semibold text-blue-700">{doc.case_number}</span> • {doc.case_title}
                </p>

                {/* Summary snippet */}
                {doc.summary_text ? (
                  <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic mb-3">
                    "{doc.summary_text.replace(/###/g, '').slice(0, 140)}..."
                  </p>
                ) : (
                  <div className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    <span>Summary pending generation</span>
                  </div>
                )}

                {/* Meta details */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-3">
                  <span>{doc.total_pages || 1} Pages • {(doc.file_size_bytes / 1024).toFixed(0)} KB</span>
                  <span>{doc.chunks_count || 0} Chunks • {doc.facts_count || 0} Facts</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Split Viewer</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleTriggerSummary(doc.id)}
                    title="Generate/Refresh AI Summary"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  <a
                    href={api.getDocumentDownloadUrl(doc.id)}
                    target="_blank"
                    rel="noreferrer"
                    title="Download PDF"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  {user?.role !== 'client' && (
                    <button
                      onClick={() => handleDelete(doc.id, doc.title)}
                      title="Delete Document"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Document Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Legal Document (PDF)"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Select Legal Matter / Case *
            </label>
            <select
              required
              value={uploadCaseId}
              onChange={(e) => setUploadCaseId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
            >
              <option value="">-- Select Case --</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>[{c.case_number}] {c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="e.g. Writ Petition for Quashing FIR 402/2023"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Document Category
            </label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs capitalize"
            >
              {['petition', 'judgment', 'order', 'evidence', 'affidavit', 'contract', 'notice', 'pleading', 'other'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* File input area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              PDF Document File *
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50 hover:bg-blue-50/20 transition-all cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                    if (!uploadTitle) {
                      setUploadTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                    }
                  }
                }}
                className="hidden"
                id="pdf-upload-input"
              />
              <label htmlFor="pdf-upload-input" className="cursor-pointer">
                <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                {uploadFile ? (
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block truncate">{uploadFile.name}</span>
                    <span className="text-slate-500">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-blue-600">Click to choose PDF</span> or drag and drop
                    <p className="text-[11px] text-slate-400 mt-1">Maximum file size: 50MB</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !uploadFile}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Processing Document...' : 'Upload & Start AI Pipeline'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
