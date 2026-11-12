import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CasesList from './pages/CasesList';
import CaseDetails from './pages/CaseDetails';
import DocumentManagement from './pages/DocumentManagement';
import DocumentViewer from './pages/DocumentViewer';
import AIChatbot from './pages/AIChatbot';
import ExtractedFacts from './pages/ExtractedFacts';
import HearingTimeline from './pages/HearingTimeline';
import SettingsProfile from './pages/SettingsProfile';
import SystemDesign from './pages/SystemDesign';

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
              <Route path="/cases/:id" element={<CaseDetails />} />
              <Route path="/documents" element={<DocumentManagement />} />
              <Route path="/documents/:id" element={<DocumentViewer />} />
              <Route path="/chat" element={<AIChatbot />} />
              <Route path="/facts" element={<ExtractedFacts />} />
              <Route path="/hearings" element={<HearingTimeline />} />
              <Route path="/settings" element={<SettingsProfile />} />
              <Route path="/system-design" element={<SystemDesign />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
