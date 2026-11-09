import React, { useState, useEffect } from 'react';
import { Edit, History, RefreshCw } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { formatINRCrore, formatDate } from '../utils/helpers';
import { CreditProfileService } from '../services/api';
import { useApp } from '../context/AppContext';

export default function CreditProfilesPage() {
  const { addToast } = useApp();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState([]);

  // Edit form state
  const [editForm, setEditForm] = useState({ creditLimit: 0, paymentTerms: 'Net 30', reason: '' });

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const res = await CreditProfileService.getAll();
      if (res.data.success) {
        setProfiles(res.data.profiles);
      }
    } catch (error) {
      addToast('Failed to load credit profiles from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  function openEdit(profile) {
    setSelectedProfile(profile);
    setEditForm({
      creditLimit: profile.approvedCreditLimit,
      paymentTerms: profile.paymentTerms,
      reason: '',
    });
    setEditModal(true);
  }

  async function handleSaveProfile() {
    if (!editForm.creditLimit || !editForm.reason) {
      addToast('Please provide a credit limit and justification reason', 'error');
      return;
    }

    try {
      const res = await CreditProfileService.update(selectedProfile.customerId, editForm);
      if (res.data.success) {
        setEditModal(false);
        addToast('Credit profile updated in PostgreSQL', 'success');
        loadProfiles();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update credit profile', 'error');
    }
  }

  async function openHistory(profile) {
    setSelectedProfile(profile);
    try {
      const res = await CreditProfileService.getHistory(profile.customerId);
      if (res.data.success) {
        setHistoryList(res.data.history);
      }
      setHistoryModal(true);
    } catch (error) {
      addToast('Failed to retrieve credit change history', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Credit Profiles</h1>
            {loading && <RefreshCw size={14} className="text-blue-500 animate-spin" />}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Manage approved credit limits, permissible exposure and change history</p>
        </div>
        <button
          onClick={loadProfiles}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Grid of Credit Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {profiles.map(c => {
          const limit = c.approvedCreditLimit;
          const exposure = c.currentExposure;
          const util = limit > 0 ? ((exposure / limit) * 100).toFixed(1) : 0;
          return (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">{c.companyName}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{c.customerCode || c.customerId} · {c.category}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>

              <div className="py-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Approved Credit Limit:</span>
                  <span className="font-bold text-gray-900">{formatINRCrore(c.approvedCreditLimit)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Max Permissible Exposure:</span>
                  <span className="font-medium text-blue-600">{formatINRCrore(c.maxPermissibleExposure)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Current Outstanding:</span>
                  <span className="font-medium text-orange-600">{formatINRCrore(c.currentExposure)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Available Credit:</span>
                  <span className="font-medium text-green-600">{formatINRCrore(c.availableCredit)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Payment Terms:</span>
                  <span className="font-medium text-gray-700">{c.paymentTerms}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500">Risk Category:</span>
                  <StatusBadge status={c.riskCategory} />
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-500">Utilization</span>
                    <span className="font-bold text-gray-700">{util}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${Number(util) >= 85 ? 'bg-red-500' : Number(util) >= 70 ? 'bg-orange-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(util, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => openHistory(c)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800"
                >
                  <History size={13} /> History
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#152c4a] rounded-lg transition-colors"
                >
                  <Edit size={12} /> Edit Profile
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title={`Edit Credit Profile: ${selectedProfile?.companyName}`}>
        {selectedProfile && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Approved Credit Limit (₹)</label>
              <input
                type="number"
                value={editForm.creditLimit}
                onChange={e => setEditForm(f => ({ ...f, creditLimit: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Terms</label>
              <select
                value={editForm.paymentTerms}
                onChange={e => setEditForm(f => ({ ...f, paymentTerms: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              >
                {['Net 15', 'Net 30', 'Net 45', 'Net 60'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Modification Justification *</label>
              <textarea
                value={editForm.reason}
                onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
                rows={3}
                placeholder="State the commercial reason for this credit profile modification..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setEditModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveProfile} className="px-4 py-2 text-sm font-medium bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152c4a]">Save Changes</button>
            </div>
          </div>
        )}
      </Modal>

      {/* History Modal */}
      <Modal isOpen={historyModal} onClose={() => setHistoryModal(false)} title={`Credit Limit Change History: ${selectedProfile?.companyName}`} size="lg">
        {selectedProfile && (
          <div className="space-y-4">
            {historyList.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400">No credit limit changes recorded for this customer.</p>
            ) : (
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {historyList.map((h, i) => (
                  <div key={i} className="py-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-900">
                        {formatINRCrore(h.previousLimit)} → <span className="text-green-600">{formatINRCrore(h.newLimit)}</span>
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(h.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-600">{h.reason}</p>
                    <p className="text-[11px] text-gray-400">Updated by: {h.updatedBy}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button onClick={() => setHistoryModal(false)} className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
