import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { formatINRCrore, formatDate } from '../utils/helpers';
import { CustomerService } from '../services/api';

const TABS = ['Overview', 'Invoices', 'Payments', 'Credit Requests', 'Risk History', 'Audit History'];

function InfoRow({ label, value, className = '' }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 w-36 flex-shrink-0">{label}</span>
      <span className={`text-xs font-medium text-gray-800 text-right flex-1 ${className}`}>{value || '—'}</span>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomer() {
      try {
        setLoading(true);
        const res = await CustomerService.getById(id);
        if (res.data.success) {
          setCustomer(res.data.customer);
        }
      } catch (error) {
        console.error('Failed to load customer profile:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomer();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-gray-500">
        <RefreshCw size={24} className="animate-spin text-blue-600 mb-2" />
        <p className="text-sm">Retrieving customer portfolio from PostgreSQL...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-10 text-center text-gray-400">
        <p>Customer account not found.</p>
        <button onClick={() => navigate('/customers')} className="mt-4 px-4 py-2 text-xs bg-[#1e3a5f] text-white rounded-lg">
          Back to Customers
        </button>
      </div>
    );
  }

  const profile = customer.creditProfile || {};
  const exposure = customer.exposure || {};
  const invoices = customer.invoices || [];
  const payments = customer.payments || [];
  const requests = customer.creditRequests || [];
  const riskHistory = customer.riskAssessments || [];
  const limitHistory = customer.creditLimitHist || [];

  const approvedLimit = Number(profile.approvedCreditLimit || 0);
  const currentExposure = Number(exposure.currentExposure || profile.currentExposure || 0);
  const availableCredit = Number(exposure.availableCredit || profile.availableCredit || 0);
  const util = approvedLimit > 0 ? ((currentExposure / approvedLimit) * 100).toFixed(1) : '0';

  const overdueInvoices = invoices.filter(i => new Date(i.dueDate) < new Date() && i.status !== 'PAID');
  const overdueTotal = overdueInvoices.reduce((s, i) => s + Number(i.outstandingAmount), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customers')} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{customer.companyName}</h1>
          <p className="text-sm text-gray-500">{customer.customerCode || customer.id} · {customer.businessCategory}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <StatusBadge status={customer.status === 'ACTIVE' ? 'Active' : 'Inactive'} />
          <StatusBadge status={profile.riskCategory === 'HIGH' ? 'High' : profile.riskCategory === 'MEDIUM' ? 'Medium' : 'Low'} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Credit Limit', value: formatINRCrore(approvedLimit), color: 'text-blue-600' },
          { label: 'Current Outstanding', value: formatINRCrore(currentExposure), color: 'text-orange-600' },
          { label: 'Available Credit', value: formatINRCrore(availableCredit), color: 'text-green-600' },
          { label: 'Overdue Amount', value: formatINRCrore(overdueTotal), color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Credit Utilization Bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Credit Utilization</span>
          <span className={`text-sm font-bold ${Number(util) >= 85 ? 'text-red-600' : Number(util) >= 70 ? 'text-orange-600' : 'text-green-600'}`}>{util}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${Number(util) >= 85 ? 'bg-red-500' : Number(util) >= 70 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(util, 100)}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">₹0</span>
          <span className="text-xs text-gray-400">{formatINRCrore(approvedLimit)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 overflow-x-auto">
          <div className="flex">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${tab === t ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          {tab === 'Overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Company Information</h4>
                <InfoRow label="Company Name" value={customer.companyName} />
                <InfoRow label="Customer Code" value={customer.customerCode} />
                <InfoRow label="Contact Person" value={customer.contactPerson} />
                <InfoRow label="Email" value={customer.email} />
                <InfoRow label="Phone" value={customer.phone} />
                <InfoRow label="City" value={customer.city} />
                <InfoRow label="GST Number" value={customer.gstNo} />
                <InfoRow label="Category" value={customer.businessCategory} />
                <InfoRow label="Customer Since" value={formatDate(customer.createdAt)} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Credit Profile</h4>
                <InfoRow label="Approved Limit" value={formatINRCrore(approvedLimit)} />
                <InfoRow label="Max Permissible Exposure" value={formatINRCrore(profile.maxPermissibleExposure)} />
                <InfoRow label="Current Exposure" value={formatINRCrore(currentExposure)} />
                <InfoRow label="Available Credit" value={formatINRCrore(availableCredit)} />
                <InfoRow label="Payment Terms" value={profile.paymentTerms} />
                <InfoRow label="Risk Score" value={`${profile.riskScore || 0}/100`} />
                <InfoRow label="Risk Category" value={profile.riskCategory} />
                <InfoRow label="Payment Behavior" value={profile.paymentBehavior} />
                <InfoRow label="Last Assessed" value={formatDate(profile.lastAssessmentDate)} />
              </div>
            </div>
          )}
          {tab === 'Invoices' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">{['Invoice', 'Date', 'Due Date', 'Amount', 'Paid', 'Outstanding', 'Status'].map(h => <th key={h} className="text-left text-xs font-medium text-gray-500 px-3 py-2">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="px-3 py-2.5 text-xs font-medium text-[#1e3a5f]">{inv.invoiceNumber}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{formatDate(inv.invoiceDate)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{formatDate(inv.dueDate)}</td>
                      <td className="px-3 py-2.5 text-xs font-medium">{formatINRCrore(inv.invoiceAmount)}</td>
                      <td className="px-3 py-2.5 text-xs text-green-600">{formatINRCrore(inv.paidAmount)}</td>
                      <td className="px-3 py-2.5 text-xs text-orange-600 font-medium">{formatINRCrore(inv.outstandingAmount)}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={inv.status === 'PAID' ? 'Paid' : inv.status === 'OVERDUE' ? 'Overdue' : 'Unpaid'} /></td>
                    </tr>
                  ))}
                  {!invoices.length && <tr><td colSpan={7} className="text-center py-8 text-sm text-gray-400">No invoices recorded</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'Payments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">{['Payment ID', 'Date', 'Method', 'Reference', 'Amount', 'Status'].map(h => <th key={h} className="text-left text-xs font-medium text-gray-500 px-3 py-2">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td className="px-3 py-2.5 text-xs font-medium text-[#1e3a5f]">{p.paymentNumber}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{formatDate(p.paymentDate)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{p.paymentMethod}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{p.transactionReference}</td>
                      <td className="px-3 py-2.5 text-xs font-bold text-green-600">{formatINRCrore(p.paymentAmount)}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={p.status === 'ALLOCATED' ? 'Allocated' : p.status === 'PARTIAL' ? 'Partial' : 'Unallocated'} /></td>
                    </tr>
                  ))}
                  {!payments.length && <tr><td colSpan={6} className="text-center py-8 text-sm text-gray-400">No payments recorded</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'Credit Requests' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">{['Request No', 'Current Limit', 'Requested', 'Justification', 'Date', 'Status'].map(h => <th key={h} className="text-left text-xs font-medium text-gray-500 px-3 py-2">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {requests.map(r => (
                    <tr key={r.id}>
                      <td className="px-3 py-2.5 text-xs font-medium text-[#1e3a5f]">{r.requestNumber}</td>
                      <td className="px-3 py-2.5 text-xs">{formatINRCrore(r.currentLimit)}</td>
                      <td className="px-3 py-2.5 text-xs font-medium">{formatINRCrore(r.requestedLimit)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[180px] truncate">{r.businessJustification}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{formatDate(r.requestDate)}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={r.status === 'APPROVED' ? 'Approved' : r.status === 'REJECTED' ? 'Rejected' : 'Pending'} /></td>
                    </tr>
                  ))}
                  {!requests.length && <tr><td colSpan={6} className="text-center py-8 text-sm text-gray-400">No credit requests</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'Risk History' && (
            <div className="space-y-3">
              {riskHistory.map((rh, i) => (
                <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Risk Score: {rh.riskScore}/100 ({rh.riskCategory})</p>
                    <p className="text-xs text-gray-500">{rh.calculationDetails || 'Automated risk evaluation'}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Assessed on: {formatDate(rh.assessedAt)}</p>
                  </div>
                  <StatusBadge status={rh.riskCategory === 'HIGH' ? 'High' : rh.riskCategory === 'MEDIUM' ? 'Medium' : 'Low'} />
                </div>
              ))}
              {!riskHistory.length && <p className="text-center py-8 text-sm text-gray-400">No prior risk assessments</p>}
            </div>
          )}
          {tab === 'Audit History' && (
            <div className="space-y-3">
              {limitHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-[#1e3a5f]">
                    {h.updatedBy[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-800">Limit Changed: {formatINRCrore(h.previousLimit)} → {formatINRCrore(h.newLimit)}</p>
                    <p className="text-xs text-gray-500">{h.reason}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(h.createdAt)} · By: {h.updatedBy}</p>
                  </div>
                </div>
              ))}
              {!limitHistory.length && <p className="text-center py-8 text-sm text-gray-400">No limit changes on record</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
