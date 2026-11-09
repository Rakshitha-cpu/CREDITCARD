import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [authReady, setAuthReady] = useState(false);

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('creditguard_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('creditguard_token') || '');

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const loginUser = async (email, password) => {
    try {
      const res = await AuthService.login({ email, password });
      if (res.data?.success && res.data.token) {
        const u = res.data.user;
        const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const userObj = { ...u, avatar: initials };

        sessionStorage.removeItem('creditguard_logged_out');
        setToken(res.data.token);
        setCurrentUser(userObj);
        localStorage.setItem('creditguard_token', res.data.token);
        localStorage.setItem('creditguard_user', JSON.stringify(userObj));
        addToast(`Welcome back, ${u.name}!`, 'success');
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Login failed.' };
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to authenticate with backend.';
      return { success: false, message: msg };
    }
  };

  const logoutUser = () => {
    sessionStorage.setItem('creditguard_logged_out', 'true');
    setToken('');
    setCurrentUser(null);
    localStorage.removeItem('creditguard_token');
    localStorage.removeItem('creditguard_user');
    addToast('Signed out successfully.', 'info');
  };

  const switchAccount = async (targetEmail) => {
    try {
      const res = await AuthService.login({ email: targetEmail, password: 'demo1234' });
      if (res.data?.success && res.data.token) {
        const u = res.data.user;
        const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const userObj = { ...u, avatar: initials };

        sessionStorage.removeItem('creditguard_logged_out');
        setToken(res.data.token);
        setCurrentUser(userObj);
        localStorage.setItem('creditguard_token', res.data.token);
        localStorage.setItem('creditguard_user', JSON.stringify(userObj));
        addToast(`Switched account to ${u.name} (${u.role})`, 'success');
        return true;
      }
      return false;
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to switch demo account', 'error');
      return false;
    }
  };

  // Auto-authenticate default demo user (Super Admin for full platform access)
  useEffect(() => {
    async function initSession() {
      const existingToken = localStorage.getItem('creditguard_token');
      const isLoggedOut = sessionStorage.getItem('creditguard_logged_out');

      if (!existingToken && !isLoggedOut) {
        try {
          const res = await AuthService.login({
            email: 'admin@creditguard.com',
            password: 'demo1234',
          });
          if (res.data?.success && res.data.token) {
            const u = res.data.user;
            const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const userObj = { ...u, avatar: initials };

            setToken(res.data.token);
            setCurrentUser(userObj);
            localStorage.setItem('creditguard_token', res.data.token);
            localStorage.setItem('creditguard_user', JSON.stringify(userObj));
          }
        } catch (err) {
          console.warn('Backend auto-login failed:', err?.message);
        }
      }
      setAuthReady(true);
    }

    initSession();
  }, []);

  return (
    <AppContext.Provider value={{
      currentUser: currentUser || {
        id: 'USR-ADMIN',
        name: 'System Administrator',
        email: 'admin@creditguard.com',
        role: 'ADMIN',
        avatar: 'SA',
      },
      token,
      authReady,
      toasts,
      addToast,
      removeToast,
      loginUser,
      logoutUser,
      switchAccount,
      isAuthenticated: !!token,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
