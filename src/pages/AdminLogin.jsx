import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { adminService } from '../services/adminService';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already authenticated as admin, redirect directly to /admin
  useEffect(() => {
    async function checkExisting() {
      const admin = await adminService.getCurrentAdmin();
      if (admin) {
        navigate('/admin');
      }
    }
    checkExisting();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your administrator email and password.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      await adminService.login({ email, password });
      navigate('/admin');
    } catch (err) {
      console.error('[AdminLogin] Login error:', err);
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F9] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* College Identity Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00386B]/10 border border-[#00386B]/20 text-[#00386B] text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-[#00386B]" />
          <span>SJCEM Training & Placement Cell</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#1C1C1C] font-heading tracking-tight">
          Admin Console Login
        </h1>
        <p className="text-xs sm:text-sm text-[#5F6B76]">
          Authorized access for placement coordinators and contest administrators
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-xs rounded-xl border border-[#D9E1E8]">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-[#E31B23]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-bold text-[#1C1C1C] uppercase tracking-wider mb-1">
                Admin Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5F6B76]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@sjcem.edu.in"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] focus:border-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-bold text-[#1C1C1C] uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5F6B76]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] focus:border-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#00386B] hover:bg-[#005599] text-white font-bold text-sm rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate & Access Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-[#D9E1E8] text-center text-xs text-[#5F6B76] space-y-2">
            <p>
              Students do not create accounts or sign in here.
            </p>
            <Link
              to="/"
              className="text-[#00386B] hover:text-[#005599] font-bold inline-flex items-center gap-1"
            >
              <span>← Return to Student Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
