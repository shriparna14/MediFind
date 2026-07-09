import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, Bell, Heart, Shield, Settings, Activity, Plus, FileText, 
  ClipboardList, ShoppingCart, UserCheck, Menu, X, Sun, Moon, Trash2, 
  ShoppingBag, ArrowRight, Truck 
} from 'lucide-react';
import axios from 'axios';

export default function Navbar() {
  const { 
    user, logout, cart, removeFromCart, updateCartQty, clearCart, darkMode, setDarkMode 
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  
  // Checkout variables
  const [checkoutAddr, setCheckoutAddr] = useState(user?.address || '');
  const [checkoutPhone, setCheckoutPhone] = useState(user?.phone || '');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState('');

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === 'customer') {
      return (
        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-brand-50 text-brand-600 border border-brand-100 uppercase tracking-wide">
          👤 Patient Portal
        </span>
      );
    }
    if (user.role === 'pharmacy') {
      return (
        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-accent-50 text-accent-600 border border-accent-100 uppercase tracking-wide">
          🏥 Pharmacy Panel
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-warning-50 text-warning-600 border border-warning-100 uppercase tracking-wide">
        🛡️ Admin Desk
      </span>
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // Stripe-style links
  const getLinkClass = (path) => {
    const active = isActive(path);
    return `
      px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300
      ${active 
        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md shadow-slate-900/10' 
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
      }
    `;
  };

  // Bulk Checkout Actions
  const handleBulkReserve = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    setCheckoutSuccess('');
    try {
      // Loop and place reservation for each item in the cart
      for (const item of cart) {
        await axios.post('/reservations', {
          medicineId: item.id || item._id,
          quantity: item.quantity
        });
      }
      setCheckoutSuccess('Reservations placed! Pickup codes logged in dashboard.');
      clearCart();
      setTimeout(() => {
        setCheckoutSuccess('');
        setShowCartDrawer(false);
        navigate('/customer/reservations');
      }, 2500);
    } catch (err) {
      console.error(err);
      alert('Checkout failed: ' + (err.response?.data?.message || 'Server error'));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleBulkDelivery = async () => {
    if (cart.length === 0) return;
    if (!checkoutAddr || !checkoutPhone) {
      alert('Please specify delivery address and contact details.');
      return;
    }
    setCheckoutLoading(true);
    setCheckoutSuccess('');
    try {
      // Create a combined delivery order grouped by pharmacy
      // If items are from multiple pharmacies, we group them to make multiple dispatches
      const pharmacyGroups = {};
      cart.forEach(item => {
        const pId = item.pharmacyId || item.pharmacy?.id || item.pharmacy?._id;
        if (!pharmacyGroups[pId]) {
          pharmacyGroups[pId] = [];
        }
        pharmacyGroups[pId].push({
          medicineId: item.id || item._id,
          quantity: item.quantity
        });
      });

      for (const [pId, items] of Object.entries(pharmacyGroups)) {
        await axios.post('/orders', {
          pharmacyId: pId,
          items,
          deliveryAddress: checkoutAddr,
          deliveryPhone: checkoutPhone,
          deliveryType: 'emergency'
        });
      }

      setCheckoutSuccess('Emergency deliveries requested! Dispatching riders.');
      clearCart();
      setTimeout(() => {
        setCheckoutSuccess('');
        setShowCartDrawer(false);
        navigate('/customer/deliveries');
      }, 2500);
    } catch (err) {
      console.error(err);
      alert('Delivery request failed: ' + (err.response?.data?.message || 'Server error'));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const notifications = [
    { id: 1, text: 'Apollo Pharmacy approved your reservation request.', time: '2 mins ago' },
    { id: 2, text: 'Rider dispatched with Dolo 650 order.', time: '10 mins ago' },
  ];

  const getCartTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <nav className="sticky top-0 z-50 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-slate-100/80 dark:border-slate-800/80 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
                M
              </div>
              <span className="font-fraunces font-bold text-base tracking-tight text-slate-900 dark:text-white">
                Medi<span className="text-brand-500 font-sans italic font-extrabold">Find</span>
              </span>
            </Link>

            {user && getRoleBadge()}
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1.5">
            <Link to="/" className={getLinkClass('/')}>
              Search Finder
            </Link>

            {user && user.role === 'customer' && (
              <>
                <Link to="/customer/reservations" className={getLinkClass('/customer/reservations')}>
                  Reservations
                </Link>
                <Link to="/customer/deliveries" className={getLinkClass('/customer/deliveries')}>
                  Deliveries
                </Link>
                <Link to="/customer/prescriptions" className={getLinkClass('/customer/prescriptions')}>
                  Upload Prescriptions
                </Link>
              </>
            )}

            {user && user.role === 'pharmacy' && (
              <>
                <Link to="/pharmacy" className={getLinkClass('/pharmacy')}>
                  Overview
                </Link>
                <Link to="/pharmacy/inventory" className={getLinkClass('/pharmacy/inventory')}>
                  Inventory
                </Link>
                <Link to="/pharmacy/reservations" className={getLinkClass('/pharmacy/reservations')}>
                  Reservations
                </Link>
                <Link to="/pharmacy/deliveries" className={getLinkClass('/pharmacy/deliveries')}>
                  Dispatches
                </Link>
                <Link to="/pharmacy/prescriptions" className={getLinkClass('/pharmacy/prescriptions')}>
                  Verify Slips
                </Link>
              </>
            )}

            {user && user.role === 'admin' && (
              <>
                <Link to="/admin" className={getLinkClass('/admin')}>
                  Analytics
                </Link>
                <Link to="/admin/approvals" className={getLinkClass('/admin/approvals')}>
                  Verify Licenses
                </Link>
                <Link to="/admin/users" className={getLinkClass('/admin/users')}>
                  User Directory
                </Link>
                <Link to="/admin/deliveries" className={getLinkClass('/admin/deliveries')}>
                  Live Monitor
                </Link>
              </>
            )}
          </div>

          {/* Actions panel */}
          <div className="flex items-center gap-3">
            
            {/* Dark Mode Switcher */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm cursor-pointer"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500 fill-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Shopping Cart Drawer Trigger */}
            {(!user || user.role === 'customer') && (
              <button
                onClick={() => setShowCartDrawer(true)}
                className="p-2 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm relative cursor-pointer"
                title="Cart Drawer"
              >
                <ShoppingCart className="w-4 h-4" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
            )}

            {user && (
              <div className="relative">
                {/* Notifications Bell */}
                <button
                  onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
                  className="p-2 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm relative cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                </button>

                {/* Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl p-4 animate-fade-in z-50">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white border-b dark:border-slate-800 pb-2 mb-2">Live Notifications</h4>
                    <div className="flex flex-col gap-2.5">
                      {notifications.map(n => (
                        <div key={n.id} className="text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl transition-colors cursor-pointer">
                          <p>{n.text}</p>
                          <span className="text-[9px] text-slate-400 block mt-1 font-medium">{n.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Avatar */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                  className="flex items-center gap-2 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl hover:shadow-sm transition-all focus:outline-none cursor-pointer"
                >
                  <div className="w-6.5 h-6.5 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline-block">{user.name.split(' ')[0]}</span>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl p-2 animate-fade-in z-50">
                    <div className="px-3 py-2 border-b dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">{user.name}</span>
                      <span className="text-[10px] text-slate-400 block capitalize">{user.role} workspace</span>
                    </div>
                    <div className="mt-1 flex flex-col">
                      <Link
                        to={user.role === 'customer' ? '/customer/reservations' : user.role === 'pharmacy' ? '/pharmacy' : '/admin'}
                        className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 font-medium"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <Activity className="w-3.5 h-3.5 text-slate-400" />
                        Go to Dashboard
                      </Link>
                      <button
                        onClick={() => { handleLogout(); setShowProfileMenu(false); }}
                        className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors flex items-center gap-2 text-left font-semibold cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-full shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 transition-all duration-300"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Cart Drawer Flyout Panel */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCartDrawer(false)}></div>
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white dark:bg-slate-900 flex flex-col shadow-2xl animate-slide-in relative border-l dark:border-slate-800">
              
              <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-outfit font-extrabold text-base text-slate-950 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-brand-500" /> E-commerce Basket
                </h3>
                <button
                  onClick={() => setShowCartDrawer(false)}
                  className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items list */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                {checkoutSuccess && (
                  <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl flex items-center gap-2 animate-fade-in">
                    <Check className="w-4 h-4 shrink-0" />
                    <p className="text-xs font-bold">{checkoutSuccess}</p>
                  </div>
                )}

                {cart.length > 0 ? (
                  cart.map(item => (
                    <div key={item.id || item._id} className="p-4 bg-slate-50 dark:bg-slate-850 border dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-slate-800 dark:text-white truncate">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">Store: {item.pharmacy?.shopName || 'Store'}</p>
                        <span className="font-outfit font-extrabold text-xs text-slate-700 dark:text-slate-350 block mt-1.5">₹{item.price * item.quantity}</span>
                      </div>
                      
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center border dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
                          <button
                            onClick={() => updateCartQty(item.id || item._id, item.quantity - 1)}
                            className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="px-2 font-bold text-xs text-slate-800 dark:text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQty(item.id || item._id, item.quantity + 1)}
                            className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                        
                        <button
                          onClick={() => removeFromCart(item.id || item._id)}
                          className="p-2 border dark:border-slate-800 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
                    <ShoppingBag className="w-12 h-12 mb-3 text-slate-300" />
                    <span className="text-xs">Your health basket is empty. Add medicines from the search finder page!</span>
                  </div>
                )}
              </div>

              {/* Checkout details */}
              {cart.length > 0 && (
                <div className="p-6 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col gap-4">
                  
                  {/* Delivery details inputs */}
                  <div className="flex flex-col gap-2.5">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Delivery address</label>
                      <textarea
                        rows={1}
                        className="w-full text-xs p-2.5 border dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-850 text-slate-800 dark:text-white"
                        placeholder="Enter delivery destination..."
                        value={checkoutAddr}
                        onChange={(e) => setCheckoutAddr(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Contact Phone</label>
                      <input
                        type="text"
                        className="w-full text-xs p-2.5 border dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-850 text-slate-800 dark:text-white"
                        placeholder="Contact phone..."
                        value={checkoutPhone}
                        onChange={(e) => setCheckoutPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3 mt-1 text-slate-800 dark:text-white">
                    <span className="text-xs font-medium">Cart Subtotal:</span>
                    <span className="font-outfit font-extrabold text-base">₹{getCartTotal().toFixed(2)}</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleBulkReserve}
                      disabled={checkoutLoading}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <ClipboardList className="w-4 h-4" /> Reserve All for Counter Pickup
                    </button>
                    <button
                      onClick={handleBulkDelivery}
                      disabled={checkoutLoading}
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/10 disabled:opacity-50"
                    >
                      <Truck className="w-4 h-4" /> Request Express Delivery Dispatches
                    </button>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </nav>
  );
}
