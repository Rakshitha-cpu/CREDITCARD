import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertCircle, CheckCircle, TrendingUp, Users, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginUser } = useApp();
  const [email, setEmail] = useState('manager@creditguard.com');
  const [password, setPassword] = useState('demo1234');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');

    const res = await loginUser(email, password);
    setLoading(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message);
    }
  }

  const demoAccounts = [
    { role: 'Finance Manager', email: 'manager@creditguard.com' },
    { role: 'Administrator', email: 'admin@creditguard.com' },
    { role: 'Credit Analyst', email: 'sales@creditguard.com' },
    { role: 'Finance Executive', email: 'finance@creditguard.com' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1e3a5f] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute bottom-40 left-10 w-40 h-40 rounded-full border border-white" />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full border border-white opacity-50" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white tracking-wide">CREDITGUARD</p>
              <p className="text-xs text-blue-200">Credit &amp; Risk Intelligence</p>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white leading-tight mb-4">
            Enterprise Credit &amp;<br />Risk Management
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed mb-10 max-w-sm">
            Comprehensive platform for managing customer credit limits, payment risk, and financial exposure for large B2B distribution companies.
          </p>
          <div className="space-y-4">
            {[
              { icon: TrendingUp, title: 'Real-time Risk Scoring', desc: 'Dynamic risk assessment based on payment behavior and credit utilization' },
              { icon: Users, title: 'Customer Credit Management', desc: 'Manage credit limits, track outstanding amounts, and monitor utilization' },
              { icon: FileText, title: 'Approval Workflows', desc: 'Structured credit request approval process with audit trails' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={15} className="text-blue-200" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{title}</p>
                  <p className="text-blue-300 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 bg-white/10 rounded-xl p-4">
          <p className="text-white/70 text-xs font-medium mb-1">🚀 Full-Stack Connected</p>
          <p className="text-blue-200 text-xs">Live authentication with Node.js, Express, and PostgreSQL with JWT authorization.</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#f4f6f9]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Shield size={28} className="text-[#1e3a5f]" />
            <div>
              <p className="text-lg font-bold text-[#1e3a5f]">CREDITGUARD</p>
              <p className="text-xs text-gray-500">Credit &amp; Risk Intelligence</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Sign in to your account</h2>
            <p className="text-sm text-gray-500 mb-4">Choose a role or enter your credentials</p>

            {/* Quick Demo Accounts Buttons */}
            <div className="mb-5 space-y-1.5">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Demo Accounts (Password: demo1234)</p>
              <div className="grid grid-cols-2 gap-1.5">
                {demoAccounts.map(acc => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => { setEmail(acc.email); setPassword('demo1234'); }}
                    className={`px-2.5 py-1.5 text-left border rounded-lg text-xs transition-colors ${email === acc.email ? 'border-[#1e3a5f] bg-blue-50/70 text-[#1e3a5f] font-semibold' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                  >
                    <span className="block truncate">{acc.role}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex gap-2">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                  placeholder="name@creditguard.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                    placeholder="Enter password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="w-3.5 h-3.5 rounded accent-[#1e3a5f]" />
                  <span className="text-xs text-gray-600">Remember me</span>
                </label>
                <button type="button" className="text-xs text-[#1e3a5f] hover:underline font-medium">Forgot password?</button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#1e3a5f] hover:bg-[#152c4a] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">© 2026 CREDITGUARD – Connected to PostgreSQL</p>
        </div>
      </div>
    </div>
  );
}
