import React, { useState, useEffect } from 'react';
import { Plus, Edit, UserCheck, Shield, Loader2, RefreshCw } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { UserService } from '../services/api';
import { useApp } from '../context/AppContext';

export default function UserManagementPage() {
  const { addToast, currentUser, switchAccount } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'FINANCE',
    status: 'ACTIVE',
    password: '',
    permissions: ['view_reports'],
  });

  const ALL_PERMISSIONS = [
    { id: 'view_reports', label: 'View Reports & Dashboard' },
    { id: 'manage_customers', label: 'Manage Customers' },
    { id: 'manage_invoices', label: 'Create & Edit Invoices' },
    { id: 'manage_payments', label: 'Record & Allocate Payments' },
    { id: 'submit_credit_requests', label: 'Submit Credit Requests' },
    { id: 'approve_credit', label: 'Approve / Reject Credit Limits' },
    { id: 'view_audit_logs', label: 'Access Audit Logs' },
    { id: 'manage_users', label: 'User Administration' },
  ];

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await UserService.getAll();
      if (res.data?.success && res.data.users) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      addToast('Failed to load user accounts from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  function openCreate() {
    setEditingUser(null);
    setForm({
      name: '',
      email: '',
      role: 'FINANCE',
      status: 'ACTIVE',
      password: 'demoPassword123!',
      permissions: ['view_reports', 'manage_customers'],
    });
    setModalOpen(true);
  }

  function openEdit(user) {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.rawRole || (user.role === 'Finance Manager' ? 'FINANCE_MANAGER' : user.role === 'Super Admin' ? 'ADMIN' : user.role === 'Credit Analyst' ? 'SALES' : 'FINANCE'),
      status: user.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
      password: '',
      permissions: user.permissions || [],
    });
    setModalOpen(true);
  }

  function handlePermissionToggle(permId) {
    setForm(f => {
      const exists = f.permissions.includes(permId);
      return {
        ...f,
        permissions: exists ? f.permissions.filter(p => p !== permId) : [...f.permissions, permId],
      };
    });
  }

  async function handleSave() {
    if (!form.name || !form.email) {
      addToast('Please enter name and email', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (editingUser) {
        const payload = {
          name: form.name,
          role: form.role,
          status: form.status,
        };
        await UserService.update(editingUser.id, payload);
        addToast('User updated successfully', 'success');
      } else {
        const payload = {
          name: form.name,
          email: form.email,
          role: form.role,
          password: form.password || 'demo1234',
        };
        await UserService.create(payload);
        addToast('User created successfully in database', 'success');
      }
      setModalOpen(false);
      await fetchUsers();
    } catch (err) {
      console.error('Save user error:', err);
      addToast(err.response?.data?.message || 'Failed to save user', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management &amp; RBAC</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage operator accounts, access roles and security permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152c4a]"
          >
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {currentUser?.role !== 'ADMIN' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <Shield size={18} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-950">Role-Based Access Control Notice</p>
              <p className="text-amber-800 mt-0.5">
                You are currently signed in as <strong>{currentUser?.name}</strong> with role <strong>[{currentUser?.role}]</strong>. Creating and editing user accounts is restricted to <strong>[ADMIN]</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => switchAccount('admin@creditguard.com')}
            className="self-start sm:self-auto px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-lg text-xs transition-colors whitespace-nowrap shadow-sm"
          >
            Switch to Admin (Super Admin) 👑
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['User ID', 'Name', 'Email Address', 'Role', 'Status', 'Last Active', 'Permissions', 'Action'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[#1e3a5f]" />
                    <p className="text-xs">Loading authorized user accounts from PostgreSQL database...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">
                    No operator accounts found in database.
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-[#1e3a5f]">{u.id.substring(0, 8)}...</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800">{u.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        u.rawRole === 'ADMIN' || u.role === 'Super Admin'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : u.rawRole === 'FINANCE_MANAGER' || u.role === 'Finance Manager'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : u.rawRole === 'SALES' || u.role === 'Credit Analyst'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{u.lastLogin || 'Never'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {u.permissions?.slice(0, 2).map(p => (
                          <span key={p} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {p.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {(u.permissions?.length || 0) > 2 && (
                          <span className="text-[10px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded">
                            +{u.permissions.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <Edit size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? `Edit User: ${editingUser.name}` : 'Create New System Operator'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              value={form.email}
              disabled={!!editingUser}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] disabled:bg-gray-100"
              placeholder="e.g. john@creditguard.com"
            />
          </div>

          {!editingUser && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Initial Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                placeholder="Temporary login password"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assigned Role</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              >
                <option value="ADMIN">System Administrator (ADMIN)</option>
                <option value="FINANCE_MANAGER">Finance Manager (FINANCE_MANAGER)</option>
                <option value="FINANCE">Finance Executive (FINANCE)</option>
                <option value="SALES">Credit Analyst / Sales (SALES)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Account Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Granular Role Permissions</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
              {ALL_PERMISSIONS.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(p.id)}
                    onChange={() => handlePermissionToggle(p.id)}
                    className="rounded text-[#1e3a5f] focus:ring-[#1e3a5f]"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => setModalOpen(false)}
              className="px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#152c4a] disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
              {editingUser ? 'Save Changes' : 'Create Operator'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
