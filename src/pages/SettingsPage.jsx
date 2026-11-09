import React, { useState, useEffect } from 'react';
import { Save, Building, ShieldAlert, Bell, Sliders, Lock, Check, Loader2, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SettingsService } from '../services/api';

export default function SettingsPage() {
  const { addToast } = useApp();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Company profile state
  const [company, setCompany] = useState({
    name: 'CreditGuard Financial Technologies Pvt Ltd',
    gstin: '27AAACC1208D1ZM',
    pan: 'AAACC1208D',
    email: 'finance@creditguard.in',
    phone: '+91 22 6123 4567',
    address: 'Level 12, Tower B, Peninsula Business Park, Lower Parel, Mumbai, Maharashtra 400013',
    currency: 'INR (₹)',
  });

  // Thresholds state
  const [thresholds, setThresholds] = useState({
    warningUtilization: 70,
    criticalUtilization: 85,
    limitReachedUtilization: 100,
    maxPermissibleExposureBuffer: 10,
    autoHoldOnOverdueDays: 15,
  });

  // Risk scoring weights
  const [riskWeights, setRiskWeights] = useState({
    utilizationWeight: 30,
    overdueWeight: 30,
    paymentBehaviorWeight: 20,
    agingWeight: 20,
    lowRiskThreshold: 20,
    mediumRiskThreshold: 50,
  });

  // Notification toggles
  const [notifications, setNotifications] = useState({
    emailOnCriticalUtilization: true,
    emailOnNewCreditRequest: true,
    emailOnPaymentReceived: false,
    slackWebhookEnabled: true,
    overdueReminderFrequency: 'Weekly',
  });

  // Payment terms
  const [terms, setTerms] = useState([
    { id: '1', name: 'Net 15', days: 15, default: false },
    { id: '2', name: 'Net 30', days: 30, default: true },
    { id: '3', name: 'Net 45', days: 45, default: false },
    { id: '4', name: 'Net 60', days: 60, default: false },
  ]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await SettingsService.getSettings();
      if (res.data?.success) {
        const s = res.data.settings || {};
        const rc = res.data.riskConfig;

        if (s.companyName) setCompany(prev => ({ ...prev, name: s.companyName, gstin: s.gstin || prev.gstin, email: s.officialEmail || prev.email }));
        if (s.warningUtilization) {
          setThresholds(prev => ({
            ...prev,
            warningUtilization: Number(s.warningUtilization) || prev.warningUtilization,
            criticalUtilization: Number(s.criticalUtilization) || prev.criticalUtilization,
            limitReachedUtilization: Number(s.limitReachedUtilization) || prev.limitReachedUtilization,
          }));
        }
        if (rc) {
          setRiskWeights(prev => ({
            ...prev,
            utilizationWeight: rc.utilizationWeight ?? prev.utilizationWeight,
            overdueWeight: rc.overdueWeight ?? prev.overdueWeight,
            paymentBehaviorWeight: rc.paymentBehaviorWeight ?? prev.paymentBehaviorWeight,
            agingWeight: rc.agingWeight ?? prev.agingWeight,
            lowRiskThreshold: rc.lowRiskMax ?? prev.lowRiskThreshold,
            mediumRiskThreshold: rc.mediumRiskMax ?? prev.mediumRiskThreshold,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSave(section) {
    try {
      setSaving(true);
      await SettingsService.updateSettings({
        settings: {
          companyName: company.name,
          gstin: company.gstin,
          officialEmail: company.email,
          warningUtilization: thresholds.warningUtilization,
          criticalUtilization: thresholds.criticalUtilization,
          limitReachedUtilization: thresholds.limitReachedUtilization,
          autoHoldOnOverdueDays: thresholds.autoHoldOnOverdueDays,
        },
        riskConfig: {
          utilizationWeight: riskWeights.utilizationWeight,
          overdueWeight: riskWeights.overdueWeight,
          paymentBehaviorWeight: riskWeights.paymentBehaviorWeight,
          agingWeight: riskWeights.agingWeight,
          lowRiskMax: riskWeights.lowRiskThreshold,
          mediumRiskMax: riskWeights.mediumRiskThreshold,
        },
      });
      addToast(`${section} saved successfully to database!`, 'success');
    } catch (err) {
      console.error('Error saving settings:', err);
      addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform configuration, credit thresholds, and risk scoring policy</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-60 border-r border-gray-100 p-4 space-y-1 flex-shrink-0 bg-gray-50/50">
          {[
            { id: 'company', label: 'Company Profile', icon: Building },
            { id: 'thresholds', label: 'Credit Thresholds', icon: Sliders },
            { id: 'risk', label: 'Risk Scoring Config', icon: ShieldAlert },
            { id: 'notifications', label: 'Notification Settings', icon: Bell },
            { id: 'terms', label: 'Payment Terms', icon: Check },
            { id: 'permissions', label: 'User Permissions', icon: Lock },
          ].map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${active ? 'bg-[#1e3a5f] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-gray-400 text-sm gap-2">
              <Loader2 className="animate-spin text-[#1e3a5f]" size={18} /> Loading settings from backend...
            </div>
          ) : null}

          {/* Section 1: Company Profile */}
          {!loading && activeTab === 'company' && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-semibold text-gray-800">Company &amp; Legal Entity Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Entity Name</label>
                  <input
                    type="text"
                    value={company.name}
                    onChange={e => setCompany({ ...company, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={company.gstin}
                    onChange={e => setCompany({ ...company, gstin: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">PAN</label>
                  <input
                    type="text"
                    value={company.pan}
                    onChange={e => setCompany({ ...company, pan: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={company.email}
                    onChange={e => setCompany({ ...company, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={company.phone}
                    onChange={e => setCompany({ ...company, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Registered Address</label>
                  <textarea
                    rows={3}
                    value={company.address}
                    onChange={e => setCompany({ ...company, address: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] resize-none"
                  />
                </div>
              </div>
              <button
                onClick={() => handleSave('Company profile')}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#152c4a] disabled:opacity-50"
              >
                <Save size={13} /> {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}

          {/* Section 2: Credit Threshold Configuration */}
          {!loading && activeTab === 'thresholds' && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-semibold text-gray-800">Credit Exposure &amp; Limit Monitoring Thresholds</h3>
              <p className="text-xs text-gray-500">Define the portfolio utilization boundaries that trigger warnings and automatic operational holds.</p>
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">Warning Threshold (% of limit)</span>
                    <span className="font-bold text-yellow-600">{thresholds.warningUtilization}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    value={thresholds.warningUtilization}
                    onChange={e => setThresholds({ ...thresholds, warningUtilization: Number(e.target.value) })}
                    className="w-full accent-yellow-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">Critical Warning Threshold (% of limit)</span>
                    <span className="font-bold text-orange-600">{thresholds.criticalUtilization}%</span>
                  </div>
                  <input
                    type="range"
                    min="75"
                    max="98"
                    value={thresholds.criticalUtilization}
                    onChange={e => setThresholds({ ...thresholds, criticalUtilization: Number(e.target.value) })}
                    className="w-full accent-orange-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">Limit Reached Boundary (%)</span>
                    <span className="font-bold text-red-600">{thresholds.limitReachedUtilization}%</span>
                  </div>
                  <input
                    type="range"
                    min="95"
                    max="110"
                    value={thresholds.limitReachedUtilization}
                    onChange={e => setThresholds({ ...thresholds, limitReachedUtilization: Number(e.target.value) })}
                    className="w-full accent-red-500"
                  />
                </div>
                <div className="pt-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Automatic Dispatch Hold on Overdue (Days past due)</label>
                  <input
                    type="number"
                    value={thresholds.autoHoldOnOverdueDays}
                    onChange={e => setThresholds({ ...thresholds, autoHoldOnOverdueDays: Number(e.target.value) })}
                    className="w-32 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => handleSave('Credit threshold settings')}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#152c4a] disabled:opacity-50"
              >
                <Save size={13} /> {saving ? 'Saving...' : 'Save Thresholds'}
              </button>
            </div>
          )}

          {/* Section 3: Risk Scoring Configuration */}
          {!loading && activeTab === 'risk' && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-semibold text-gray-800">Risk Assessment Engine Weightages</h3>
              <p className="text-xs text-gray-500">Configure how CREDITGUARD calculates automated risk scores (0–100 scale).</p>
              <div className="space-y-3 pt-2">
                {[
                  { key: 'utilizationWeight', label: 'Credit Utilization Weight (%)' },
                  { key: 'overdueWeight', label: 'Overdue Amount Weight (%)' },
                  { key: 'paymentBehaviorWeight', label: 'Payment Track Record Weight (%)' },
                  { key: 'agingWeight', label: 'Receivables Aging Weight (%)' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-xs text-gray-700">{item.label}</span>
                    <input
                      type="number"
                      value={riskWeights[item.key]}
                      onChange={e => setRiskWeights({ ...riskWeights, [item.key]: Number(e.target.value) })}
                      className="w-20 px-2 py-1 text-sm border border-gray-200 rounded text-right focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                Total weight sum: {riskWeights.utilizationWeight + riskWeights.overdueWeight + riskWeights.paymentBehaviorWeight + riskWeights.agingWeight}%
              </div>
              <button
                onClick={() => handleSave('Risk scoring configuration')}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#152c4a] disabled:opacity-50"
              >
                <Save size={13} /> {saving ? 'Saving...' : 'Save Risk Scoring Config'}
              </button>
            </div>
          )}

          {/* Section 4: Notifications */}
          {!loading && activeTab === 'notifications' && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-semibold text-gray-800">Alerts &amp; Dispatch Notifications</h3>
              <div className="space-y-3 pt-2">
                {[
                  { key: 'emailOnCriticalUtilization', label: 'Email finance team when customer exceeds 85% utilization' },
                  { key: 'emailOnNewCreditRequest', label: 'Send instant notification when a sales agent submits a new credit request' },
                  { key: 'emailOnPaymentReceived', label: 'Email alerts for incoming RTGS/NEFT payment receipts' },
                  { key: 'slackWebhookEnabled', label: 'Forward critical portfolio alerts to Slack channel (#finance-alerts)' },
                ].map(n => (
                  <label key={n.key} className="flex items-start gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications[n.key]}
                      onChange={e => setNotifications({ ...notifications, [n.key]: e.target.checked })}
                      className="mt-0.5 accent-[#1e3a5f]"
                    />
                    <span className="text-xs text-gray-700">{n.label}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => handleSave('Notification settings')}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#152c4a] disabled:opacity-50"
              >
                <Save size={13} /> {saving ? 'Saving...' : 'Save Notification Preferences'}
              </button>
            </div>
          )}

          {/* Section 5: Payment Terms */}
          {!loading && activeTab === 'terms' && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-semibold text-gray-800">Standard Payment Terms</h3>
              <p className="text-xs text-gray-500">Configure default commercial payment terms used across customer profiles and invoices.</p>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                {terms.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-white">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{t.name}</p>
                      <p className="text-[11px] text-gray-500">Maturity: {t.days} calendar days from invoice date</p>
                    </div>
                    {t.default ? (
                      <span className="text-[11px] bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded">Default Term</span>
                    ) : (
                      <button
                        onClick={() => setTerms(terms.map(item => ({ ...item, default: item.id === t.id })))}
                        className="text-xs text-[#1e3a5f] hover:underline"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleSave('Payment terms')}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#152c4a] disabled:opacity-50"
              >
                <Save size={13} /> {saving ? 'Saving...' : 'Save Payment Terms'}
              </button>
            </div>
          )}

          {/* Section 6: User Permissions Policy */}
          {!loading && activeTab === 'permissions' && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-semibold text-gray-800">Role-Based Access Control (RBAC) Matrix</h3>
              <p className="text-xs text-gray-500">Predefined system policy defining which roles can authorize credit increments or write-offs.</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Action / Privilege</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Executive</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Analyst</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Manager</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { action: 'View Customer Data & Invoices', exec: true, analyst: true, mgr: true },
                      { action: 'Create Invoice / Record Payment', exec: true, analyst: true, mgr: true },
                      { action: 'Submit Credit Limit Request', exec: false, analyst: true, mgr: true },
                      { action: 'Approve / Reject Credit Limit', exec: false, analyst: false, mgr: true },
                      { action: 'Modify Risk Scoring Weightages', exec: false, analyst: false, mgr: true },
                      { action: 'Manage Users & Permissions', exec: false, analyst: false, mgr: true },
                    ].map(r => (
                      <tr key={r.action} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-gray-800 font-medium">{r.action}</td>
                        <td className="px-3 py-2.5 text-center">{r.exec ? '✅' : '—'}</td>
                        <td className="px-3 py-2.5 text-center">{r.analyst ? '✅' : '—'}</td>
                        <td className="px-3 py-2.5 text-center">{r.mgr ? '✅' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => handleSave('Permission policies')}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#152c4a] disabled:opacity-50"
              >
                <Save size={13} /> {saving ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
