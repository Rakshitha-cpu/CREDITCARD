import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

function ToastItem({ toast, onRemove }) {
  const icons = {
    success: <CheckCircle size={16} className="text-green-500 flex-shrink-0" />,
    error: <AlertCircle size={16} className="text-red-500 flex-shrink-0" />,
    warning: <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0" />,
    info: <Info size={16} className="text-blue-500 flex-shrink-0" />,
  };
  const borders = { success: 'border-l-green-500', error: 'border-l-red-500', warning: 'border-l-yellow-500', info: 'border-l-blue-500' };
  return (
    <div className={`toast-enter flex items-start gap-3 bg-white border border-gray-200 border-l-4 ${borders[toast.type] || 'border-l-blue-500'} rounded-lg shadow-lg px-4 py-3 min-w-[280px] max-w-sm`}>
      {icons[toast.type]}
      <p className="text-sm text-gray-700 flex-1">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={removeToast} />)}
    </div>
  );
}
