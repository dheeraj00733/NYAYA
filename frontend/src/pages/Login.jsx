import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Scale, Lock, Mail, ArrowRight, AlertCircle, Shield, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { showSuccess } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await login(email, password);
      showSuccess(`Welcome back, ${res.user.full_name}`);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            Nyaya<span className="text-blue-600">Flow</span>
          </span>
        </Link>
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign in to your account
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          AI-Powered Legal Intelligence & Case Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm rounded-2xl border border-slate-200">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="advocate@nyayaflow.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50 text-sm"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
              Fast Demo Accounts (Click to fill)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('advocate.sharma@nyayaflow.com')}
                className="p-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors flex flex-col items-center"
              >
                <UserCheck className="w-4 h-4 mb-1 text-blue-600" />
                <span>Lawyer</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin@nyayaflow.com')}
                className="p-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 rounded-lg transition-colors flex flex-col items-center"
              >
                <Shield className="w-4 h-4 mb-1 text-purple-600" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('client.verma@nyayaflow.com')}
                className="p-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-lg transition-colors flex flex-col items-center"
              >
                <UserCheck className="w-4 h-4 mb-1 text-emerald-600" />
                <span>Client</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Default password for all seed accounts: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">Password@123</code>
            </p>
          </div>

          <div className="mt-6 text-center">
            <span className="text-xs text-slate-500">Don't have an account yet? </span>
            <Link to="/register" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Register now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
