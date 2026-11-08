import React from 'react';

export default function Badge({ children, variant = 'default', size = 'sm' }) {
  const sizeClasses = size === 'xs' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  const variantMap = {
    // Status
    filed: 'bg-blue-50 text-blue-700 border-blue-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    hearing: 'bg-purple-50 text-purple-700 border-purple-200',
    decided: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed: 'bg-slate-100 text-slate-700 border-slate-200',
    archived: 'bg-slate-100 text-slate-500 border-slate-200',

    // Priority
    urgent: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',

    // Processing Status
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    processing: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
    uploaded: 'bg-blue-50 text-blue-700 border-blue-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',

    // Hearing Status
    scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
    adjourned: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',

    // Default
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    default: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const selectedClass = variantMap[variant.toLowerCase()] || variantMap.default;

  return (
    <span className={`inline-flex items-center font-medium rounded-full border uppercase tracking-wider ${sizeClasses} ${selectedClass}`}>
      {children}
    </span>
  );
}
