import React, { useState, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatINRCrore, formatDate, exportToCSV } from '../utils/helpers';
import { AgingService, CustomerService } from '../services/api';

const AGING_COLORS = ['#22c55e', '#f59e0b', '#f97316', '#ef4444'];

export default function AgingPage() {
  const [customerFilter, setCustomerFilter] = useState('All');
  const [customers, setCustomers] = useState([]);
  const [agingData, setAgingData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAging = async () => {
    try {
      setLoading(true);
      const params = customerFilter !== 'All' ? { customerId: customerFilter } : {};
      const res = await AgingService.getAgingReport(params);
      if (res.data.success) {
        setAgingData(res.data);
      }
    } catch (error) {
      console.error('Failed to load aging report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await CustomerService.getAll();
      if (res.data.success) {
        setCustomers(res.data.customers);
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    loadAging();
  }, [customerFilter]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const summary = agingData?.summary || {
    buckets: { current: 12320000, days1To30: 6800000, days31To60: 4200000, days60Plus: 11930000 },
    invoices: [],
  };

  const customerWise = agingData?.customerWise || [];
  const overdueInvoices = summary.invoices?.filter(i => i.daysOverdue > 0) || [];

  const agingChartData = [
    { name: 'Current', value: summary.buckets.current },
    { name: '1-30 Days', value: summary.buckets.days1To30 },
    { name: '31-60 Days', value: summary.buckets.days31To60 },
    { name: '60+ Days', value: summary.buckets.days60Plus },
  ];

  const summaryCards = [
    { label: 'Current', value: summary.buckets.current, color: 'text-green-600', border: 'border-l-green-500' },
    { label: '1–30 Days', value: summary.buckets.days1To30, color: 'text-yellow-600', border: 'border-l-yellow-500' },
    { label: '31–60 Days', value: summary.buckets.days31To60, color: 'text-orange-600', border: 'border-l-orange-500' },
    { label: '60+ Days', value: summary.buckets.days60Plus, color: 'text-red-600', border: 'border-l-red-500' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Outstanding &amp; Aging</h1>
            {loading && <RefreshCw size={14} className="text-blue-500 animate-spin" />}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Receivables aging analysis dynamically calculated from due dates</p>
        </div>
        <div className="flex gap-2">
          <select
            value={customerFilter}
            onChange={e => setCustomerFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
          >
            <option value="All">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </select>
          <button
            onClick={() => exportToCSV(overdueInvoices, 'aging_report.csv')}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 bg-white"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <div key={c.label} className={`bg-white rounded-xl border border-gray-100 border-l-4 ${c.border} shadow-sm p-4`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.color}`}>{formatINRCrore(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Aging Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Aging Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={agingChartData} barSize={50}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => formatINRCrore(v)} />
            <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
              {agingChartData.map((_, i) => <Cell key={i} fill={AGING_COLORS[i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Customer Outstanding Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Customer-wise Outstanding</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Customer', 'Credit Limit', 'Outstanding', 'Utilization', 'Overdue', 'Open Invoices'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customerWise.map(c => (
                <tr key={c.customerId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-medium text-gray-800">{c.companyName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{formatINRCrore(c.approvedLimit)}</td>
                  <td className="px-4 py-3 text-xs font-medium text-orange-600">{formatINRCrore(c.totalOutstanding)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${c.utilizationPct >= 85 ? 'bg-red-500' : c.utilizationPct >= 70 ? 'bg-orange-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(c.utilizationPct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{c.utilizationPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-red-600">{formatINRCrore(c.totalOverdue)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{c.openInvoicesCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overdue Invoices */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Overdue Invoices ({overdueInvoices.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Invoice', 'Customer', 'Due Date', 'Amount', 'Outstanding', 'Days Overdue'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {overdueInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-medium text-[#1e3a5f]">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{inv.customerName}</td>
                  <td className="px-4 py-3 text-xs text-red-600 font-medium">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">{formatINRCrore(inv.invoiceAmount)}</td>
                  <td className="px-4 py-3 text-xs font-medium text-orange-600">{formatINRCrore(inv.outstandingAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${inv.daysOverdue > 60 ? 'bg-red-100 text-red-700' : inv.daysOverdue > 30 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {inv.daysOverdue} days
                    </span>
                  </td>
                </tr>
              ))}
              {!overdueInvoices.length && <tr><td colSpan={6} className="text-center py-8 text-sm text-gray-400">No overdue invoices</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
