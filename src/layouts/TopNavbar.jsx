import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, ChevronRight, User, Settings, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';

const BREADCRUMB_MAP = {
  '/dashboard': ['Dashboard'],
  '/customers': ['Customers', 'Customer Management'],
  '/credit-profiles': ['Credit Profiles'],
  '/invoices': ['Invoices', 'Invoice Management'],
  '/payments': ['Payments', 'Payment Management'],
  '/aging': ['Outstanding & Aging'],
  '/credit-requests': ['Credit Requests'],
  '/risk-assessment': ['Risk Assessment'],
  '/approvals': ['Approvals'],
  '/credit-monitoring': ['Credit Monitoring'],
  '/analytics': ['Analytics & Reports'],
  '/audit-logs': ['Audit Logs'],
  '/user-management': ['User Management'],
  '/settings': ['Settings'],
};

export default function TopNavbar() {
  const { currentUser, logoutUser, switchAccount } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const profileRef = useRef(null);

  const DEMO_ROLES = [
    { email: 'admin@creditguard.com', name: 'System Administrator', role: 'ADMIN', badge: 'Super Admin', icon: '👑' },
    { email: 'manager@creditguard.com', name: 'Sarah Johnson', role: 'FINANCE_MANAGER', badge: 'Finance Mgr', icon: '💼' },
    { email: 'finance@creditguard.com', name: 'Priya Mehta', role: 'FINANCE', badge: 'Finance Exec', icon: '📊' },
    { email: 'sales@creditguard.com', name: 'Mike Chen', role: 'SALES', badge: 'Credit Analyst', icon: '🏷️' },
  ];

  const breadcrumbs = BREADCRUMB_MAP[location.pathname] || ['Page'];

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
        setShowNotif(false);
        setShowRoleMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <span className="text-gray-400">Home</span>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={13} className="text-gray-300" />
            <span className={i === breadcrumbs.length - 1 ? 'font-medium text-gray-800' : 'text-gray-400'}>
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3" ref={profileRef}>
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers, invoices..."
            className="pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] focus:border-[#1e3a5f]"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl border border-gray-100 shadow-lg z-50 py-1">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Notifications</p>
              </div>
              {[
                { text: 'Global Textiles Corp exceeded 95% credit limit', time: '2h ago', color: 'bg-red-400' },
                { text: 'New credit request from Bharat Steel Industries', time: '4h ago', color: 'bg-yellow-400' },
                { text: 'Maharashtra Cement Co has ₹18L overdue', time: '1d ago', color: 'bg-orange-400' },
              ].map((n, i) => (
                <div key={i} className="flex gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.color}`} />
                  <div>
                    <p className="text-xs text-gray-700">{n.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => { setShowRoleMenu(!showRoleMenu); setShowProfile(false); setShowNotif(false); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
              currentUser.role === 'ADMIN'
                ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                : currentUser.role === 'FINANCE_MANAGER'
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : currentUser.role === 'FINANCE'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
            title="Click to switch demo role"
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span className="font-semibold">{currentUser.role}</span>
            <ChevronDown size={12} className="opacity-70" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl border border-gray-100 shadow-xl z-50 py-1.5">
              <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Switch Active Role</p>
                <p className="text-xs text-gray-500 mt-0.5">Test role-based access & permissions</p>
              </div>
              {DEMO_ROLES.map((r) => {
                const isSelected = currentUser.email === r.email;
                return (
                  <button
                    key={r.email}
                    onClick={async () => {
                      setShowRoleMenu(false);
                      await switchAccount(r.email);
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2 text-left text-xs transition-colors ${
                      isSelected ? 'bg-blue-50/70 font-semibold text-blue-900' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{r.icon}</span>
                      <div>
                        <p className="leading-tight">{r.name}</p>
                        <p className="text-[10px] text-gray-400 leading-tight">{r.email}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      r.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      r.role === 'FINANCE_MANAGER' ? 'bg-blue-100 text-blue-700' :
                      r.role === 'FINANCE' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {r.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#1e3a5f] text-white text-xs font-bold flex items-center justify-center">
              {currentUser.avatar}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{currentUser.role}</p>
            </div>
            <ChevronDown size={13} className="text-gray-400" />
          </button>
          {showProfile && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-gray-100 shadow-lg z-50 py-1">
              <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <User size={14} /> My Profile
              </button>
              <button onClick={() => navigate('/settings')} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <Settings size={14} /> Settings
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => {
                  logoutUser();
                  navigate('/login');
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
