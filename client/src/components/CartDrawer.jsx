import React, { useState } from 'react';
import { ShoppingBag, X, Plus, Minus, Trash2, ShieldCheck, Zap, Truck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/api';

export default function CartDrawer() {
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartTotal,
    cartPharmacy,
    hasPrescriptionItems
  } = useCart();

  const { user } = useAuth();

  const [deliveryType, setDeliveryType] = useState('standard'); // 'standard' | 'emergency'
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' | 'test_payment'
  const [address, setAddress] = useState(user?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isCartOpen) return null;

  const emergencyFee = deliveryType === 'emergency' ? 50 : 0;
  const finalTotal = cartTotal + emergencyFee;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Please log in as a customer to place an order.');
      return;
    }
    if (!address.trim() || !phone.trim()) {
      setErrorMsg('Please enter both delivery address and contact phone number.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const payload = {
        pharmacyId: cartPharmacy.id,
        items: cartItems.map(item => ({
          medicineId: item.medicineId,
          quantity: item.quantity
        })),
        deliveryAddress: address.trim(),
        deliveryPhone: phone.trim(),
        deliveryType,
        paymentMethod,
        notes: notes.trim()
      };

      const res = await orderService.create(payload);
      if (res.data.success) {
        setOrderSuccess(res.data.data);
        clearCart();
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDrawer = () => {
    setIsCartOpen(false);
    setOrderSuccess(null);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 text-slate-900 flex flex-col shadow-2xl">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-fraunces font-bold text-lg text-slate-900">Your Medicine Cart</h2>
                {cartPharmacy && (
                  <p className="text-xs text-brand-700 font-medium">Ordering from: {cartPharmacy.name}</p>
                )}
              </div>
            </div>
            <button
              onClick={closeDrawer}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {orderSuccess ? (
              <div className="text-center py-8 space-y-4 font-sans">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-fraunces font-bold text-2xl text-slate-900">Order Confirmed!</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Order <span className="text-brand-700 font-mono-plex font-bold">#{String(orderSuccess._id || orderSuccess.id).slice(-6)}</span> has been dispatched to {orderSuccess.pharmacyId?.shopName || 'the pharmacy'}.
                </p>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Status:</span>
                    <span className="font-bold font-mono-plex text-emerald-700 uppercase">{orderSuccess.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Delivery Option:</span>
                    <span className="font-bold capitalize text-slate-800">{orderSuccess.deliveryType} Delivery</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Total Paid:</span>
                    <span className="font-bold font-mono-plex text-brand-700 text-sm">₹{orderSuccess.totalAmount}</span>
                  </div>
                </div>
                <button
                  onClick={closeDrawer}
                  className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl transition shadow-md shadow-brand-500/20 text-xs cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            ) : cartItems.length === 0 ? (
              <div className="text-center py-16 space-y-4 font-sans">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-fraunces font-bold text-base text-slate-700">Your cart is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Search medicines or ask MediFind AI to find stocks in pharmacies near you.
                </p>
              </div>
            ) : (
              <>
                {/* Items List */}
                <div className="space-y-3 font-sans">
                  {cartItems.map(item => (
                    <div
                      key={item.medicineId}
                      className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 truncate">{item.name}</h4>
                        <p className="text-xs text-slate-500">
                          {item.dosageForm} • {item.strength || item.brand}
                        </p>
                        <p className="text-sm font-bold font-mono-plex text-brand-700 mt-1">
                          ₹{(item.price * (1 - (item.discount || 0) / 100)).toFixed(2)}
                          {item.discount > 0 && (
                            <span className="text-xs text-slate-400 line-through ml-1.5 font-normal">
                              ₹{item.price}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1">
                        <button
                          onClick={() => updateQuantity(item.medicineId, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold font-mono-plex w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.medicineId, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => removeFromCart(item.medicineId)}
                        className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {hasPrescriptionItems && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>One or more items require a doctor's prescription. You can attach one or upload to the pharmacy queue.</span>
                  </div>
                )}

                {/* Checkout Options Form */}
                <form onSubmit={handleCheckout} className="space-y-4 pt-2 border-t border-slate-100 font-sans">
                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                      {errorMsg}
                    </div>
                  )}

                  {/* Delivery Mode */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2">Delivery Option</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryType('standard')}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                          deliveryType === 'standard'
                            ? 'bg-brand-50 border-brand-500 text-brand-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Truck className="w-3.5 h-3.5 text-brand-600" /> Standard
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1">Free delivery</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryType('emergency')}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                          deliveryType === 'emergency'
                            ? 'bg-rose-50 border-rose-500 text-rose-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Zap className="w-3.5 h-3.5 text-rose-600" /> Emergency
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1">Priority Rider (+₹50)</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cod')}
                        className={`p-2.5 rounded-2xl border text-xs font-bold text-left transition cursor-pointer ${
                          paymentMethod === 'cod'
                            ? 'bg-brand-50 border-brand-500 text-brand-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        💵 Cash on Delivery
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('test_payment')}
                        className={`p-2.5 rounded-2xl border text-xs font-bold text-left transition cursor-pointer ${
                          paymentMethod === 'test_payment'
                            ? 'bg-brand-50 border-brand-500 text-brand-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        💳 Instant Test Pay
                      </button>
                    </div>
                  </div>

                  {/* Address & Phone Inputs */}
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Delivery Address</label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House no, Street, Landmark"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Order Notes (Optional)</label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Special instructions for rider"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs font-sans">
                    <div className="flex justify-between text-slate-500">
                      <span>Items Subtotal:</span>
                      <span className="font-mono-plex font-bold text-slate-800">₹{cartTotal.toFixed(2)}</span>
                    </div>
                    {deliveryType === 'emergency' && (
                      <div className="flex justify-between text-rose-600">
                        <span>Emergency Priority Fee:</span>
                        <span className="font-mono-plex font-bold">+₹50.00</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
                      <span>Grand Total:</span>
                      <span className="font-mono-plex text-brand-700 text-base">₹{finalTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl transition shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 text-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      'Processing Order...'
                    ) : (
                      <>
                        Place Order (₹{finalTotal.toFixed(2)}) <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
