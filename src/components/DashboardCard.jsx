import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function DashboardCard({ title, value, subtitle, icon: Icon, iconBg, trend, trendValue, trendLabel }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900 truncate">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
          {trendLabel && (
            <div className="mt-2 flex items-center gap-1">
              {trend === 'up' ? (
                <TrendingUp size={13} className="text-green-500" />
              ) : trend === 'down' ? (
                <TrendingDown size={13} className="text-red-500" />
              ) : (
                <Minus size={13} className="text-gray-400" />
              )}
              <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                {trendValue}
              </span>
              <span className="text-xs text-gray-400">{trendLabel}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${iconBg || 'bg-blue-50'} flex items-center justify-center ml-3`}>
            <Icon size={18} className="text-current" />
          </div>
        )}
      </div>
    </div>
  );
}
