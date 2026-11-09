import React, { useState, useEffect } from 'react';
import { Plus, Download, Search, RefreshCw } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { formatINRCrore, formatDate, exportToCSV } from '../utils/helpers';
import { PaymentService, CustomerService, InvoiceService } from '../services/api';
import { useApp } from '../context/AppContext';

const PAGE_SIZE = 8;

export default function PaymentsPage() {
  const { addToast } = useApp();
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, totalAmount: 0, allocated: 0, unallocated: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [addModal, setAddModal] = useState(false);

  const [form, setForm] = useState({
    customerId: '',
    paymentAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'NEFT',
    transactionReference: '',
    invoiceAllocations: [], // [{ invoiceId, amount }]
  });

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await PaymentService.getAll({ search });
      if (res.data.success) {
        setPayments(res.data.payments);
        setStats(res.data.stats);
      }
    } catch (error) {
      addToast('Failed to load payments from database', 'error');
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
    loadPayments();
  }, [search]);

  useEffect(() => {
    loadCustomers();
  }, []);

  // When selected customer changes in modal, load their unpaid invoices
  useEffect(() => {
    async function loadCustomerInvoices() {
      if (!form.customerId) return;
      try {
        const res = await InvoiceService.getAll({ customerId: form.customerId, status: 'Unpaid' });
        if (res.data.success) {
          setCustomerInvoices(res.data.invoices);
        }
      } catch (e) { /* ignore */ }
    }
    loadCustomerInvoices();
  }, [form.customerId]);

  const totalPages = Math.ceil(payments.length / PAGE_SIZE) || 1;
  const paged = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleInvoiceAllocation(inv) {
    setForm(prev => {
      const exists = prev.invoiceAllocations.find(a => a.invoiceId === inv.id);
      if (exists) {
        return {
          ...prev,
          invoiceAllocations: prev.invoiceAllocations.filter(a => a.invoiceId !== inv.id),
        };
      } else {
        return {
          ...prev,
          invoiceAllocations: [...prev.invoiceAllocations, { invoiceId: inv.id, amount: inv.outstanding }],
        };
      }
    });
  }

  async function handleAdd() {
    if (!form.paymentAmount || !form.paymentDate || !form.transactionReference) {
      addToast('Please fill all required payment fields', 'error');
      return;
    }
    try {
      const res = await PaymentService.create(form);
      if (res.data.success) {
        setAddModal(false);
        addToast('Payment recorded and allocated in database', 'success');
        loadPayments();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to record payment', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Payment Management</h1>
            {loading && <RefreshCw size={14} className="text-blue-500 animate-spin" />}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} total payments processed in database</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(payments, 'payments.csv')} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 bg-white">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setAddModal(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152c4a]">
            <Plus size={14} /> Add Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Payments', value: stats.total, sub: 'All transactions', color: 'text-gray-900' },
          { label: 'Allocated', value: stats.allocated, sub: 'Fully mapped', color: 'text-green-600' },
          { label: 'Pending Allocation', value: stats.unallocated, sub: 'Unallocated', color: 'text-yellow-600' },
          { label: 'Total Received', value: formatINRCrore(stats.totalAmount), sub: 'Gross collections', color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search payments by number, reference, customer..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          />
        </div>
        <button onClick={loadPayments} title="Refresh" className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Payment No', 'Customer', 'Date', 'Method', 'Transaction Ref', 'Amount', 'Allocation Status'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-medium text-[#1e3a5f]">{p.paymentNumber || p.id}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{p.customerName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDate(p.paymentDate)}</td>
                  <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded font-medium">{p.paymentMethod}</span></td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{p.transactionReference}</td>
                  <td className="px-4 py-3 text-xs font-bold text-green-600">{formatINRCrore(p.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
              {!paged.length && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-sm text-gray-400">
                    {loading ? 'Retrieving payments...' : 'No payments found matching criteria'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} pageSize={PAGE_SIZE} totalItems={payments.length} />
      </div>

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Record Commercial Payment" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={form.customerId}
                onChange={e => setForm(f => ({ ...f, customerId: e.target.value, invoiceAllocations: [] }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              >
                {customers.map(c => <option key={c.id} value={c.id}>{c.companyName} ({c.customerCode})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                value={form.paymentAmount}
                onChange={e => setForm(f => ({ ...f, paymentAmount: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                placeholder="e.g. 1000000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={form.paymentMethod}
                onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              >
                {['NEFT', 'RTGS', 'IMPS', 'CHEQUE', 'UPI', 'DD'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Transaction Reference (UTR / Chq No) *</label>
              <input
                type="text"
                value={form.transactionReference}
                onChange={e => setForm(f => ({ ...f, transactionReference: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                placeholder="e.g. UTR26298001122"
              />
            </div>
          </div>

          {customerInvoices.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Select Invoices for Immediate Balance Allocation</label>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                {customerInvoices.map(inv => {
                  const isChecked = !!form.invoiceAllocations.find(a => a.invoiceId === inv.id);
                  return (
                    <label key={inv.id} className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleInvoiceAllocation(inv)}
                          className="accent-[#1e3a5f]"
                        />
                        <span className="text-xs font-medium text-gray-800">{inv.invoiceNumber}</span>
                        <span className="text-xs text-gray-500">Outstanding: {formatINRCrore(inv.outstanding)}</span>
                      </div>
                      <StatusBadge status={inv.status} />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setAddModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-2 text-sm font-medium bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152c4a]">Commit Payment</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
