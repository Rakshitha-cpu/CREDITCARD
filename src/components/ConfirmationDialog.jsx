import React from 'react';

export default function ConfirmationDialog({ isOpen, onConfirm, onCancel, title, message, confirmLabel = 'Confirm', confirmVariant = 'danger', children }) {
  if (!isOpen) return null;
  const confirmClass = confirmVariant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-navy-700 hover:bg-navy-800 text-white bg-[#1e3a5f] hover:bg-[#152c4a]';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        {children}
        <div className="flex gap-3 justify-end mt-4">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
