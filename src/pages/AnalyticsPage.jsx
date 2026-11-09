import React, { useState, useEffect } from 'react';
import { Download, Printer, Calendar, Loader2, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import { formatINRCrore, exportToCSV, getUtilizationPct } from '../utils/helpers';
import StatusBadge from '../components/StatusBadge';
import { AnalyticsService, AgingService, CustomerService } from '../services/api';
import { useApp } from '../context/AppContext';

const RISK_COLORS = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' };
const AGING_COLORS = ['#22c55e', '#f59e0b', '#f97316', '#ef4444'];

export default function AnalyticsPage() {
  const { token, addToast } = useApp();
  const [dateRange, setDateRange] = useState('Last 6 Months');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [agingData, setAgingData] = useState([]);
  const [customers, setCustomers] = useState([]);

  const fetchData = async () => {
    if (!token && !localStorage.getItem('creditguard_token')) return;
    try {
      setLoading(true);
      const [dashRes, agingRes, custRes] = await Promise.all([
        AnalyticsService.getDashboard({ dateRange }),
        AgingService.getAgingReport(),
        CustomerService.getAll(),
      ]);

      if (dashRes.data?.success) {
        setDashboardData(dashRes.data);
      }
      if (agingRes.data?.success && agingRes.data.summary) {
        const b = agingRes.data.summary.buckets || {};
        setAgingData([
          { name: 'Current', value: b.current || 0 },
          { name: '1-30 Days', value: b.days1To30 || 0 },
          { name: '31-60 Days', value: b.days31To60 || 0 },
          { name: '60+ Days', value: b.days60Plus || 0 },
        ]);
      }
      if (custRes.data?.success) {
        setCustomers(custRes.data.customers || []);
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      if (err.response?.status !== 401) {
        addToast('Failed to load financial analytics', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, token]);

  const monthlyTrends = dashboardData?.monthlyTrends || [
    { month: 'Jun', outstanding: 18000000, collections: 14000000 },
    { month: 'Jul', outstanding: 21000000, collections: 17500000 },
    { month: 'Aug', outstanding: 19500000, collections: 16000000 },
    { month: 'Sep', outstanding: 24000000, collections: 19000000 },
    { month: 'Oct', outstanding: 22000000, collections: 18500000 },
    { month: 'Nov', outstanding: 26500000, collections: 21000000 },
  ];

  const riskDistData = dashboardData?.riskDistribution || [
    { name: 'Low', value: customers.filter(c => (c.creditProfile?.riskCategory || c.riskCategory) === 'LOW' || (c.creditProfile?.riskCategory || c.riskCategory) === 'Low').length },
    { name: 'Medium', value: customers.filter(c => (c.creditProfile?.riskCategory || c.riskCategory) === 'MEDIUM' || (c.creditProfile?.riskCategory || c.riskCategory) === 'Medium').length },
    { name: 'High', value: customers.filter(c => (c.creditProfile?.riskCategory || c.riskCategory) === 'HIGH' || (c.creditProfile?.riskCategory || c.riskCategory) === 'High').length },
  ];

  const customerUtilData = customers.slice(0, 10).map(c => {
    const limit = Number(c.creditProfile?.approvedCreditLimit || c.creditLimit || 0);
    const out = Number(c.outstanding || 0);
    return {
      name: c.companyName.split(' ')[0],
      util: limit > 0 ? parseFloat(((out / limit) * 100).toFixed(1)) : 0,
    };
  });

  const top10HighRisk = [...customers]
    .sort((a, b) => (b.creditProfile?.riskScore || b.riskScore || 0) - (a.creditProfile?.riskScore || a.riskScore || 0))
    .slice(0, 10);

  function handlePrint() {
    window.print();
  }

  function handleExport() {
    exportToCSV(customers.map(c => ({
      Customer: c.companyName,
      Category: c.businessCategory,
      CreditLimit: c.creditProfile?.approvedCreditLimit || c.creditLimit,
      Outstanding: c.outstanding,
      RiskScore: c.creditProfile?.riskScore || c.riskScore,
      RiskCategory: c.creditProfile?.riskCategory || c.riskCategory,
    })), 'creditguard_analytics_summary.csv');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics &amp; Financial Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Comprehensive intelligence on payment performance, exposure trends and credit risk</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700">
            <Calendar size={14} className="text-gray-400" />
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option>Last 30 Days</option>
              <option>Last 6 Months</option>
              <option>Year to Date</option>
              <option>Last 12 Months</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Download size={13} /> Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#152c4a]"
          >
            <Printer size={13} /> Print Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24 text-gray-400 text-sm gap-2">
          <Loader2 className="animate-spin text-[#1e3a5f]" size={20} /> Compiling real-time financial portfolio analytics...
        </div>
      ) : (
        <>
          {/* Row 1: Monthly Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Monthly Outstanding vs Collections</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `₹${(v / 1e7).toFixed(1)}Cr`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => [formatINRCrore(v)]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="outstanding" name="Outstanding" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="collections" name="Collections" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Customer Credit Utilization (%)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={customerUtilData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis unit="%" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => [`${v}%`, 'Utilization']} />
                  <Bar dataKey="util" name="Utilization %" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Distribution Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Aging Breakdown Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agingData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={v => `₹${(v / 1e7).toFixed(1)}Cr`} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={v => [formatINRCrore(v), 'Amount']} />
                  <Bar dataKey="value" name="Amount" radius={[0, 4, 4, 0]}>
                    {agingData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={AGING_COLORS[index % AGING_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Risk Category Distribution</h3>
              <div className="flex items-center justify-around h-[200px]">
                <ResponsiveContainer width="55%" height="100%">
                  <PieChart>
                    <Pie data={riskDistData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                      {riskDistData.map(entry => (
                        <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {riskDistData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS[d.name] || '#94a3b8' }} />
                      <span className="text-gray-600 font-medium">{d.name} Risk:</span>
                      <span className="font-bold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top 10 High Risk Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Top High-Risk Accounts</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Customer', 'Category', 'Credit Limit', 'Outstanding', 'Utilization %', 'Risk Score', 'Category'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {top10HighRisk.map(c => {
                    const limit = Number(c.creditProfile?.approvedCreditLimit || c.creditLimit || 0);
                    const out = Number(c.outstanding || 0);
                    const util = limit > 0 ? ((out / limit) * 100).toFixed(1) : 0;
                    const rScore = c.creditProfile?.riskScore || c.riskScore || 0;
                    const rCat = c.creditProfile?.riskCategory || c.riskCategory || 'LOW';
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-medium text-gray-900">{c.companyName}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{c.businessCategory}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{formatINRCrore(limit)}</td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-900">{formatINRCrore(out)}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-800">{util}%</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold ${rScore > 50 ? 'text-red-600' : rScore > 20 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {rScore}
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={rCat} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
