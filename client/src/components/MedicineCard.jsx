import React from 'react';
import { MapPin, ShieldAlert, ShoppingBag, Truck, ShoppingCart } from 'lucide-react';

export default function MedicineCard({ 
  med, 
  onSelect, 
  onReserve, 
  onDelivery, 
  onAddToCart, 
  isSelected 
}) {
  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-3xl p-5 border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col gap-4 relative overflow-hidden
        ${isSelected ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-slate-100'}`}
    >
      {/* Prescription Label Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center rounded-full border border-brand-200/80 overflow-hidden text-[9px] font-bold font-mono-plex">
          <span className="px-1.5 py-0.5 bg-brand-500 text-white uppercase text-[8px]">Rx</span>
          <span className="px-2 py-0.5 bg-brand-50 text-brand-700 capitalize">{med.category}</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 px-2.5 py-0.5 bg-brand-50/50 text-brand-700 text-[9px] font-bold rounded-full border border-brand-100 scale-95 origin-right">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
            Verified Store
          </span>
        </div>
      </div>

      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="font-fraunces font-bold text-lg text-slate-900 leading-tight">{med.name}</h3>
          <p className="text-[10px] text-slate-400 font-mono-plex mt-1 uppercase tracking-wider">{med.brand}</p>
          
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-700">{med.pharmacy?.shopName}</span>
            <span className="text-slate-350">•</span>
            <span className="font-mono-plex text-[10px] text-slate-500">📍 {med.distance} km</span>
          </div>
        </div>

        <div className="text-right">
          <span className="font-mono-plex font-bold text-xl text-accent-500">₹{med.price}</span>
          <p className="text-[9px] text-slate-400 font-mono-plex mt-0.5">per unit</p>
        </div>
      </div>

      {/* Prescription style Tear line */}
      <div className="dashed-tear-line my-1.5 pt-3 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          {med.prescriptionRequired && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-danger-50 text-danger-500 rounded-full font-bold border border-danger-100 text-[10px] font-mono-plex">
              <ShieldAlert className="w-3.5 h-3.5 text-danger-500" />
              Rx Required
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border font-mono-plex
            ${med.stock > 10 
              ? 'bg-brand-50 text-brand-700 border-brand-100' 
              : med.stock > 0 
              ? 'bg-accent-50 text-accent-700 border-accent-100' 
              : 'bg-danger-50 text-danger-700 border-danger-100'}`}>
            {med.stock > 0 ? `Stock: ${med.stock} units` : 'Out of Stock'}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={(e) => { e.stopPropagation(); onAddToCart(med); }}
          disabled={med.stock <= 0}
          className="px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80 rounded-2xl transition-all disabled:opacity-40 flex items-center justify-center cursor-pointer"
          title="Add to Cart"
        >
          <ShoppingCart className="w-4.5 h-4.5 text-slate-500" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onReserve(med); }}
          disabled={med.stock <= 0}
          className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80 font-semibold py-2.5 rounded-2xl transition-all disabled:opacity-40 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
          Reserve Stock
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelivery(med); }}
          disabled={med.stock <= 0}
          className="flex-1 bg-danger-500 hover:bg-danger-600 text-white font-semibold py-2.5 rounded-2xl transition-all disabled:opacity-40 text-xs flex items-center justify-center gap-1.5 shadow-md shadow-danger-500/10 cursor-pointer"
        >
          <Truck className="w-3.5 h-3.5" />
          Emergency Delivery
        </button>
      </div>
    </div>
  );
}
