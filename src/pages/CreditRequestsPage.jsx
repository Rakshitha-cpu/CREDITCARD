import React, { useState, useEffect } from 'react';
import { Plus, Eye, RefreshCw, Calculator, ShieldAlert, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { formatINRCrore, formatDate } from '../utils/helpers';
import { CreditRequestService, CustomerService } from '../services/api';
import { useApp } from '../context/AppContext';

const PAGE_SIZE = 8;

export default function CreditRequestsPage() {
  const { addToast } = useApp();
  const [requests, setRequests] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [page, setPage] = useState(1);
  const [addModal, setAddModal] = useState(false);
  const [viewReq, setViewReq] = useState(null);

  // Live Calculator State
  const [showCalculator, setShowCalculator] = useState(true);
  const [calcInput, setCalcInput] = useState({
    customerId: '',
    approvedCreditLimit: 100000,
    existingOutstanding: 60000,
    newOrderAmount: 50000,
  });
  const [calcResult, setCalcResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const [form, setForm] = useState({
    customerId: '',
    additionalAmount: '',
    businessJustification: '',
    validityPeriod: '',
  });

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await CreditRequestService.getAll();
      if (res.data.success) {
        setRequests(res.data.requests);
        setStats(res.data.stats);
      }
    } catch (error) {
      addToast('Failed to load credit requests from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await CustomerService.getAll();
      if (res.data.success) {
        setCustomers(res.data.customers);
        if (res.data.customers.length > 0 && !form.customerId) {
          setForm(f => ({ ...f, customerId: res.data.customers[0].id }));
        }
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    loadRequests();
    loadCustomers();
    // Run initial simulation calculation
    runSimulation();
  }, []);

  const runSimulation = async () => {
    try {
      setCalculating(true);
      const res = await CreditRequestService.simulate(calcInput);
      if (res.data.success) {
        setCalcResult(res.data.simulation);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setCalculating(false);
    }
  };

  const handleCustomerSelectForCalc = (cId) => {
    const cust = customers.find(c => c.id === cId);
    if (cust) {
      const limit = Number(cust.creditProfile?.approvedCreditLimit || cust.creditLimit || 0);
      const out = Number(cust.outstanding || 0);
      setCalcInput({
        customerId: cust.id,
        approvedCreditLimit: limit,
        existingOutstanding: out,
        newOrderAmount: calcInput.newOrderAmount || 50000,
      });
    } else {
      setCalcInput(prev => ({ ...prev, customerId: '' }));
    }
  };

  const totalPages = Math.ceil(requests.length / PAGE_SIZE) || 1;
  const paged = requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleAdd() {
    if (!form.additionalAmount || !form.businessJustification || !form.validityPeriod) {
      addToast('Please fill all fields', 'error');
      return;
    }
    try {
      const res = await CreditRequestService.create(form);
      if (res.data.success) {
        setAddModal(false);
        addToast('Credit request submitted for Finance Manager review', 'success');
        setForm({ customerId: customers[0]?.id || '', additionalAmount: '', businessJustification: '', validityPeriod: '' });
        loadRequests();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to submit credit request', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Credit Requests &amp; Decision Engine</h1>
            {loading && <RefreshCw size={14} className="text-blue-500 animate-spin" />}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Automated credit limit increase evaluations, exposure projection, and risk authorization queue</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Calculator size={14} /> {showCalculator ? 'Hide Pre-Check' : 'Credit Pre-Check'}
          </button>
          <button
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152c4a]"
          >
            <Plus size={14} /> New Credit Request
          </button>
        </div>
      </div>

      {/* Interactive Credit Risk & Exposure Calculation Pre-Check Card */}
      {showCalculator && (
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5 space-y-4 bg-gradient-to-r from-blue-50/30 to-indigo-50/10">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] text-white flex items-center justify-center font-bold">
                <Calculator size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Credit Risk &amp; Exposure Calculation Engine (Live Simulator)</h3>
                <p className="text-xs text-gray-500">Test what-if order scenarios against approved credit limits and risk policies</p>
              </div>
            </div>
            <button
              onClick={runSimulation}
              disabled={calculating}
              className="px-3 py-1.5 text-xs font-semibold bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152c4a] disabled:opacity-50"
            >
              {calculating ? 'Evaluating...' : 'Recalculate Exposure'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Customer (Optional)</label>
              <select
                value={calcInput.customerId}
                onChange={e => handleCustomerSelectForCalc(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              >
                <option value="">-- Custom Simulation --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Approved Credit Limit (₹)</label>
              <input
                type="number"
                value={calcInput.approvedCreditLimit}
                onChange={e => setCalcInput({ ...calcInput, approvedCreditLimit: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                placeholder="100000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Existing Outstanding (₹)</label>
              <input
                type="number"
                value={calcInput.existingOutstanding}
                onChange={e => setCalcInput({ ...calcInput, existingOutstanding: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                placeholder="60000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Order Amount (₹)</label>
              <input
                type="number"
                value={calcInput.newOrderAmount}
                onChange={e => setCalcInput({ ...calcInput, newOrderAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                placeholder="50000"
              />
            </div>
          </div>

          {/* Engine Outputs */}
          {calcResult && (
            <div className="pt-2 border-t border-gray-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-2xs">
                  <span className="text-[11px] text-gray-500">Projected Exposure</span>
                  <p className="text-base font-bold text-gray-900 mt-0.5">
                    ₹{Number(calcResult.projectedExposure).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-2xs">
                  <span className="text-[11px] text-gray-500">Excess Exposure</span>
                  <p className={`text-base font-bold mt-0.5 ${calcResult.excessExposure > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{Number(calcResult.excessExposure).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-2xs">
                  <span className="text-[11px] text-gray-500">Current Available Credit</span>
                  <p className="text-base font-bold text-blue-700 mt-0.5">
                    ₹{Number(calcResult.availableCredit).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-2xs">
                  <span className="text-[11px] text-gray-500">Projected Utilization</span>
                  <p className={`text-base font-bold mt-0.5 ${calcResult.projectedUtilization > 100 ? 'text-red-600' : calcResult.projectedUtilization >= 85 ? 'text-orange-600' : 'text-gray-900'}`}>
                    {calcResult.projectedUtilization}%
                  </p>
                </div>
              </div>

              {/* Decision Pill Banner */}
              <div className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                calcResult.decision === 'ELIGIBLE' ? 'bg-green-50 border-green-200 text-green-900' :
                calcResult.decision === 'WARNING' ? 'bg-yellow-50 border-yellow-200 text-yellow-900' :
                calcResult.decision === 'CREDIT_BLOCKED' ? 'bg-purple-50 border-purple-200 text-purple-900' :
                'bg-red-50 border-red-200 text-red-900'
              }`}>
                <div className="flex items-center gap-2">
                  {calcResult.decision === 'ELIGIBLE' && <CheckCircle size={16} className="text-green-600 flex-shrink-0" />}
                  {calcResult.decision === 'WARNING' && <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0" />}
                  {calcResult.decision === 'APPROVAL_REQUIRED' && <ShieldAlert size={16} className="text-red-600 flex-shrink-0" />}
                  {calcResult.decision === 'CREDIT_BLOCKED' && <AlertCircle size={16} className="text-purple-600 flex-shrink-0" />}
                  <span className="font-semibold">{calcResult.reason || calcResult.explanation}</span>
                </div>
                <span className={`px-2.5 py-1 rounded font-bold uppercase tracking-wider text-[11px] ${
                  calcResult.decision === 'ELIGIBLE' ? 'bg-green-600 text-white' :
                  calcResult.decision === 'WARNING' ? 'bg-yellow-600 text-white' :
                  calcResult.decision === 'CREDIT_BLOCKED' ? 'bg-purple-700 text-white' :
                  'bg-red-600 text-white'
                }`}>
                  {calcResult.decision.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: stats.total, color: 'text-gray-900' },
          { label: 'Pending Approvals', value: stats.pending, color: 'text-yellow-600' },
          { label: 'Approved Requests', value: stats.approved, color: 'text-green-600' },
          { label: 'Rejected Requests', value: stats.rejected, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Request No', 'Customer', 'Current Limit', 'Requested', 'Exposure', 'Justification', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-medium text-[#1e3a5f]">{r.requestNumber || r.id}</td>
                  <td className="px-4 py-3 text-xs text-gray-700 max-w-[120px] truncate">{r.customerName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{formatINRCrore(r.currentLimit)}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">{formatINRCrore(r.requestedLimit)}</td>
                  <td className="px-4 py-3 text-xs text-orange-600">{formatINRCrore(r.currentExposure)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{r.businessJustification}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(r.requestDate)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setViewReq(r)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                    >
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* New Request Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Submit Credit Limit Request">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer *</label>
            <select
              value={form.customerId}
              onChange={e => setForm({ ...form, customerId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Additional Amount Requested (₹) *</label>
            <input
              type="number"
              value={form.additionalAmount}
              onChange={e => setForm({ ...form, additionalAmount: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              placeholder="e.g. 500000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Validity Period *</label>
            <input
              type="date"
              value={form.validityPeriod}
              onChange={e => setForm({ ...form, validityPeriod: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Business Justification *</label>
            <textarea
              rows={3}
              value={form.businessJustification}
              onChange={e => setForm({ ...form, businessJustification: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] resize-none"
              placeholder="Explain reason for credit enhancement (e.g. Surge seasonal order, verified letter of credit)..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => setAddModal(false)}
              className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-xs font-medium bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152c4a]"
            >
              Submit Request
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!viewReq} onClose={() => setViewReq(null)} title={`Request: ${viewReq?.requestNumber || viewReq?.id}`}>
        {viewReq && (
          <div className="space-y-3">
            {[
              ['Request Number', viewReq.requestNumber || viewReq.id],
              ['Customer', viewReq.customerName],
              ['Current Limit', formatINRCrore(viewReq.currentLimit)],
              ['Requested Limit', formatINRCrore(viewReq.requestedLimit)],
              ['Additional Requested', formatINRCrore(viewReq.additionalAmount)],
              ['Current Exposure', formatINRCrore(viewReq.currentExposure)],
              ['Projected Exposure', formatINRCrore(viewReq.projectedExposure)],
              ['Submitted By', viewReq.submittedBy],
              ['Request Date', formatDate(viewReq.requestDate)],
              ['Validity Period', formatDate(viewReq.validityPeriod)],
              ['Status', viewReq.status],
              ['Business Justification', viewReq.businessJustification],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 text-xs">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-900 text-right max-w-xs">{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
