import React, { useState } from 'react';
import { User, Cpu, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export default function SettingsProfile() {
  const { user, updateUserProfile } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    organization: user?.organization || '',
    bar_council_id: user?.bar_council_id || ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('qwen2.5:latest');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      await updateUserProfile(profileData);
      showSuccess('Profile updated successfully.');
    } catch (err) {
      showError(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings & System Diagnostics
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your advocate profile, AI model parameters, and vector database status
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>User Profile & Legal Credentials</span>
            </h3>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Account Role
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.role?.toUpperCase() || ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-semibold cursor-not-allowed capitalize"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Law Firm / Organization / Chamber
                </label>
                <input
                  type="text"
                  value={profileData.organization}
                  onChange={(e) => setProfileData({ ...profileData, organization: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {user?.role === 'lawyer' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Bar Council Enrolment ID
                  </label>
                  <input
                    type="text"
                    value={profileData.bar_council_id}
                    onChange={(e) => setProfileData({ ...profileData, bar_council_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{profileSaving ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              <span>Local AI Engine & Model Parameters</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Ollama Local LLM Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium"
                >
                  {availableModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  {availableModels.length === 0 && (
                    <option value="qwen2.5:latest">qwen2.5:latest (Default)</option>
                  )}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Configurable local model. Lightweight alternative: <code className="bg-slate-100 px-1 py-0.5 rounded">llama3.2:1b</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Ollama Host URL
                </label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Runs natively on macOS at <code className="bg-slate-100 px-1 py-0.5 rounded">http://localhost:11434</code> or in Docker via <code className="bg-slate-100 px-1 py-0.5 rounded">http://host.docker.internal:11434</code>
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Vector Embedding Specifications</span>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Dense Model:</span>
                    <span className="font-mono text-blue-700 font-semibold">all-MiniLM-L6-v2</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Vector Dimension:</span>
                    <span className="font-mono font-semibold">384 Dimensions</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Chunk Size:</span>
                    <span className="font-medium">400 tokens (~300 words)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sliding Overlap:</span>
                    <span className="font-medium">50 tokens</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
