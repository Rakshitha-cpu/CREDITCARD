import React, { useState, useEffect } from 'react';
import { Plus, Download, Search, Eye, RefreshCw } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { formatINRCrore, formatDate, exportToCSV } from '../utils/helpers';
import { InvoiceService, CustomerService } from '../services/api';
import { useApp } from '../context/AppContext';

const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const { addToast } = useApp();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, paid: 0, unpaid: 0, overdue: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [addModal, setAddModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [form, setForm] = useState({ customerId: '', invoiceDate: '', dueDate: '', amount: '' });

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await InvoiceService.getAll({ search, status: statusFilter });
      if (res.data.success) {
        setInvoices(res.data.invoices);
        setStats(res.data.stats);
      }
    } catch (error) {
      addToast('Failed to load invoices from database', 'error');
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
    loadInvoices();
  }, [search, statusFilter]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const totalPages = Math.ceil(invoices.length / PAGE_SIZE) || 1;
  const paged = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleAdd() {
    if (!form.customerId || !form.invoiceDate || !form.dueDate || !form.amount) {
      addToast('Please fill all required invoice fields', 'error');
      return;
    }
    try {
      const res = await InvoiceService.create(form);
      if (res.data.success) {
        setAddModal(false);
        addToast('Invoice created and credit balance updated in PostgreSQL', 'success');
        loadInvoices();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to generate invoice', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Invoice Management</h1>
            {loading && <RefreshCw size={14} className="text-blue-500 animate-spin" />}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} total invoices tracked in database</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(invoices, 'invoices.csv')} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 bg-white">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setAddModal(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152c4a]">
            <Plus size={14} /> Add Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: stats.total, color: 'text-gray-900' },
          { label: 'Paid', value: stats.paid, color: 'text-green-600' },
          { label: 'Unpaid', value: stats.unpaid, color: 'text-blue-600' },
          { label: 'Overdue', value: stats.overdue, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by invoice number, customer..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
        >
          {['All', 'Paid', 'Unpaid', 'Overdue'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={loadInvoices} title="Refresh" className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Invoice No', 'Customer', 'Invoice Date', 'Due Date', 'Amount', 'Paid', 'Outstanding', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-medium text-[#1e3a5f]">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{inv.customerName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDate(inv.invoiceDate)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">{formatINRCrore(inv.amount)}</td>
                  <td className="px-4 py-3 text-xs text-green-600 font-medium">{formatINRCrore(inv.paidAmount)}</td>
                  <td className="px-4 py-3 text-xs text-orange-600 font-medium">{formatINRCrore(inv.outstanding)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => setViewInvoice(inv)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {!paged.length && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-sm text-gray-400">
                    {loading ? 'Retrieving invoices...' : 'No invoices found matching criteria'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} pageSize={PAGE_SIZE} totalItems={invoices.length} />
      </div>

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Create New Invoice">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={form.customerId}
              onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
            >
              {customers.map(c => <option key={c.id} value={c.id}>{c.companyName} ({c.customerCode})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Date</label>
            <input
              type="date"
              value={form.invoiceDate}
              onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Commercial Due Date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Amount (₹)</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              placeholder="e.g. 1500000"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setAddModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-2 text-sm font-medium bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152c4a]">Create Invoice</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice?.invoiceNumber || viewInvoice?.id}`}>
        {viewInvoice && (
          <div className="space-y-3">
            {[
              ['Invoice Number', viewInvoice.invoiceNumber],
              ['Customer', viewInvoice.customerName],
              ['Invoice Date', formatDate(viewInvoice.invoiceDate)],
              ['Due Date', formatDate(viewInvoice.dueDate)],
              ['Invoice Amount', formatINRCrore(viewInvoice.amount)],
              ['Paid Amount', formatINRCrore(viewInvoice.paidAmount)],
              ['Outstanding Balance', formatINRCrore(viewInvoice.outstanding)],
              ['Status', viewInvoice.status],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500">{k}</span>
                <span className="text-xs font-medium text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
