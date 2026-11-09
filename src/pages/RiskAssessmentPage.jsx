import React, { useState, useEffect, useMemo } from 'react';
import { Eye, Loader2, RefreshCw } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import Modal from '../components/Modal';
import RiskIndicator from '../components/RiskIndicator';
import { formatINRCrore, formatDate, getUtilizationPct } from '../utils/helpers';
import { RiskService } from '../services/api';
import { useApp } from '../context/AppContext';

export default function RiskAssessmentPage() {
  const { addToast } = useApp();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [sortKey, setSortKey] = useState('riskScore');
  const [sortDir, setSortDir] = useState('desc');

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const res = await RiskService.getPortfolio();
      if (res.data?.success && res.data.customers) {
        setCustomers(res.data.customers);
      }
    } catch (err) {
      console.error('Error fetching risk portfolio:', err);
      addToast('Failed to load risk portfolio from backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const stats = useMemo(() => {
    const low = customers.filter(c => c.riskCategory === 'Low').length;
    const medium = customers.filter(c => c.riskCategory === 'Medium').length;
    const high = customers.filter(c => c.riskCategory === 'High').length;
    const avgScore = customers.length > 0
      ? Math.round(customers.reduce((s, c) => s + (c.riskScore || 0), 0) / customers.length)
      : 0;
    return { low, medium, high, avgScore };
  }, [customers]);

  const sorted = useMemo(() => [...customers].sort((a, b) => {
    const aV = a[sortKey] ?? 0;
    const bV = b[sortKey] ?? 0;
    if (aV < bV) return sortDir === 'asc' ? -1 : 1;
    if (aV > bV) return sortDir === 'asc' ? 1 : -1;
    return 0;
  }), [customers, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function getRadarData(c) {
    const util = parseFloat(getUtilizationPct(c.outstanding, c.creditLimit));
    const overdueScore = c.overdue > 0 && c.creditLimit > 0 ? Math.min((c.overdue / c.creditLimit) * 100, 100) : 0;
    const behaviorScore = c.paymentBehavior === 'POOR' || c.paymentBehavior === 'Poor' ? 80 :
      c.paymentBehavior === 'FAIR' || c.paymentBehavior === 'Fair' ? 50 :
      c.paymentBehavior === 'GOOD' || c.paymentBehavior === 'Good' ? 25 : 10;
    return [
      { subject: 'Credit Utilization', A: util },
      { subject: 'Overdue Ratio', A: overdueScore },
      { subject: 'Payment Behavior', A: behaviorScore },
      { subject: 'Risk Score', A: c.riskScore || 0 },
      { subject: 'Outstanding Ratio', A: c.creditLimit > 0 ? Math.min((c.outstanding / c.creditLimit) * 100, 100) : 0 },
    ];
  }

  const SortIcon = ({ k }) => (
    <span className="ml-1 opacity-50">{sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Risk Assessment</h1>
          <p className="text-sm text-gray-500 mt-0.5">Comprehensive credit risk analytics and scoring model</p>
        </div>
        <button
          onClick={fetchPortfolio}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Low Risk', value: stats.low, color: 'text-green-600', border: 'border-l-green-500' },
          { label: 'Medium Risk', value: stats.medium, color: 'text-yellow-600', border: 'border-l-yellow-500' },
          { label: 'High Risk', value: stats.high, color: 'text-red-600', border: 'border-l-red-500' },
          { label: 'Avg Risk Score', value: `${stats.avgScore}/100`, color: 'text-[#1e3a5f]', border: 'border-l-blue-500' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-xl border border-gray-100 border-l-4 ${s.border} shadow-sm p-4`}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Risk Score Scoring Guide */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Risk Scoring Model</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { range: '0–20', label: 'Low Risk', color: 'bg-green-500', desc: 'Excellent payment history, low utilization' },
            { range: '21–50', label: 'Medium Risk', color: 'bg-yellow-500', desc: 'Some overdue, moderate utilization' },
            { range: '51–100', label: 'High Risk', color: 'bg-red-500', desc: 'High overdue, poor payment history' },
          ].map(r => (
            <div key={r.range} className="flex items-start gap-3 flex-1 min-w-48">
              <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${r.color}`} />
              <div>
                <p className="text-xs font-semibold text-gray-800">{r.range}: {r.label}</p>
                <p className="text-xs text-gray-500">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Customer Risk Table</h3>
          <span className="text-xs text-gray-400">{customers.length} total portfolios</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-gray-400 text-sm gap-2">
              <Loader2 className="animate-spin text-[#1e3a5f]" size={18} /> Loading risk analytics...
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center p-12 text-gray-400 text-sm">
              No customer risk assessments recorded yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    ['companyName', 'Customer'],
                    ['riskScore', 'Risk Score'],
                    ['outstanding', 'Credit Utilization'],
                    ['overdue', 'Overdue Amount'],
                    ['paymentBehavior', 'Payment Behavior'],
                    ['riskCategory', 'Risk Category'],
                    ['lastAssessment', 'Last Assessment'],
                  ].map(([k, l]) => (
                    <th key={k} onClick={() => handleSort(k)} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap cursor-pointer hover:text-gray-700 select-none">
                      {l}<SortIcon k={k} />
                    </th>
                  ))}
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(c => {
                  const util = getUtilizationPct(c.outstanding, c.creditLimit);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">{c.companyName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${c.riskScore > 50 ? 'bg-red-500' : c.riskScore > 20 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(c.riskScore, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700">{c.riskScore}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{util}%</td>
                      <td className="px-4 py-3 text-xs font-medium text-red-600">{formatINRCrore(c.overdue)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${c.paymentBehavior === 'POOR' || c.paymentBehavior === 'Poor' ? 'text-red-600' : c.paymentBehavior === 'FAIR' || c.paymentBehavior === 'Fair' ? 'text-yellow-600' : 'text-green-600'}`}>
                          {c.paymentBehavior}
                        </span>
                      </td>
                      <td className="px-4 py-3"><RiskIndicator score={c.riskScore} category={c.riskCategory} showScore={false} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.lastAssessment)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setViewCustomer(c)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                          <Eye size={13} />
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

      {/* Customer Risk Detail Modal */}
      <Modal isOpen={!!viewCustomer} onClose={() => setViewCustomer(null)} title={`Risk Detail: ${viewCustomer?.companyName}`} size="lg">
        {viewCustomer && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Risk Metrics</h4>
                {[
                  ['Risk Score', `${viewCustomer.riskScore}/100`],
                  ['Risk Category', viewCustomer.riskCategory],
                  ['Credit Limit', formatINRCrore(viewCustomer.creditLimit)],
                  ['Credit Utilization', `${getUtilizationPct(viewCustomer.outstanding, viewCustomer.creditLimit)}%`],
                  ['Outstanding Amount', formatINRCrore(viewCustomer.outstanding)],
                  ['Overdue Amount', formatINRCrore(viewCustomer.overdue)],
                  ['Payment Behavior', viewCustomer.paymentBehavior],
                  ['Last Assessment', formatDate(viewCustomer.lastAssessment)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-xs text-gray-500">{k}</span>
                    <span className="text-xs font-medium text-gray-800">{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Risk Breakdown</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={getRadarData(viewCustomer)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                    <Radar dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${viewCustomer.riskCategory === 'High' ? 'bg-red-50 border-red-200' : viewCustomer.riskCategory === 'Medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-xs font-medium ${viewCustomer.riskCategory === 'High' ? 'text-red-700' : viewCustomer.riskCategory === 'Medium' ? 'text-yellow-700' : 'text-green-700'}`}>
                {viewCustomer.riskCategory === 'High' ? '⚠️ High risk customer. Recommend immediate credit review and payment follow-up before approving further shipments.' :
                 viewCustomer.riskCategory === 'Medium' ? '⚡ Medium risk. Monitor payment behavior and credit utilization closely.' :
                 '✅ Low risk customer. Excellent payment history and conservative credit utilization.'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
