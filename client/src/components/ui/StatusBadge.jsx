import React from 'react';

export default function StatusBadge({ status }) {
  const getBadgeStyle = () => {
    const s = String(status).toLowerCase();
    switch (s) {
      case 'approved':
      case 'completed':
      case 'delivered':
        return 'bg-brand-50 text-brand-700 border-brand-100';
      case 'pending':
      case 'accepted':
      case 'out-for-delivery':
        return 'bg-accent-50 text-accent-700 border-accent-100';
      case 'rejected':
      case 'cancelled':
        return 'bg-danger-50 text-danger-700 border-danger-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <span className={`px-2.5 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wide border font-mono-plex shrink-0 ${getBadgeStyle()}`}>
      {status}
    </span>
  );
}
