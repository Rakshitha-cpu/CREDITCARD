import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, FileText, DollarSign,
  Clock, FilePlus, AlertTriangle, CheckSquare, Activity,
  BarChart2, ScrollText, UserCog, Settings, ChevronLeft,
  ChevronRight, Shield, LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/credit-profiles', label: 'Credit Profiles', icon: CreditCard },
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/payments', label: 'Payments', icon: DollarSign },
  { path: '/aging', label: 'Outstanding & Aging', icon: Clock },
  { path: '/credit-requests', label: 'Credit Requests', icon: FilePlus },
  { path: '/risk-assessment', label: 'Risk Assessment', icon: AlertTriangle },
  { path: '/approvals', label: 'Approvals', icon: CheckSquare },
  { path: '/credit-monitoring', label: 'Credit Monitoring', icon: Activity },
  { path: '/analytics', label: 'Analytics & Reports', icon: BarChart2 },
  { path: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { path: '/user-management', label: 'User Management', icon: UserCog },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  return (
    <aside
      className={`sidebar-transition flex flex-col bg-[#1e3a5f] text-white h-screen flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}
      style={{ position: 'sticky', top: 0 }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        {!collapsed && (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-blue-300 flex-shrink-0" />
              <span className="text-base font-bold tracking-wide text-white truncate">CREDITGUARD</span>
            </div>
            <p className="text-[10px] text-blue-200/70 mt-0.5 ml-7 leading-tight">Credit & Risk Intelligence</p>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <Shield size={20} className="text-blue-300" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`flex-shrink-0 p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors ${collapsed ? 'hidden' : ''}`}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Collapse button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors group ${
                isActive
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Icon size={17} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User profile */}
      <div className="border-t border-white/10 p-3">
        <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-blue-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {currentUser.avatar}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-white/50 truncate">{currentUser.role}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => navigate('/login')}
              title="Logout"
              className="text-white/40 hover:text-white transition-colors flex-shrink-0"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
