import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, CreditCard, TrendingDown, AlertCircle,
  Wallet, AlertTriangle, Clock, Calendar, RefreshCw
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  Legend
} from 'recharts';
import DashboardCard from '../components/DashboardCard';
import StatusBadge from '../components/StatusBadge';
import { formatINRCrore, formatDate } from '../utils/helpers';
import { AnalyticsService } from '../services/api';
import { useApp } from '../context/AppContext';

const DATE_FILTERS = ['Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Custom Range'];
const RISK_COLORS = { 'Low Risk': '#22c55e', 'Medium Risk': '#f59e0b', 'High Risk': '#ef4444' };
const AGING_COLORS = ['#22c55e', '#f59e0b', '#f97316', '#ef4444'];

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs z-50">
      {label && <p className="font-medium text-gray-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? formatINRCrore(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { token } = useApp();
  const [dateFilter, setDateFilter] = useState('This Month');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchDashboard = async () => {
    if (!token && !localStorage.getItem('creditguard_token')) return;
    try {
      setLoading(true);
      const res = await AnalyticsService.getDashboard({ dateFilter });
      if (res.data.success) {
        setDashboardData(res.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard metrics from backend:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [dateFilter, token]);

  const kpis = dashboardData?.kpis || {
    totalCustomers: 15,
    activeCustomers: 14,
    totalCreditLimit: 63500000,
    totalOutstanding: 35250000,
    totalOverdue: 22930000,
    availableCredit: 28250000,
    highRiskCustomers: 5,
    pendingCreditRequests: 6,
  };

  const charts = dashboardData?.charts;
  const recentRequests = dashboardData?.tables?.recentRequests || [];
  const highRiskCustomers = dashboardData?.tables?.highRiskCustomers || [];

  const creditUtilData = charts?.creditUtilization
    ? [
        { name: 'Utilized', value: charts.creditUtilization.utilized },
        { name: 'Available', value: charts.creditUtilization.available },
      ]
    : [
        { name: 'Utilized', value: kpis.totalOutstanding },
        { name: 'Available', value: kpis.availableCredit },
      ];

  const riskDistData = charts?.riskDistribution || [
    { name: 'Low Risk', value: 3 },
    { name: 'Medium Risk', value: 7 },
    { name: 'High Risk', value: 5 },
  ];

  const agingData = charts?.aging || [
    { name: 'Current', value: 12320000 },
    { name: '1-30 Days', value: 6800000 },
    { name: '31-60 Days', value: 4200000 },
    { name: '60+ Days', value: 11930000 },
  ];

  const monthlyTrends = charts?.monthlyTrends || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Good morning, Finance Team 👋</h1>
            {loading && <RefreshCw size={14} className="text-blue-500 animate-spin" />}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Here&apos;s your live credit portfolio overview from PostgreSQL.</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-gray-400" />
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          >
            {DATE_FILTERS.map(f => <option key={f}>{f}</option>)}
          </select>
          <button
            onClick={fetchDashboard}
            title="Refresh from Database"
            className="p-2 text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-lg"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DashboardCard title="Total Customers" value={kpis.totalCustomers}
          subtitle="All registered B2B entities" icon={Users} iconBg="bg-blue-50 text-blue-600"
          trend="up" trendValue="+3" trendLabel="this quarter" />
        <DashboardCard title="Active Customers" value={kpis.activeCustomers}
          subtitle={`${kpis.totalCustomers - kpis.activeCustomers} inactive`} icon={UserCheck} iconBg="bg-green-50 text-green-600"
          trend="up" trendValue="93%" trendLabel="activity rate" />
        <DashboardCard title="Total Credit Limit" value={formatINRCrore(kpis.totalCreditLimit)}
          subtitle="Portfolio sanction limit" icon={CreditCard} iconBg="bg-purple-50 text-purple-600" />
        <DashboardCard title="Total Outstanding" value={formatINRCrore(kpis.totalOutstanding)}
          subtitle="Unpaid invoice exposure" icon={TrendingDown} iconBg="bg-orange-50 text-orange-600"
          trend="up" trendValue="+8.2%" trendLabel="vs last month" />
        <DashboardCard title="Total Overdue" value={formatINRCrore(kpis.totalOverdue)}
          subtitle="Past commercial due dates" icon={AlertCircle} iconBg="bg-red-50 text-red-600"
          trend="up" trendValue="+12%" trendLabel="vs last month" />
        <DashboardCard title="Available Credit" value={formatINRCrore(kpis.availableCredit)}
          subtitle="Unused permissible buffer" icon={Wallet} iconBg="bg-teal-50 text-teal-600" />
        <DashboardCard title="High-Risk Customers" value={kpis.highRiskCustomers}
          subtitle="Risk score > 50" icon={AlertTriangle} iconBg="bg-red-50 text-red-600"
          trend="up" trendValue="Critical" trendLabel="requires review" />
        <DashboardCard title="Pending Credit Requests" value={kpis.pendingCreditRequests}
          subtitle="Awaiting finance manager sign-off" icon={Clock} iconBg="bg-yellow-50 text-yellow-600" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Monthly Payment Trends" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="outstanding" stroke="#1e3a5f" strokeWidth={2} name="Outstanding" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="collections" stroke="#22c55e" strokeWidth={2} name="Collections" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="payments" stroke="#f59e0b" strokeWidth={2} name="Payments" dot={{ r: 3 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Credit Utilization">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={creditUtilData} cx="50%" cy="45%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value">
                <Cell fill="#1e3a5f" />
                <Cell fill="#e2e8f0" />
              </Pie>
              <Tooltip formatter={v => formatINRCrore(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center -mt-2">
            <p className="text-2xl font-bold text-gray-900">
              {kpis.totalCreditLimit > 0 ? ((kpis.totalOutstanding / kpis.totalCreditLimit) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-gray-500">of total credit utilized</p>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#1e3a5f]" /><span className="text-xs text-gray-500">Utilized</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-slate-200" /><span className="text-xs text-gray-500">Available</span></div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Customer Risk Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={riskDistData}
                cx="50%"
                cy="50%"
                outerRadius={75}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                fontSize={10}
              >
                {riskDistData.map((entry) => (
                  <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Invoice Aging Analysis" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agingData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                {agingData.map((_, i) => <Cell key={i} fill={AGING_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Outstanding Trends */}
      <ChartCard title="Outstanding Amount Trends">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={monthlyTrends}>
            <defs>
              <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="outstanding" stroke="#1e3a5f" fill="url(#outGrad)" strokeWidth={2} name="Outstanding" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Credit Requests */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-800">Recent Credit Requests</h3>
            <span className="text-xs text-gray-400">PostgreSQL Live Data</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Request No', 'Customer', 'Requested', 'Date', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentRequests.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium text-[#1e3a5f]">{r.requestNumber || r.id}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700 max-w-[140px] truncate">{r.customerName}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{formatINRCrore(r.requestedAmount)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(r.requestDate)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {!recentRequests.length && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-xs text-gray-400">No requests found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* High Risk Customers */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-800">High-Risk Customers</h3>
            <span className="text-xs text-red-600 font-medium">Critical Attention</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Customer', 'Credit Limit', 'Outstanding', 'Utilization', 'Overdue'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {highRiskCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-800 max-w-[120px] truncate">{c.companyName}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{formatINRCrore(c.creditLimit)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-800">{formatINRCrore(c.outstanding)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${Math.min(c.utilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-red-600 font-medium">{c.utilization}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium text-red-600">{formatINRCrore(c.overdue)}</td>
                  </tr>
                ))}
                {!highRiskCustomers.length && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-xs text-gray-400">No high risk customers detected</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
