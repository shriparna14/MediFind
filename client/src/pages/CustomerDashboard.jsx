import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/ui/StatusBadge';
import ChatDrawer from '../components/ChatDrawer';
import { 
  reservationService, orderService, prescriptionService, pharmacyService 
} from '../services/api';
import { 
  FileText, ClipboardList, ShoppingBag, Truck, Calendar, ShieldAlert, AlertCircle, 
  RefreshCw, UploadCloud, MapPin, Eye, Search, Heart, Star, ArrowRight, ShieldCheck, Zap
} from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  // Dashboard active tab
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('/deliveries')) return 'deliveries';
    if (location.pathname.includes('/prescriptions')) return 'prescriptions';
    if (location.pathname.includes('/reservations')) return 'reservations';
    return 'overview';
  });

  useEffect(() => {
    if (location.pathname.includes('/deliveries')) setActiveTab('deliveries');
    else if (location.pathname.includes('/prescriptions')) setActiveTab('prescriptions');
    else if (location.pathname.includes('/reservations')) setActiveTab('reservations');
    else setActiveTab('overview');
  }, [location.pathname]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Data states
  const [reservations, setReservations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [pharmaciesList, setPharmaciesList] = useState([]);
  
  // Dashboard extras
  const [recentSearches] = useState(['Dolo 650', 'Augmentin 625', 'Combiflam']);
  const [savedPharmacies, setSavedPharmacies] = useState([]);

  // Upload state
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [chatPartner, setChatPartner] = useState(null);

  // Simulated AI OCR handwriting analyzer states
  const [scanningPrescId, setScanningPrescId] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedResults, setScannedResults] = useState(null);

  const simulateOcrScan = (id) => {
    setScanningPrescId(id);
    setScanProgress(0);
    setScannedResults(null);
    
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setScannedResults({
            medicines: ['Dolo 650', 'Amoxicillin 500mg'],
            confidence: '96%'
          });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const rRes = await reservationService.getMy();
      if (rRes.data.success) setReservations(rRes.data.data);

      const oRes = await orderService.getMy();
      if (oRes.data.success) setOrders(oRes.data.data);

      const pRes = await prescriptionService.getMy();
      if (pRes.data.success) setPrescriptions(pRes.data.data);

      const phRes = await pharmacyService.getAll();
      if (phRes.data.success) {
        setPharmaciesList(phRes.data.data);
        // Mock saved pharmacies for display
        setSavedPharmacies(phRes.data.data.slice(0, 2));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setMessage({ type: 'error', text: 'Failed to retrieve records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  // Setup socket listeners for real-time updates
  useEffect(() => {
    if (!socket || !user) return;
    const userId = user.id || user._id;

    const handleResStatus = (data) => {
      setReservations(prev => prev.map(resrv => {
        if (resrv._id === data.reservationId || resrv.id === data.reservationId) {
          return { ...resrv, status: data.status };
        }
        return resrv;
      }));
      setMessage({ type: 'success', text: `Reservation status updated: ${data.status.toUpperCase()}` });
    };

    const handleOrderStatus = (data) => {
      setOrders(prev => prev.map(ord => {
        if (ord._id === data.orderId || ord.id === data.orderId) {
          return { ...ord, status: data.status, paymentStatus: data.paymentStatus };
        }
        return ord;
      }));
      setMessage({ type: 'success', text: `Delivery order status updated: ${data.status.toUpperCase()}` });
    };

    const handlePrescriptionStatus = (data) => {
      setPrescriptions(prev => prev.map(p => {
        if (p._id === data.prescriptionId || p.id === data.prescriptionId) {
          return { ...p, status: data.status };
        }
        return p;
      }));
      setMessage({ type: 'success', text: `Prescription verification status updated: ${data.status.toUpperCase()}` });
    };

    socket.on(`reservation_status_user_${userId}`, handleResStatus);
    socket.on(`order_status_user_${userId}`, handleOrderStatus);
    socket.on(`prescription_status_user_${userId}`, handlePrescriptionStatus);

    return () => {
      socket.off(`reservation_status_user_${userId}`, handleResStatus);
      socket.off(`order_status_user_${userId}`, handleOrderStatus);
      socket.off(`prescription_status_user_${userId}`, handlePrescriptionStatus);
    };
  }, [socket, user]);

  // Cancel Reservation Action
  const cancelReservation = async (id) => {
    try {
      const res = await reservationService.updateStatus(id, 'cancelled');
      if (res.data.success) {
        setReservations(prev => prev.map(r => (r._id === id || r.id === id ? { ...r, status: 'cancelled' } : r)));
        setMessage({ type: 'success', text: 'Reservation cancelled.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to cancel reservation.' });
    }
  };

  // Upload Prescription Action
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedPharmacyId) {
      alert('Please select a file and a target pharmacy.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('prescription', uploadFile);
    formData.append('pharmacyId', selectedPharmacyId);

    try {
      const res = await prescriptionService.upload(formData);
      if (res.data.success) {
        setPrescriptions(prev => [res.data.data, ...prev]);
        setUploadFile(null);
        setSelectedPharmacyId('');
        document.getElementById('prescription-file-input').value = '';
        setMessage({ type: 'success', text: 'Prescription uploaded successfully.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to upload prescription.' });
    } finally {
      setUploading(false);
    }
  };

  const getActiveOrdersCount = () => orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const getActiveReservationsCount = () => reservations.filter(r => r.status === 'pending' || r.status === 'accepted').length;
  const getPrescriptionsCount = () => prescriptions.length;

  // Stepper helper (Linear style)
  const renderDeliveryStepper = (status) => {
    const steps = [
      { key: 'pending', label: 'Requested' },
      { key: 'accepted', label: 'Rider Assigned' },
      { key: 'out-for-delivery', label: 'Dispatched' },
      { key: 'delivered', label: 'Delivered' }
    ];

    if (status === 'cancelled') {
      return (
        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full font-semibold border border-rose-200 text-[10px]">
          Cancelled
        </span>
      );
    }

    const getStepIndex = (st) => {
      if (st === 'pending') return 0;
      if (st === 'accepted') return 1;
      if (st === 'out-for-delivery') return 2;
      if (st === 'delivered') return 3;
      return -1;
    };
    const activeIdx = getStepIndex(status);

    return (
      <div className="flex items-center gap-1.5 sm:gap-3 mt-2">
        {steps.map((step, idx) => (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-all duration-300
                ${idx <= activeIdx
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                {idx < activeIdx ? '✓' : idx + 1}
              </div>
              <span className={`text-[8px] mt-1 font-semibold ${idx <= activeIdx ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-6 sm:w-10 h-0.5 -mt-3.5 transition-all duration-300 ${idx < activeIdx ? 'bg-brand-500' : 'bg-slate-200'}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 flex-1 flex flex-col gap-8 font-sans">
      
      {/* 1. GREETING BANNERS & CONTROL ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100">
        <div>
          <span className="text-[10px] text-brand-600 font-bold bg-brand-50 px-3 py-1 rounded-full uppercase tracking-wider border border-brand-100">
            Patient Dashboard
          </span>
          <h1 className="font-fraunces font-bold text-2xl sm:text-3xl text-slate-900 mt-3 tracking-tight">
            Welcome back, {user?.name.split(' ')[0]}
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Evaluate pharmacy dispatches, medicine blockings, and prescription validations.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4.5 py-2 rounded-xl text-xs font-semibold border transition-all
              ${activeTab === 'overview'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-4.5 py-2 rounded-xl text-xs font-semibold border transition-all
              ${activeTab === 'reservations'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Reservations
          </button>
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`px-4.5 py-2 rounded-xl text-xs font-semibold border transition-all
              ${activeTab === 'deliveries'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Deliveries
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 border rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all shrink-0"
            title="Reload Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl border flex items-start gap-2.5 animate-fade-in
          ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-xs font-semibold">{message.text}</p>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Left Content Column */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* OVERVIEW PANEL */}
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-8 animate-fade-in">
                
                {/* 8. Modern Analytics KPI Cards (Linear style) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  <div className="bg-white border border-slate-200/60 rounded-3xl p-5.5 shadow-sm">
                    <span className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mb-3">
                      <ClipboardList className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Bookings</span>
                    <span className="font-mono-plex font-bold text-2xl text-accent-500 block mt-1">{getActiveReservationsCount()}</span>
                  </div>

                  <div className="bg-white border border-slate-200/60 rounded-3xl p-5.5 shadow-sm">
                    <span className="w-10 h-10 rounded-2xl bg-accent-50 flex items-center justify-center text-accent-600 mb-3">
                      <Truck className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">In Transit</span>
                    <span className="font-mono-plex font-bold text-2xl text-accent-500 block mt-1">{getActiveOrdersCount()}</span>
                  </div>

                  <div className="bg-white border border-slate-200/60 rounded-3xl p-5.5 shadow-sm">
                    <span className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 mb-3">
                      <FileText className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prescriptions Uploaded</span>
                    <span className="font-mono-plex font-bold text-2xl text-accent-500 block mt-1">{getPrescriptionsCount()}</span>
                  </div>

                </div>

                {/* 2. Quick Search Widget & Recent Searches */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                  <h3 className="font-outfit font-bold text-sm text-slate-800">Quick Medicine lookup</h3>
                  <div className="flex gap-2 p-1 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="flex-1 flex items-center px-3 py-2">
                      <Search className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search stock directly in nearby stores..."
                        className="w-full ml-2 text-xs text-slate-800 focus:outline-none bg-transparent"
                        onClick={() => navigate('/')}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                    <span>Recent search checks:</span>
                    {recentSearches.map(r => (
                      <span
                        key={r}
                        onClick={() => navigate('/')}
                        className="px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-full font-medium text-slate-600 cursor-pointer transition-colors"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Current Orders Section */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-outfit font-bold text-sm text-slate-800">In-Transit Emergency Dispatches</h3>
                  
                  {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length > 0 ? (
                    orders
                      .filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
                      .map((ord) => (
                        <div key={ord.id || ord._id} className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between gap-6">
                          <div>
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[8px] font-extrabold rounded border border-red-100 uppercase tracking-wide">Emergency Delivery</span>
                            <h4 className="font-outfit font-bold text-sm text-slate-800 mt-2">Order #{String(ord.id || ord._id).substring(0, 8).toUpperCase()}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">Dispatched from: {ord.pharmacy?.shopName}</p>
                            <p className="text-[10px] text-slate-500 mt-2 font-semibold">📍 Destination: {ord.deliveryAddress}</p>
                          </div>
                          <div className="flex flex-col justify-between items-end gap-3.5 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-6 shrink-0">
                            {renderDeliveryStepper(ord.status)}
                            <span className="text-xs font-bold text-slate-800 mt-2">Total Amount: ₹{ord.totalAmount + 40}</span>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-10 bg-white border border-slate-100 rounded-3xl">
                      <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">No active emergency dispatches.</p>
                    </div>
                  )}
                </div>

                {/* Saved Pharmacies (Airbnb-inspired) */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-outfit font-bold text-sm text-slate-800">Saved Pharmacies</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {savedPharmacies.map((pharm) => (
                      <div key={pharm.id || pharm._id} className="bg-white border border-slate-100 rounded-3xl p-4.5 shadow-sm flex items-start gap-4 hover:shadow transition-shadow">
                        <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-sm font-bold shrink-0">
                          🏥
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-outfit font-bold text-xs text-slate-800 truncate">{pharm.shopName || pharm.name}</h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{pharm.address}</p>
                          <button
                            onClick={() => navigate('/')}
                            className="text-brand-500 hover:text-brand-600 font-bold text-[10px] flex items-center gap-0.5 mt-2.5 transition-colors"
                          >
                            Explore Stock <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* RESERVATIONS TAB PANEL */}
            {activeTab === 'reservations' && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <h3 className="font-outfit font-bold text-sm text-slate-800">Reservation History</h3>
                
                {reservations.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {reservations.map((resrv) => (
                      <div key={resrv.id || resrv._id} className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex-1 flex flex-col gap-3">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h4 className="font-outfit font-bold text-sm text-slate-800">{resrv.medicine?.name}</h4>
                              <p className="text-[10px] text-slate-400">Brand: {resrv.medicine?.brand} • Qty: {resrv.quantity} strips</p>
                            </div>
                            <div className="bg-brand-50 text-brand-700 border border-brand-100 rounded-xl px-3 py-1 font-mono text-[11px] font-bold">
                              {resrv.pickupCode}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 bg-slate-50 rounded-xl p-3">
                            <span className="font-bold text-slate-700 block">🏥 {resrv.pharmacy?.shopName}</span>
                            <span className="text-slate-400 block mt-0.5">{resrv.pharmacy?.address}</span>
                          </div>
                        </div>

                        <div className="sm:w-48 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-5 flex flex-col justify-between items-end gap-3 shrink-0">
                          <div className="flex flex-col items-end gap-1.5 w-full">
                            <StatusBadge status={resrv.status} />
                            <button
                              onClick={() => {
                                setChatPartner({
                                  id: resrv.pharmacy?.id || resrv.pharmacy?._id,
                                  name: resrv.pharmacy?.shopName || 'Pharmacy Store'
                                });
                              }}
                              className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/60 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              💬 Chat Store
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">Booked: {new Date(resrv.createdAt).toLocaleDateString()}</span>
                          {resrv.status === 'pending' && (
                            <button
                              onClick={() => cancelReservation(resrv.id || resrv._id)}
                              className="px-3.5 py-1.5 border border-rose-200 text-rose-600 rounded-xl text-[10px] font-semibold hover:bg-rose-50 transition-colors"
                            >
                              Cancel Booking
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl">
                    <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No reservations placed.</p>
                  </div>
                )}
              </div>
            )}

            {/* DELIVERIES TAB PANEL */}
            {activeTab === 'deliveries' && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <h3 className="font-outfit font-bold text-sm text-slate-800">Delivery Orders History</h3>
                
                {orders.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {orders.map((ord) => (
                      <div key={ord.id || ord._id} className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm flex flex-col md:flex-row gap-6">
                        <div className="flex-1 flex flex-col gap-3">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 text-[8px] font-extrabold rounded uppercase tracking-wide">Emergency Delivery</span>
                              <h4 className="font-outfit font-extrabold text-sm text-slate-800 mt-2">Order #{String(ord.id || ord._id).substring(0, 8).toUpperCase()}</h4>
                            </div>
                            <span className="font-outfit font-bold text-sm text-slate-800">₹{ord.totalAmount + 40}</span>
                          </div>

                          <div className="border-t border-b border-slate-50 py-2.5 flex flex-col gap-1.5">
                            {ord.items?.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-xs text-slate-700 font-semibold pl-2 border-l-2 border-brand-500">
                                <span>{it.name} <span className="text-slate-400">x{it.quantity}</span></span>
                                <span>₹{it.price * it.quantity}</span>
                              </div>
                            ))}
                          </div>

                          <div className="text-[10px] text-slate-500 bg-slate-50 rounded-xl p-3">
                            <p className="font-semibold text-slate-700">🏥 Store: {ord.pharmacy?.shopName}</p>
                            <p className="text-slate-400 mt-0.5">📍 Address: {ord.deliveryAddress}</p>
                          </div>
                        </div>

                        <div className="md:w-56 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 flex flex-col justify-between items-end gap-3 shrink-0">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold mb-1">Rider Dispatch Stepper</span>
                            {renderDeliveryStepper(ord.status)}
                          </div>
                          <div className="w-full">
                            <div className="flex items-center justify-between w-full text-[10px] border-t pt-2 mt-2">
                              <span className="text-slate-400">Payment Status:</span>
                              <span className={`font-bold uppercase ${ord.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{ord.paymentStatus}</span>
                            </div>
                            <button
                              onClick={() => {
                                setChatPartner({
                                  id: ord.pharmacyId || ord.pharmacy?.id || ord.pharmacy?._id,
                                  name: ord.pharmacy?.shopName || 'Pharmacy Store'
                                });
                              }}
                              className="w-full mt-2 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/60 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              💬 Chat Pharmacy Rider
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl">
                    <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No delivery orders placed.</p>
                  </div>
                )}
              </div>
            )}

            {/* PRESCRIPTIONS TAB PANEL */}
            {activeTab === 'prescriptions' && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <h3 className="font-outfit font-bold text-sm text-slate-800">Prescription Vault</h3>
                
                {prescriptions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {prescriptions.map((p) => (
                      <div key={p.id || p._id} className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm flex flex-col justify-between gap-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-slate-800 truncate">Prescription ID</h4>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">{p.id || p._id}</p>
                            <p className="text-[10px] text-slate-500 mt-2 font-semibold">🏥 Store: {p.pharmacy?.shopName || 'Store'}</p>
                          </div>
                          
                          <StatusBadge status={p.status} />
                        </div>

                        {/* Simulated OCR Scanner */}
                        {scanningPrescId === (p.id || p._id) ? (
                          <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex flex-col gap-2">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
                              <span>AI Handwriting Analysis</span>
                              <span>{scanProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-brand-500 h-full rounded-full transition-all duration-200" style={{ width: `${scanProgress}%` }}></div>
                            </div>
                            {scanProgress < 100 ? (
                              <span className="text-[9px] text-slate-400 animate-pulse font-medium">Extracting handwriting pattern logs...</span>
                            ) : (
                              scannedResults && (
                                <div className="flex flex-col gap-1.5 pt-1">
                                  <span className="text-[9px] text-emerald-700 font-bold">Scanned Successfully:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {scannedResults.medicines.map((med, mIdx) => (
                                      <span
                                        key={mIdx}
                                        onClick={() => { navigate('/'); }}
                                        className="px-2 py-0.5 bg-brand-50 hover:bg-brand-100 text-brand-600 border border-brand-100 rounded-md text-[9px] font-bold cursor-pointer transition-colors"
                                      >
                                        🔍 Search: {med}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => simulateOcrScan(p.id || p._id)}
                            className="w-full py-2 bg-brand-50 hover:bg-brand-100 text-brand-600 border border-brand-100/50 rounded-2xl text-[10px] font-bold transition-all"
                          >
                            🔬 Run AI OCR Handwriting scan
                          </button>
                        )}

                        <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-1 flex-wrap gap-2 text-[10px] text-slate-400">
                          <span>Uploaded: {new Date(p.createdAt).toLocaleDateString()}</span>
                          <a
                            href={p.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-500 font-bold hover:text-brand-600 flex items-center gap-0.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Scan
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No prescriptions uploaded.</p>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right Sidebar Column */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24">
            
            {/* 6. Prescription Vault Upload Area */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5.5 shadow-sm flex flex-col gap-4">
              <h3 className="font-outfit font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-500" /> Digital Prescription Vault
              </h3>
              
              <form onSubmit={handleFileUpload} className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Target Pharmacy</label>
                  <select
                    required
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50"
                    value={selectedPharmacyId}
                    onChange={(e) => setSelectedPharmacyId(e.target.value)}
                  >
                    <option value="">-- Choose Pharmacy --</option>
                    {pharmaciesList.map((pharm) => (
                      <option key={pharm.id || pharm._id} value={pharm.id || pharm._id}>
                        {pharm.shopName || pharm.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="border-2 border-dashed border-slate-200 hover:border-brand-300 rounded-xl p-5 text-center cursor-pointer transition-colors relative flex flex-col items-center justify-center bg-slate-50">
                    <input
                      id="prescription-file-input"
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                    />
                    <UploadCloud className="w-7 h-7 text-slate-400 mb-1.5" />
                    <span className="text-[10px] font-bold text-slate-700 truncate max-w-full">
                      {uploadFile ? uploadFile.name : 'Select file scan'}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 rounded-xl transition-all text-xs disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Submit to Vault'}
                </button>
              </form>

              {/* Uploaded items status summary */}
              <div className="border-t pt-3.5 mt-1 flex flex-col gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Uploaded list</span>
                {prescriptions.slice(0, 3).map((p) => (
                  <div key={p.id || p._id} className="flex justify-between items-center text-[10px] p-2 bg-slate-50 border rounded-lg">
                    <span className="font-semibold text-slate-600 truncate max-w-[120px]">Vault ID: {String(p.id || p._id).substring(0, 8)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* 7. Emergency Dispatch Request card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col gap-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full filter blur-xl"></div>
              
              <div className="relative z-10 flex items-center gap-2">
                <span className="bg-red-500/20 text-red-400 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-red-500/30">
                  🚨 Emergency dispatch
                </span>
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
              </div>

              <div className="relative z-10 mt-1">
                <h4 className="font-outfit font-extrabold text-base leading-tight">Need medicines immediately?</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Trigger an express delivery lookup for prescription and OTC drugs. Dispatches local pharmacy riders to your location inside 10 minutes.
                </p>
              </div>

              <button
                onClick={() => navigate('/')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-red-600/10 relative z-10"
              >
                1-Click Search Finder
              </button>
            </div>

          </div>

        </div>
      )}
      
      {chatPartner && (
        <ChatDrawer
          activeUserId={user?.id || user?._id}
          activeUserName={user?.name || 'Customer'}
          chatPartnerId={chatPartner.id}
          chatPartnerName={chatPartner.name}
          onClose={() => setChatPartner(null)}
        />
      )}
    </div>
  );
}
