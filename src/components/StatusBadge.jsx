import React from 'react';
import { getStatusColor } from '../utils/helpers';

export default function StatusBadge({ status }) {
  const { bg, text } = getStatusColor(status);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {status}
    </span>
  );
}
