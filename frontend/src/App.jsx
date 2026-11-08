import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Implemented Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CasesList from './pages/CasesList';

function ModulePlaceholder({ title }) {
  return (
    <div className="p-8 max-w-2xl mx-auto mt-10 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
      <h2 className="text-xl font-semibold text-slate-800 mb-2">{title}</h2>
      <p className="text-sm text-slate-500">
        This module is scheduled for the next development milestone.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Authenticated Workspace Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cases" element={<CasesList />} />
              <Route path="/cases/:id" element={<ModulePlaceholder title="Case Details" />} />
              <Route path="/documents" element={<ModulePlaceholder title="Document Management" />} />
              <Route path="/documents/:id" element={<ModulePlaceholder title="Document Viewer" />} />
              <Route path="/chat" element={<ModulePlaceholder title="AI Legal Co-Counsel (RAG)" />} />
              <Route path="/facts" element={<ModulePlaceholder title="Extracted Facts" />} />
              <Route path="/hearings" element={<ModulePlaceholder title="Hearings Timeline" />} />
              <Route path="/settings" element={<ModulePlaceholder title="Settings & Profile" />} />
              <Route path="/system-design" element={<ModulePlaceholder title="Architecture & Schema" />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
