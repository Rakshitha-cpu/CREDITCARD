import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import ToastContainer from '../components/ToastContainer';
import { useApp } from '../context/AppContext';
import { RefreshCw } from 'lucide-react';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { authReady, isAuthenticated } = useApp();

  if (!authReady) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f4f6f9] text-[#1e3a5f]">
        <RefreshCw size={28} className="animate-spin mb-3 text-blue-600" />
        <p className="text-sm font-semibold text-gray-700">Connecting to CREDITGUARD Risk Engine...</p>
        <p className="text-xs text-gray-400 mt-1">Verifying secure session token</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f9]">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
