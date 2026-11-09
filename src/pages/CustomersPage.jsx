import React, { useState, useEffect } from 'react';
import { Plus, Download, Search, Eye, Edit, ToggleLeft, ToggleRight, Trash2, RefreshCw } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { formatINRCrore, exportToCSV } from '../utils/helpers';
import { CustomerService } from '../services/api';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 8;

function CustomerForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    companyName: '', contactPerson: '', email: '', phone: '',
    businessCategory: 'Manufacturing', creditLimit: 5000000, paymentTerms: 'Net 30',
    city: 'Mumbai', gstNo: '', address: '',
  });
  const categories = ['Manufacturing', 'Pharma', 'Automotive', 'Technology', 'Textiles', 'FMCG', 'Chemicals', 'Logistics', 'Construction', 'Electronics', 'Trading', 'Agriculture'];
  const terms = ['Net 15', 'Net 30', 'Net 45', 'Net 60'];
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Company Name *</label>
          <input type="text" value={form.companyName || ''} onChange={e => set('companyName', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person *</label>
          <input type="text" value={form.contactPerson || ''} onChange={e => set('contactPerson', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
          <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
          <input type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
          <input type="text" value={form.city || ''} onChange={e => set('city', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">GST Number</label>
          <input type="text" value={form.gstNo || ''} onChange={e => set('gstNo', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Business Category</label>
          <select value={form.businessCategory || form.category} onChange={e => set('businessCategory', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]">
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Payment Terms</label>
          <select value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]">
            {terms.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        {!initial && (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Approved Credit Limit (₹)</label>
            <input type="number" value={form.creditLimit || ''} onChange={e => set('creditLimit', Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]" placeholder="e.g. 5000000" />
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
        <textarea value={form.address || ''} onChange={e => set('address', e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] resize-none" />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={() => onSave(form)} className="px-4 py-2 text-sm font-medium bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152c4a]">Save Customer</button>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { addToast } = useApp();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [addModal, setAddModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [toggleCustomer, setToggleCustomer] = useState(null);
  const [deleteCustomer, setDeleteCustomer] = useState(null);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await CustomerService.getAll({
        search,
        riskCategory: riskFilter,
        status: statusFilter,
      });
      if (res.data.success) {
        setCustomers(res.data.customers);
      }
    } catch (error) {
      addToast('Failed to load customers from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search, riskFilter, statusFilter]);

  const totalPages = Math.ceil(customers.length / PAGE_SIZE) || 1;
  const paged = customers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleAdd(form) {
    try {
      const res = await CustomerService.create(form);
      if (res.data.success) {
        setAddModal(false);
        addToast('Customer registered successfully in PostgreSQL', 'success');
        loadCustomers();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to create customer', 'error');
    }
  }

  async function handleEdit(form) {
    try {
      const res = await CustomerService.update(editCustomer.id, form);
      if (res.data.success) {
        setEditCustomer(null);
        addToast('Customer updated successfully', 'success');
        loadCustomers();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update customer', 'error');
    }
  }

  async function handleToggle() {
    try {
      const res = await CustomerService.toggleStatus(toggleCustomer.id);
      if (res.data.success) {
        addToast(`Customer status changed to ${res.data.status}`, 'info');
        setToggleCustomer(null);
        loadCustomers();
      }
    } catch (error) {
      addToast('Failed to change customer status', 'error');
    }
  }

  async function handleDelete() {
    try {
      const res = await CustomerService.delete(deleteCustomer.id);
      if (res.data.success) {
        addToast(res.data.message || 'Customer deleted successfully', 'success');
        setDeleteCustomer(null);
        loadCustomers();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete customer', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Customer Management</h1>
            {loading && <RefreshCw size={14} className="text-blue-500 animate-spin" />}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{customers.filter(c => c.status === 'Active').length} active commercial accounts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(customers, 'customers.csv')} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 bg-white">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setAddModal(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152c4a]">
            <Plus size={14} /> Add Customer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by company name, contact, code, email..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          />
        </div>
        <select
          value={riskFilter}
          onChange={e => { setRiskFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
        >
          {['All', 'Low', 'Medium', 'High'].map(r => <option key={r} value={r}>Risk: {r}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
        >
          {['All', 'Active', 'Inactive'].map(s => <option key={s} value={s}>Status: {s}</option>)}
        </select>
        <button onClick={loadCustomers} title="Refresh" className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Customer Code', 'Company Name', 'Contact Person', 'Email', 'Category', 'Credit Limit', 'Risk Category', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-[#1e3a5f] font-medium">{c.customerCode || c.id}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-800 max-w-[170px]">
                    <button onClick={() => navigate(`/customers/${c.id}`)} className="hover:text-[#1e3a5f] hover:underline text-left truncate block">
                      {c.companyName}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{c.contactPerson}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">{c.email}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{c.businessCategory}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-800">{formatINRCrore(c.creditLimit)}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.riskCategory} /></td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/customers/${c.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="View Details">
                        <Eye size={13} />
                      </button>
                      <button onClick={() => setEditCustomer(c)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Edit Customer">
                        <Edit size={13} />
                      </button>
                      <button onClick={() => setToggleCustomer(c)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="Toggle Status">
                        {c.status === 'Active' ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                      </button>
                      <button onClick={() => setDeleteCustomer(c)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete Customer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!paged.length && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-sm text-gray-400">
                    {loading ? 'Connecting to database...' : 'No customers found matching your criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} pageSize={PAGE_SIZE} totalItems={customers.length} />
      </div>

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add New Customer" size="lg">
        <CustomerForm onSave={handleAdd} onClose={() => setAddModal(false)} />
      </Modal>

      <Modal isOpen={!!editCustomer} onClose={() => setEditCustomer(null)} title="Edit Customer" size="lg">
        {editCustomer && <CustomerForm initial={editCustomer} onSave={handleEdit} onClose={() => setEditCustomer(null)} />}
      </Modal>

      <ConfirmationDialog
        isOpen={!!toggleCustomer}
        onConfirm={handleToggle}
        onCancel={() => setToggleCustomer(null)}
        title={`${toggleCustomer?.status === 'Active' ? 'Deactivate' : 'Activate'} Customer`}
        message={`Are you sure you want to ${toggleCustomer?.status === 'Active' ? 'deactivate' : 'activate'} ${toggleCustomer?.companyName}?`}
        confirmLabel={toggleCustomer?.status === 'Active' ? 'Deactivate' : 'Activate'}
        confirmVariant={toggleCustomer?.status === 'Active' ? 'danger' : 'success'}
      />

      <ConfirmationDialog
        isOpen={!!deleteCustomer}
        onConfirm={handleDelete}
        onCancel={() => setDeleteCustomer(null)}
        title="Delete Customer"
        message={`Are you sure you want to delete customer '${deleteCustomer?.companyName}'? This action cannot be undone.`}
        confirmLabel="Delete Customer"
        confirmVariant="danger"
      />
    </div>
  );
}
