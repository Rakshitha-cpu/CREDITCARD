import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, ShieldAlert, TrendingUp, Loader2, RefreshCw, X } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { formatINRCrore } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { MonitoringService } from '../services/api';
import { useApp } from '../context/AppContext';

export default function CreditMonitoringPage() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [filterLevel, setFilterLevel] = useState('All');
  const [monitored, setMonitored] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ approaching: 0, critical: 0, reachedOrExceeded: 0, overdueCount: 0 });
  const [loading, setLoading] = useState(true);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const res = await MonitoringService.getAlerts();
      if (res.data?.success) {
        setMonitored(res.data.monitored || []);
        setAlerts(res.data.alerts || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching credit monitoring data:', err);
      addToast('Failed to load credit monitoring alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  const handleDismiss = async (alertId) => {
    try {
      await MonitoringService.dismissAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      addToast('Alert dismissed', 'info');
    } catch (err) {
      console.error('Dismiss error:', err);
      addToast('Failed to dismiss alert', 'error');
    }
  };

  const filtered = useMemo(() => {
    if (filterLevel === 'All') return monitored;
    if (filterLevel === 'Overdue') return monitored.filter(c => c.hasOverdue);
    return monitored.filter(c => c.level === filterLevel);
  }, [monitored, filterLevel]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Credit Monitoring &amp; Early Warnings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time alerts and threshold tracking for credit limits and payment defaults</p>
        </div>
        <button
          onClick={fetchMonitoringData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Scan
        </button>
      </div>

      {/* Threshold Alert Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Warning (≥70%)', count: stats.approaching, desc: 'Approaching credit limit', color: 'text-yellow-600', border: 'border-l-yellow-500', icon: AlertTriangle, filter: 'Warning' },
          { label: 'Critical (≥85%)', count: stats.critical, desc: 'High exposure warning', color: 'text-orange-600', border: 'border-l-orange-500', icon: AlertTriangle, filter: 'Critical Warning' },
          { label: 'Limit Reached / Exceeded (≥100%)', count: stats.reachedOrExceeded, desc: 'Immediate stop recommended', color: 'text-red-600', border: 'border-l-red-500', icon: ShieldAlert, filter: 'Limit Reached' },
          { label: 'Customers With Overdue', count: stats.overdueCount, desc: 'Overdue invoices detected', color: 'text-purple-600', border: 'border-l-purple-500', icon: AlertCircle, filter: 'Overdue' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              onClick={() => setFilterLevel(filterLevel === card.filter ? 'All' : card.filter)}
              className={`bg-white rounded-xl border border-gray-100 border-l-4 ${card.border} shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${filterLevel === card.filter ? 'ring-2 ring-[#1e3a5f]' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500">{card.label}</p>
                <Icon size={16} className={card.color} />
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{card.count}</p>
              <p className="text-xs text-gray-400 mt-1">{card.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Active System Alerts Feed */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Active Policy Violation Alerts ({alerts.length})
          </h3>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {alerts.map(a => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/50 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-gray-900">{a.customer?.companyName || 'Customer'}: </span>
                    <span className="text-gray-700">{a.message}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-white text-red-700 border border-red-200">
                    {a.utilizationPct}%
                  </span>
                  <button
                    onClick={() => handleDismiss(a.id)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Dismiss alert"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monitored Accounts Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Portfolio Exposure Monitoring</h3>
            <p className="text-xs text-gray-500 mt-0.5">Filter: <span className="font-medium text-gray-700">{filterLevel}</span> ({filtered.length} customers)</p>
          </div>
          {filterLevel !== 'All' && (
            <button onClick={() => setFilterLevel('All')} className="text-xs text-blue-600 hover:underline">
              Clear Filter
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-gray-400 text-sm gap-2">
              <Loader2 className="animate-spin text-[#1e3a5f]" size={18} /> Scanning portfolio metrics...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-gray-400 text-sm">
              No customers match the current monitoring filter.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Customer', 'Credit Limit', 'Outstanding', 'Utilization %', 'Overdue Amount', 'Status', 'Risk', 'Action'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => {
                  const util = c.utilizationPct;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs text-gray-900">{c.companyName}</div>
                        <div className="text-[11px] text-gray-400">{c.customerCode || c.businessCategory}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-900">{formatINRCrore(c.creditLimit)}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-700">{formatINRCrore(c.outstanding)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${util > 100 ? 'bg-purple-600' : util >= 85 ? 'bg-red-500' : util >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(util, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${util >= 85 ? 'text-red-600' : util >= 70 ? 'text-yellow-600' : 'text-gray-700'}`}>
                            {util}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-red-600">
                        {c.overdue > 0 ? formatINRCrore(c.overdue) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          c.level === 'Limit Exceeded' ? 'text-purple-700 bg-purple-50 border-purple-200' :
                          c.level === 'Limit Reached' ? 'text-red-700 bg-red-50 border-red-200' :
                          c.level === 'Critical Warning' ? 'text-orange-700 bg-orange-50 border-orange-200' :
                          c.level === 'Warning' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
                          'text-green-700 bg-green-50 border-green-200'
                        }`}>
                          {c.level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.riskCategory} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          className="px-2 py-1 text-xs text-[#1e3a5f] bg-blue-50 hover:bg-blue-100 rounded font-medium"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
