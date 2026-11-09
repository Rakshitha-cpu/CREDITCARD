import React, { useState, useEffect, useMemo } from 'react';
import { Search, Eye, Filter, Loader2, RefreshCw } from 'lucide-react';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { AuditService } from '../services/api';
import { useApp } from '../context/AppContext';

const PAGE_SIZE = 10;

export default function AuditLogsPage() {
  const { addToast } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [entityFilter, setEntityFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (userFilter !== 'All') params.user = userFilter;
      if (actionFilter !== 'All') params.action = actionFilter;
      if (entityFilter !== 'All') params.entity = entityFilter;
      if (search.trim()) params.search = search.trim();

      const res = await AuditService.getLogs(params);
      if (res.data?.success && res.data.logs) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      addToast('Failed to load audit logs from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [userFilter, actionFilter, entityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const users = useMemo(() => Array.from(new Set(logs.map(l => l.user).filter(Boolean))), [logs]);
  const actions = useMemo(() => Array.from(new Set(logs.map(l => l.action).filter(Boolean))), [logs]);
  const entities = useMemo(() => Array.from(new Set(logs.map(l => l.entity).filter(Boolean))), [logs]);

  const totalPages = Math.ceil(logs.length / PAGE_SIZE);
  const paged = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">System Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Immutable regulatory record of changes, credit approvals, and financial transactions</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Logs
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-48 flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search logs by keyword, ID, remark..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 text-xs font-medium bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152c4a]"
          >
            Search
          </button>
        </form>

        <select
          value={userFilter}
          onChange={e => { setUserFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
        >
          <option value="All">All Users</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
        >
          <option value="All">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={entityFilter}
          onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
        >
          <option value="All">All Entities</option>
          {entities.map(en => <option key={en} value={en}>{en}</option>)}
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-gray-400 text-sm gap-2">
              <Loader2 className="animate-spin text-[#1e3a5f]" size={18} /> Loading database audit records...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center p-12 text-gray-400 text-sm">
              No audit logs recorded for this query.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Log ID', 'User', 'Role', 'Action', 'Entity', 'Previous Value', 'New Value', 'Timestamp', 'Action'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono font-medium text-[#1e3a5f]">{log.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800">{log.user}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{log.role}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        log.action.includes('APPROV') ? 'bg-green-100 text-green-700' :
                        log.action.includes('REJECT') ? 'bg-red-100 text-red-700' :
                        log.action.includes('CREATE') ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 font-medium">{log.entity}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">{log.previousValue}</td>
                    <td className="px-4 py-3 text-xs text-gray-800 font-medium max-w-[140px] truncate">{log.newValue}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                        title="View Audit Details"
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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

      {/* Log Detail Modal */}
      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Audit Event Detail">
        {selectedLog && (
          <div className="space-y-3">
            {[
              ['Event ID', selectedLog.id],
              ['User', selectedLog.user],
              ['Role', selectedLog.role],
              ['Action', selectedLog.action],
              ['Entity Type', selectedLog.entity],
              ['Entity ID', selectedLog.entityId || 'N/A'],
              ['Previous Value', selectedLog.previousValue],
              ['New Value', selectedLog.newValue],
              ['Remarks', selectedLog.remarks || 'No additional remarks'],
              ['Timestamp', selectedLog.timestamp],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-gray-50 text-xs">
                <span className="text-gray-500 font-medium">{k}</span>
                <span className="text-gray-800 font-mono text-right max-w-xs break-all">{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
