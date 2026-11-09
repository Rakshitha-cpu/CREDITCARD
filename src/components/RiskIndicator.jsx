import React from 'react';
import { getRiskColor } from '../utils/helpers';

export default function RiskIndicator({ score, category, showScore = true }) {
  const { bg, text, dot } = getRiskColor(category);
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <span className={`text-xs font-medium ${text}`}>{category}</span>
      {showScore && <span className="text-xs text-gray-400">({score})</span>}
    </div>
  );
}
