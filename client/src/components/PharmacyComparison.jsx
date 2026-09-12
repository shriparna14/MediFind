import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Star, ShoppingBag, Bookmark, Clock, X, ArrowUpDown } from 'lucide-react';
import { pharmacyService } from '../services/api';
import { useCart } from '../context/CartContext';

export default function PharmacyComparison({ medicineName, userCoords, onClose, onReserve }) {
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('best'); // 'best' | 'distance' | 'price' | 'rating'
  const { addToCart } = useCart();

  useEffect(() => {
    if (!medicineName) return;
    const fetchComparison = async () => {
      try {
        setLoading(true);
        const lat = userCoords?.lat || 12.9716;
        const lng = userCoords?.lng || 77.5946;
        const res = await pharmacyService.compare(medicineName, lat, lng);
        if (res.data.success) {
          setComparisonData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to compare pharmacies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComparison();
  }, [medicineName, userCoords]);

  const sortedData = [...comparisonData].sort((a, b) => {
    if (sortBy === 'distance') return a.pharmacy.distance - b.pharmacy.distance;
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === 'rating') return b.pharmacy.rating - a.pharmacy.rating;
    // Default best match
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
    return a.pharmacy.distance - b.pharmacy.distance;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-100 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 border border-brand-200 text-brand-700 flex items-center gap-1 font-mono-plex">
                <Sparkles className="w-3 h-3 text-brand-600" /> Smart Comparison Matrix
              </span>
            </div>
            <h2 className="font-fraunces font-bold text-xl text-slate-900 mt-1">
              Comparing availability for: <span className="text-brand-700">"{medicineName}"</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-mono-plex">
              <ArrowUpDown className="w-3.5 h-3.5 text-brand-600" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
              >
                <option value="best">Best Match</option>
                <option value="distance">Nearest Distance</option>
                <option value="price">Lowest Price</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 font-sans bg-slate-50">
          {loading ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Scanning real-time inventory across verified pharmacies...</p>
            </div>
          ) : sortedData.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              <p>No pharmacies currently list "{medicineName}" in inventory.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedData.map((item, idx) => {
                const isBest = idx === 0 && sortBy === 'best';
                return (
                  <div
                    key={item.medicineId}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                      isBest
                        ? 'bg-brand-50/40 border-brand-300 shadow-md ring-2 ring-brand-500/20'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-3">
                        {isBest ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-brand-500 text-white flex items-center gap-1 font-mono-plex">
                            ⭐ Best Match
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 font-mono-plex">
                            Option #{idx + 1}
                          </span>
                        )}

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono-plex ${
                          item.inStock
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {item.inStock ? `${item.stock} in Stock` : 'Out of Stock'}
                        </span>
                      </div>

                      {/* Pharmacy Info */}
                      <h3 className="font-fraunces font-bold text-base text-slate-900 leading-tight">{item.pharmacy.shopName}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                        <span className="truncate">{item.pharmacy.address}</span>
                      </p>

                      {/* Metrics Matrix */}
                      <div className="grid grid-cols-3 gap-2 my-4 py-3 px-2 bg-slate-50 rounded-2xl border border-slate-200/80 text-center font-mono-plex">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-medium">Distance</span>
                          <span className="text-xs font-bold text-slate-800">{item.pharmacy.distance} km</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-medium">Price</span>
                          <span className="text-xs font-bold text-brand-700">₹{item.price}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-medium">Rating</span>
                          <span className="text-xs font-bold text-amber-600 flex items-center justify-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {item.pharmacy.rating}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 space-y-1 mb-4 font-sans">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{item.pharmacy.openingHours}</span>
                        </div>
                        {item.genericName && (
                          <div className="text-[11px] text-slate-500">
                            Salt: <span className="text-brand-700 font-medium">{item.genericName} {item.strength}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => addToCart({ ...item, _id: item.medicineId }, item.pharmacy)}
                        disabled={!item.inStock}
                        className="py-2 px-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs shadow-brand-500/20 cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Cart
                      </button>

                      <button
                        onClick={() => {
                          if (onReserve) onReserve(item);
                          onClose();
                        }}
                        disabled={!item.inStock}
                        className="py-2 px-3 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-brand-600" /> Reserve
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
