import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, MessageCircle, Eye, Loader2, RefreshCw } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { formatINRCrore, formatDate } from '../utils/helpers';
import { ApprovalService, CreditRequestService } from '../services/api';
import { useApp } from '../context/AppContext';

export default function ApprovalsPage() {
  const { addToast, currentUser, switchAccount } = useApp();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewReq, setViewReq] = useState(null);
  const [action, setAction] = useState(null); // { type: 'approve'|'reject', req }
  const [comment, setComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await CreditRequestService.getAll();
      const list = res.data?.creditRequests || res.data?.requests || [];
      if (res.data?.success) {
        setRequests(list);
      }
    } catch (err) {
      console.error('Error fetching requests for approvals:', err);
      addToast('Failed to load credit approval requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const stats = useMemo(() => ({
    pending: requests.filter(r => (r.status || '').toUpperCase() === 'PENDING').length,
    approved: requests.filter(r => (r.status || '').toUpperCase() === 'APPROVED').length,
    rejected: requests.filter(r => (r.status || '').toUpperCase() === 'REJECTED').length,
  }), [requests]);

  async function handleAction() {
    if (!action) return;
    if (action.type === 'reject' && !rejectionReason.trim()) {
      addToast('Please provide a rejection reason', 'error');
      return;
    }
    if (action.type === 'approve' && !comment.trim()) {
      addToast('Please provide an approval comment', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (action.type === 'approve') {
        const res = await ApprovalService.approve(action.req.id, comment);
        if (res.data?.success) {
          addToast('Credit request approved successfully and limit updated', 'success');
        }
      } else {
        const res = await ApprovalService.reject(action.req.id, rejectionReason);
        if (res.data?.success) {
          addToast('Credit request rejected successfully', 'info');
        }
      }
      setAction(null);
      setComment('');
      setRejectionReason('');
      if (viewReq?.id === action.req.id) setViewReq(null);
      await loadRequests();
    } catch (err) {
      console.error('Action error:', err);
      const msg = err.response?.data?.message || 'Failed to process approval action';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function ApprovalDetailPanel({ req }) {
    if (!req) return null;
    const isPending = (req.status || '').toUpperCase() === 'PENDING';
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Credit Request Details</h4>
            {[
              ['Request ID', req.requestNumber || req.id],
              ['Customer', req.customer?.companyName || req.customerName || 'N/A'],
              ['Current Limit', formatINRCrore(req.currentLimit)],
              ['Requested Amount', formatINRCrore(req.requestedLimit || req.requestedAmount)],
              ['Additional Requested', formatINRCrore(req.additionalAmount || req.additionalRequested)],
              ['Current Exposure', formatINRCrore(req.currentExposure)],
              ['Projected Exposure', formatINRCrore(req.projectedExposure)],
              ['Risk Score', `${req.customer?.creditProfile?.riskScore || req.riskScore || 0}/100`],
              ['Submitted By', req.submittedBy?.name || req.submittedBy || 'Sales Representative'],
              ['Request Date', formatDate(req.requestDate || req.createdAt)],
              ['Validity Period', formatDate(req.validityPeriod || req.validityDate)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500">{k}</span>
                <span className="text-xs font-medium text-gray-800">{v}</span>
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Customer Profile</h4>
            {req.customer && [
              ['Credit Limit', formatINRCrore(req.customer.creditProfile?.approvedCreditLimit || req.currentLimit)],
              ['Category', req.customer.businessCategory],
              ['Payment Terms', req.customer.creditProfile?.paymentTerms || 'Net 30'],
              ['Payment Behavior', req.customer.creditProfile?.paymentBehavior || 'Good'],
              ['Risk Category', req.customer.creditProfile?.riskCategory || 'LOW'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500">{k}</span>
                <span className="text-xs font-medium text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Business Justification</p>
          <p className="text-xs text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">{req.businessJustification}</p>
        </div>
        {isPending && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setAction({ type: 'approve', req })}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <CheckCircle size={14} /> Approve
            </button>
            <button
              onClick={() => setAction({ type: 'reject', req })}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <XCircle size={14} /> Reject
            </button>
            <button
              onClick={() => {
                addToast('Request for additional information sent to submitter', 'info');
                setViewReq(null);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <MessageCircle size={14} /> Request Info
            </button>
          </div>
        )}
        {req.approvals && req.approvals.length > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-700">Approval Audit Trail</p>
            {req.approvals.map(a => (
              <div key={a.id} className="text-xs text-gray-600 flex justify-between border-t border-gray-200 pt-1">
                <span>{a.approver?.name || 'Manager'}: {a.action}</span>
                <span className="text-gray-400">{formatDate(a.actionDate)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Approval Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Finance manager queue for reviewing, approving or rejecting credit limit requests</p>
        </div>
        <button
          onClick={loadRequests}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {currentUser?.role !== 'ADMIN' && currentUser?.role !== 'FINANCE_MANAGER' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs shadow-sm">
          <div>
            <p className="font-semibold text-amber-950">Approval Authority Required</p>
            <p className="text-amber-800 mt-0.5">
              You are signed in as <strong>{currentUser?.name}</strong> with role <strong>[{currentUser?.role}]</strong>. Only <strong>Finance Managers</strong> and <strong>Administrators</strong> can approve or reject credit requests.
            </p>
          </div>
          <button
            onClick={() => switchAccount('manager@creditguard.com')}
            className="self-start sm:self-auto px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg text-xs transition-colors whitespace-nowrap shadow-sm"
          >
            Switch to Finance Manager 💼
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Approvals', value: stats.pending, color: 'text-yellow-600', border: 'border-l-yellow-500' },
          { label: 'Approved', value: stats.approved, color: 'text-green-600', border: 'border-l-green-500' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-600', border: 'border-l-red-500' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-xl border border-gray-100 border-l-4 ${s.border} shadow-sm p-4`}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-gray-400 text-sm gap-2">
              <Loader2 className="animate-spin text-[#1e3a5f]" size={18} /> Loading approvals queue...
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center p-12 text-gray-400 text-sm">
              No credit requests found in the system.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Request ID', 'Customer', 'Requested', 'Exposure', 'Risk Score', 'Submitted By', 'Date', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map(r => {
                  const isPending = (r.status || '').toUpperCase() === 'PENDING';
                  const customerName = r.customer?.companyName || r.customerName || 'N/A';
                  const riskScore = r.customer?.creditProfile?.riskScore || r.riskScore || 0;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-medium text-[#1e3a5f]">{r.requestNumber || r.id}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 max-w-[140px] truncate">{customerName}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-900">{formatINRCrore(r.requestedLimit || r.requestedAmount)}</td>
                      <td className="px-4 py-3 text-xs text-orange-600">{formatINRCrore(r.currentExposure)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${riskScore > 50 ? 'text-red-600' : riskScore > 20 ? 'text-yellow-600' : 'text-green-600'}`}>{riskScore}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.submittedBy?.name || r.submittedBy || 'Sales'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(r.requestDate || r.createdAt)}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewReq(r)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="View">
                            <Eye size={13} />
                          </button>
                          {isPending && (
                            <>
                              <button onClick={() => setAction({ type: 'approve', req: r })} className="p-1.5 text-gray-400 hover:text-green-600 rounded" title="Approve">
                                <CheckCircle size={13} />
                              </button>
                              <button onClick={() => setAction({ type: 'reject', req: r })} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Reject">
                                <XCircle size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={!!viewReq} onClose={() => setViewReq(null)} title={`Credit Request: ${viewReq?.requestNumber || viewReq?.id}`} size="xl">
        <ApprovalDetailPanel req={viewReq} />
      </Modal>

      <ConfirmationDialog
        isOpen={!!action}
        onConfirm={handleAction}
        onCancel={() => {
          setAction(null);
          setComment('');
          setRejectionReason('');
        }}
        title={action?.type === 'approve' ? 'Approve Credit Request' : 'Reject Credit Request'}
        message={`${action?.type === 'approve' ? 'Approve' : 'Reject'} credit request ${action?.req?.requestNumber || action?.req?.id} for ${action?.req?.customer?.companyName || action?.req?.customerName || ''}?`}
        confirmLabel={submitting ? 'Processing...' : action?.type === 'approve' ? 'Approve' : 'Reject'}
        confirmVariant={action?.type === 'approve' ? 'success' : 'danger'}
        disabled={submitting}
      >
        <div className="mb-4">
          {action?.type === 'approve' ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Approval Comment *</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                placeholder="Add formal approval comment (e.g. Approved based on clean payment record and verified financials)..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rejection Reason *</label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                placeholder="Explain the reason for rejection (e.g. Excessive overdue or high exposure risk)..."
              />
            </div>
          )}
        </div>
      </ConfirmationDialog>
    </div>
  );
}
