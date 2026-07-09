import React from 'react';

export default function QuantityStepper({ value, onChange, min = 1, max = 99, label }) {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={value <= min}
          onClick={handleDecrement}
          className="w-10 h-10 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-40"
        >
          -
        </button>
        <span className="font-mono-plex font-bold text-slate-800 dark:text-white text-sm w-8 text-center">
          {value}
        </span>
        <button
          type="button"
          disabled={value >= max}
          onClick={handleIncrement}
          className="w-10 h-10 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-40"
        >
          +
        </button>
        {max !== undefined && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto font-mono-plex font-medium">
            Limit: {max} units
          </span>
        )}
      </div>
    </div>
  );
}
