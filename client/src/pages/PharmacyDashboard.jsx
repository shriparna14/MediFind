import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ChatDrawer from '../components/ChatDrawer';
import { 
  pharmacyService, medicineService, reservationService, orderService, prescriptionService 
} from '../services/api';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  Plus, Edit2, Trash2, Check, X, AlertCircle, ShoppingBag, Truck, ClipboardList, FileText,
  TrendingUp, Layers, HelpCircle, Activity, ShieldAlert, Phone, RefreshCw, BadgeAlert,
  ChevronRight, Calendar, UserCheck, LayoutDashboard, Pill, LogOut, CheckSquare
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

export default function PharmacyDashboard() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const location = useLocation();

  // Sidebar navigation active state
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('/inventory')) return 'inventory';
    if (location.pathname.includes('/reservations')) return 'reservations';
    if (location.pathname.includes('/deliveries')) return 'deliveries';
    if (location.pathname.includes('/prescriptions')) return 'prescriptions';
    return 'overview';
  });

  useEffect(() => {
    if (location.pathname.includes('/inventory')) setActiveTab('inventory');
    else if (location.pathname.includes('/reservations')) setActiveTab('reservations');
    else if (location.pathname.includes('/deliveries')) setActiveTab('deliveries');
    else if (location.pathname.includes('/prescriptions')) setActiveTab('prescriptions');
    else setActiveTab('overview');
  }, [location.pathname]);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [chatPartner, setChatPartner] = useState(null);

  // Data states
  const [medicines, setMedicines] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  // Modal / Form triggers
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    brand: '',
    category: 'Analgesic',
    price: '',
    stock: '',
    expiryDate: '',
    prescriptionRequired: false,
    alternatives: ''
  });

  // Edit stock inline
  const [editingMedId, setEditingMedId] = useState(null);
  const [editStockVal, setEditStockVal] = useState(0);

  // Fetch all pharmacy data
  const fetchData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const mRes = await pharmacyService.getInventory(user.id || user._id);
      if (mRes.data.success) setMedicines(mRes.data.data);

      const rRes = await pharmacyService.getReservations();
      if (rRes.data.success) setReservations(rRes.data.data);

      const dRes = await pharmacyService.getOrders();
      if (dRes.data.success) setOrders(dRes.data.data);

      const pRes = await pharmacyService.getPrescriptions();
      if (pRes.data.success) setPrescriptions(pRes.data.data);

    } catch (err) {
      console.error('Error fetching pharmacy dashboard:', err);
      setMessage({ type: 'error', text: 'Error retrieving catalog records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket || !user) return;
    const pharmId = user.id || user._id;

    const handleNewReservation = (data) => {
      setReservations(prev => [data, ...prev]);
      setMessage({ type: 'success', text: `🔔 Real-time: New reservation request from ${data.customer?.name}!` });
    };

    const handleNewOrder = (data) => {
      setOrders(prev => [data, ...prev]);
      setMessage({ type: 'success', text: `🚨 Real-time: New emergency dispatch request from ${data.customer?.name}!` });
    };

    const handleNewPrescription = (data) => {
      setPrescriptions(prev => [data, ...prev]);
      setMessage({ type: 'success', text: `📜 Real-time: New prescription uploaded for validation.` });
    };

    socket.on(`new_reservation_pharmacy_${pharmId}`, handleNewReservation);
    socket.on(`new_order_pharmacy_${pharmId}`, handleNewOrder);
    socket.on(`new_prescription_pharmacy_${pharmId}`, handleNewPrescription);

    return () => {
      socket.off(`new_reservation_pharmacy_${pharmId}`, handleNewReservation);
      socket.off(`new_order_pharmacy_${pharmId}`, handleNewOrder);
      socket.off(`new_prescription_pharmacy_${pharmId}`, handleNewPrescription);
    };
  }, [socket, user]);

  // Add Medicine Action
  const handleAddMedicineSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newMed,
        alternatives: newMed.alternatives.split(',').map(s => s.trim()).filter(Boolean)
      };

      const res = await medicineService.add(payload);
      if (res.data.success) {
        setMedicines(prev => [res.data.data, ...prev]);
        setShowAddForm(false);
        setNewMed({
          name: '',
          brand: '',
          category: 'Analgesic',
          price: '',
          stock: '',
          expiryDate: '',
          prescriptionRequired: false,
          alternatives: ''
        });
        setMessage({ type: 'success', text: 'Medicine record cataloged successfully.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add medicine' });
    }
  };

  // Batch CSV Catalog Import Action
  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      
      if (lines.length <= 1) {
        alert('CSV file is empty or missing data rows.');
        return;
      }

      setLoading(true);
      setMessage({ type: 'success', text: 'Processing CSV catalog imports...' });

      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, '')); // Strip surrounding quotes
        if (columns.length < 5) continue; // Skip invalid columns

        const name = columns[0];
        const brand = columns[1];
        const category = columns[2] || 'Analgesic';
        const price = Number(columns[3]) || 10;
        const stock = Number(columns[4]) || 50;
        const expiryDate = columns[5] || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0];
        const prescriptionRequired = String(columns[6]).toLowerCase() === 'true';
        const alternatives = columns[7] ? columns[7].split(';').map(a => a.trim()).filter(Boolean) : [];

        try {
          const res = await medicineService.add({
            name,
            brand,
            category,
            price,
            stock,
            expiryDate,
            prescriptionRequired,
            alternatives
          });
          if (res.data.success) {
            successCount++;
            setMedicines(prev => [res.data.data, ...prev]);
          }
        } catch (err) {
          console.error('Error adding row:', err);
          errorCount++;
        }
      }

      setLoading(false);
      setMessage({
        type: 'success',
        text: `CSV catalog import complete! Imported ${successCount} formulations successfully.${errorCount > 0 ? ` Failed to import ${errorCount} rows.` : ''}`
      });
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // Delete Medicine Action
  const deleteMedicine = async (id) => {
    if (!window.confirm('Delete this medicine from store catalog permanently?')) return;
    try {
      const res = await medicineService.delete(id);
      if (res.data.success) {
        setMedicines(prev => prev.filter(m => (m.id || m._id) !== id));
        setMessage({ type: 'success', text: 'Medicine removed successfully.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to remove medicine.' });
    }
  };

  // Inline Stock Edit Action
  const startEditingStock = (med) => {
    setEditingMedId(med.id || med._id);
    setEditStockVal(med.stock);
  };

  const saveStockUpdate = async (id) => {
    try {
      const res = await medicineService.updateStock(id, editStockVal);
      if (res.data.success) {
        setMedicines(prev => prev.map(m => ((m.id || m._id) === id ? { ...m, stock: res.data.data.stock } : m)));
        setEditingMedId(null);
        setMessage({ type: 'success', text: 'Stock units updated.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update stock.' });
    }
  };

  // Update Reservation Status
  const updateReservation = async (id, status) => {
    try {
      const res = await reservationService.updateStatus(id, status);
      if (res.data.success) {
        setReservations(prev => prev.map(r => ((r.id || r._id) === id ? { ...r, status } : r)));
        setMessage({ type: 'success', text: `Reservation updated to: ${status}` });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update reservation.' });
    }
  };

  // Update Delivery Order Status
  const updateOrderDelivery = async (id, status, paymentStatus) => {
    try {
      const res = await orderService.updateStatus(id, status, paymentStatus);
      if (res.data.success) {
        setOrders(prev => prev.map(o => ((o.id || o._id) === id ? { ...o, status, paymentStatus: paymentStatus || o.paymentStatus } : o)));
        setMessage({ type: 'success', text: `Rider dispatch updated to: ${status}` });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update delivery status.' });
    }
  };

  // Validate Prescription Status
  const verifyPrescription = async (id, status) => {
    try {
      const res = await prescriptionService.updateStatus(id, status);
      if (res.data.success) {
        setPrescriptions(prev => prev.map(p => ((p.id || p._id) === id ? { ...p, status } : p)));
        setMessage({ type: 'success', text: `Prescription status verified as: ${status}` });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to verify prescription.' });
    }
  };

  const totalSalesVal = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const pendingResCount = reservations.filter(r => r.status === 'pending').length;
  const lowStockCount = medicines.filter(m => m.stock < 10).length;

  // Chart properties
  const revenueChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Gross Sales (₹)',
        data: [
          totalSalesVal * 0.12,
          totalSalesVal * 0.18,
          totalSalesVal * 0.1,
          totalSalesVal * 0.22,
          totalSalesVal * 0.15,
          totalSalesVal * 0.08,
          totalSalesVal * 0.15
        ],
        borderColor: '#2f5d50', // Apothecary Pine for charts
        backgroundColor: 'rgba(47, 93, 80, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2
      }
    ]
  };

  return (
    <div className="flex-1 bg-slate-50 flex font-sans">
      
      {/* 1. SIDEBAR NAVIGATION (Linear-inspired clean structure) */}
      <aside className="w-64 border-r border-slate-200/60 bg-white hidden lg:flex flex-col p-6 sticky top-16 h-[calc(100vh-64px)] justify-between shrink-0">
        <div className="flex flex-col gap-6">
          
          <div className="px-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Workspace</span>
            <span className="text-sm font-extrabold text-slate-800 block mt-1 truncate">{user?.shopName}</span>
          </div>

          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all
                ${activeTab === 'overview' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              Overview Console
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all
                ${activeTab === 'inventory' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <Pill className="w-4.5 h-4.5" />
              Catalog Inventory
            </button>

            <button
              onClick={() => setActiveTab('reservations')}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all
                ${activeTab === 'reservations' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <span className="flex items-center gap-2.5">
                <ClipboardList className="w-4.5 h-4.5" />
                Reservations
              </span>
              {pendingResCount > 0 && (
                <span className="bg-amber-500 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold">
                  {pendingResCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('deliveries')}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all
                ${activeTab === 'deliveries' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <span className="flex items-center gap-2.5">
                <Truck className="w-4.5 h-4.5" />
                Express Dispatch
              </span>
              {orders.filter(o => o.status === 'pending').length > 0 && (
                <span className="bg-brand-500 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold">
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('prescriptions')}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all
                ${activeTab === 'prescriptions' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4.5 h-4.5" />
                Verify Slips
              </span>
              {prescriptions.filter(p => p.status === 'pending').length > 0 && (
                <span className="bg-amber-500 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold">
                  {prescriptions.filter(p => p.status === 'pending').length}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-100 pt-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-800 block truncate">{user?.name}</span>
            <span className="text-[10px] text-slate-400 block truncate">{user?.license}</span>
          </div>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 p-6 lg:p-10 flex flex-col gap-6 overflow-hidden">
        
        {/* Top Header Row for mobile responsive links */}
        <div className="flex lg:hidden justify-between items-center bg-white border border-slate-100 p-4 rounded-2xl">
          <span className="text-xs font-bold text-slate-800">Workspace Menu</span>
          <select
            className="text-xs p-2 border rounded-xl"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            <option value="overview">Console Overview</option>
            <option value="inventory">Catalog Inventory</option>
            <option value="reservations">Reservations</option>
            <option value="deliveries">Express Dispatch</option>
            <option value="prescriptions">Verify Slips</option>
          </select>
        </div>

        {/* Console Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-5 shrink-0">
          <div>
            <h2 className="font-fraunces font-bold text-xl sm:text-2xl text-slate-900 capitalize tracking-tight">{activeTab} Console</h2>
            <p className="text-slate-400 text-xs mt-0.5">Control pharmacy operational databases and audit queues.</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 border rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Global alert feedback */}
        {message.text && (
          <div className={`p-4 rounded-2xl border flex items-start gap-2.5 animate-fade-in shrink-0
            ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-semibold">{message.text}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">

          {loading && (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
            </div>
          )}

          {/* OVERVIEW PANEL */}
          {!loading && activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Analytics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm">
                  <span className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mb-3">
                    <Layers className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Cataloged</span>
                  <span className="font-outfit font-extrabold text-2xl text-slate-800 block mt-1">{medicines.length}</span>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm">
                  <span className="w-10 h-10 rounded-2xl bg-accent-50 flex items-center justify-center text-accent-600 mb-3">
                    <TrendingUp className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gross Sales</span>
                  <span className="font-outfit font-extrabold text-2xl text-slate-800 block mt-1">₹{totalSalesVal.toFixed(2)}</span>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm">
                  <span className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
                    <ClipboardList className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Bookings</span>
                  <span className="font-outfit font-extrabold text-2xl text-slate-800 block mt-1">{pendingResCount}</span>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm">
                  <span className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-3">
                    <ShieldAlert className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Low Stock alerts</span>
                  <span className="font-outfit font-extrabold text-2xl text-slate-800 block mt-1">{lowStockCount}</span>
                </div>

              </div>

              {/* Chart & Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* 7. Revenue Chart */}
                <div className="lg:col-span-8 bg-white border border-slate-200/60 rounded-3xl p-5.5 shadow-sm">
                  <h3 className="font-outfit font-bold text-xs text-slate-500 uppercase tracking-wide mb-4">Gross Revenue Chart</h3>
                  <div className="h-60 flex items-center justify-center">
                    <Line data={revenueChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                </div>

                {/* 5. Low Stock Alerts Card */}
                <div className="lg:col-span-4 bg-white border border-slate-200/60 rounded-3xl p-5.5 shadow-sm flex flex-col gap-4.5">
                  <h3 className="font-outfit font-bold text-xs text-slate-500 uppercase tracking-wide">Critical Low Stock Warnings</h3>
                  
                  <div className="flex-1 overflow-y-auto max-h-56 pr-1 flex flex-col gap-2.5">
                    {medicines.filter(m => m.stock < 10).length > 0 ? (
                      medicines
                        .filter(m => m.stock < 10)
                        .map(med => (
                          <div key={med.id || med._id} className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-slate-800 block">{med.name}</span>
                              <span className="text-[9px] text-slate-400 font-semibold">{med.brand}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded font-extrabold text-[9px]
                              ${med.stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                              {med.stock === 0 ? 'Out of Stock' : `${med.stock} units`}
                            </span>
                          </div>
                        ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10">
                        <CheckSquare className="w-8 h-8 mb-2" />
                        <span className="text-xs">Stocks are healthy.</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* INVENTORY TABLE PANEL */}
          {!loading && activeTab === 'inventory' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <h3 className="font-fraunces font-bold text-sm text-slate-800">Manage Medicine Database</h3>
                <div className="flex items-center gap-2">
                  <label className="bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Import CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvUpload}
                    />
                  </label>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-brand-500 hover:bg-brand-600 text-white px-4.5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Formulation
                  </button>
                </div>
              </div>

              {/* Add Medicine Modal Popup (Apple design) */}
              {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                  <form onSubmit={handleAddMedicineSubmit} className="bg-white rounded-3xl border border-slate-100 max-w-xl w-full p-6 animate-fade-in flex flex-col gap-4.5 premium-shadow-lg">
                    <h3 className="font-outfit font-extrabold text-base text-slate-950">Add Formulation to Catalog</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Medicine Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Lipitor 20mg"
                          className="w-full text-xs p-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50"
                          value={newMed.name}
                          onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Manufacturer Brand</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Pfizer"
                          className="w-full text-xs p-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50"
                          value={newMed.brand}
                          onChange={(e) => setNewMed({ ...newMed, brand: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Therapeutic Category</label>
                        <select
                          className="w-full text-xs p-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50"
                          value={newMed.category}
                          onChange={(e) => setNewMed({ ...newMed, category: e.target.value })}
                        >
                          <option value="Analgesic">Analgesic (Pain Reliever)</option>
                          <option value="Antibiotic">Antibiotic</option>
                          <option value="Antihistamine">Antihistamine (Allergy)</option>
                          <option value="Diabetes">Diabetes</option>
                          <option value="Cardiac">Cardiac</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Unit price (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="120.00"
                          className="w-full text-xs p-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50"
                          value={newMed.price}
                          onChange={(e) => setNewMed({ ...newMed, price: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Stock Count (Units)</label>
                        <input
                          type="number"
                          required
                          placeholder="150"
                          className="w-full text-xs p-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50"
                          value={newMed.stock}
                          onChange={(e) => setNewMed({ ...newMed, stock: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Batch Expiry Date</label>
                        <input
                          type="date"
                          required
                          className="w-full text-xs p-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50"
                          value={newMed.expiryDate}
                          onChange={(e) => setNewMed({ ...newMed, expiryDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Generic alternatives (comma separated)</label>
                      <input
                        type="text"
                        placeholder="Calpol 500, Crocin 500, Paracetamol"
                        className="w-full text-xs p-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50"
                        value={newMed.alternatives}
                        onChange={(e) => setNewMed({ ...newMed, alternatives: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="presc-chk-p"
                        className="w-4 h-4 text-brand-500 border-slate-300 rounded focus:ring-brand-500 bg-slate-50"
                        checked={newMed.prescriptionRequired}
                        onChange={(e) => setNewMed({ ...newMed, prescriptionRequired: e.target.checked })}
                      />
                      <label htmlFor="presc-chk-p" className="text-xs font-semibold text-slate-600">Prescription verification required</label>
                    </div>

                    <div className="flex justify-end gap-2 border-t pt-4.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        Catalog Record
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Medicine Table Catalog */}
              <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="p-4">Name</th>
                        <th className="p-4">Brand</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Price</th>
                        <th className="p-4 text-center">Stock</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {medicines.map((med) => {
                        const isEditing = editingMedId === (med.id || med._id);
                        return (
                          <tr key={med.id || med._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-bold text-slate-800">{med.name}</td>
                            <td className="p-4 text-slate-500">{med.brand}</td>
                            <td className="p-4 text-slate-400 capitalize">{med.category}</td>
                            <td className="p-4 font-semibold text-slate-800">₹{med.price}</td>
                            <td className="p-4 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    type="number"
                                    className="w-16 text-center text-xs p-1 border rounded-lg"
                                    value={editStockVal}
                                    onChange={(e) => setEditStockVal(Number(e.target.value))}
                                  />
                                  <button
                                    onClick={() => saveStockUpdate(med.id || med._id)}
                                    className="p-1 bg-brand-500 text-white rounded-lg"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px]
                                  ${med.stock >= 20 ? 'bg-emerald-50 text-emerald-700' : med.stock > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                                  {med.stock} units
                                </span>
                              )}
                            </td>
                            <td className="p-4 flex gap-2">
                              {!isEditing && (
                                <button
                                  onClick={() => startEditingStock(med)}
                                  className="p-1 text-slate-400 hover:text-slate-800"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteMedicine(med.id || med._id)}
                                className="p-1 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* RESERVATIONS QUEUE PANEL */}
          {!loading && activeTab === 'reservations' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <h3 className="font-outfit font-bold text-sm text-slate-800">Customer Reservations Queue</h3>
              
              {reservations.length > 0 ? (
                reservations.map((resrv) => (
                  <div key={resrv.id || resrv._id} className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between gap-6">
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-outfit font-bold text-base text-slate-800">{resrv.medicine?.name}</h4>
                          <p className="text-[10px] text-slate-400">Qty Block: {resrv.quantity} strips • Date: {new Date(resrv.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="bg-slate-50 border px-3 py-1 rounded-xl font-mono text-[11px] font-bold text-slate-700">
                          Code: {resrv.pickupCode}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
                        <span className="font-bold text-slate-700 block">👤 Customer: {resrv.customer?.name}</span>
                        <span className="text-slate-400 block mt-0.5">📞 Contact phone: {resrv.customer?.phone}</span>
                      </div>
                    </div>

                    <div className="sm:w-52 flex flex-col justify-center items-end border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-5 shrink-0 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px]
                          ${resrv.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : resrv.status === 'cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                          {resrv.status}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setChatPartner({
                              id: resrv.customerId || resrv.customer?.id || resrv.customer?._id,
                              name: resrv.customer?.name || 'Customer'
                            });
                          }}
                          className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/60 rounded-xl text-[10px] font-bold cursor-pointer"
                        >
                          💬 Chat
                        </button>

                        {resrv.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateReservation(resrv.id || resrv._id, 'cancelled')}
                              className="px-3.5 py-1.5 border border-rose-200 text-rose-600 rounded-xl text-[10px] font-semibold hover:bg-rose-50 cursor-pointer"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => updateReservation(resrv.id || resrv._id, 'accepted')}
                              className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-[10px] font-semibold cursor-pointer"
                            >
                              Approve
                            </button>
                          </>
                        )}

                        {resrv.status === 'accepted' && (
                          <button
                            onClick={() => updateReservation(resrv.id || resrv._id, 'completed')}
                            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-[10px] font-bold cursor-pointer"
                          >
                            Mark Collected
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl">
                  <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Queue is empty.</p>
                </div>
              )}
            </div>
          )}

          {/* ORDER DISPATCH PANEL */}
          {!loading && activeTab === 'deliveries' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <h3 className="font-outfit font-bold text-sm text-slate-800">Emergency Dispatches Management</h3>
              
              {orders.length > 0 ? (
                orders.map((ord) => (
                  <div key={ord.id || ord._id} className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row gap-6">
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 text-[8px] font-extrabold rounded-md border border-rose-100 uppercase tracking-wide">Emergency Express</span>
                          <h4 className="font-outfit font-bold text-sm text-slate-800 mt-2">Order #{String(ord.id || ord._id).substring(0, 8).toUpperCase()}</h4>
                        </div>
                        <span className="font-outfit font-extrabold text-base text-slate-800">₹{(ord.totalAmount + 40).toFixed(2)}</span>
                      </div>

                      <div className="border-t border-b border-slate-50 py-2.5 flex flex-col gap-1">
                        {ord.items?.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-slate-700 font-semibold pl-2 border-l-2 border-accent-400">
                            <span>{it.name} <span className="text-slate-400">x{it.quantity}</span></span>
                            <span>₹{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
                        <p className="font-semibold text-slate-700">👤 Destination Contact: {ord.customer?.name}</p>
                        <p className="text-[10px] text-slate-400">📍 Delivery address: {ord.deliveryAddress}</p>
                        <p className="text-[10px] text-slate-400">📞 Phone contact: {ord.deliveryPhone}</p>
                      </div>
                    </div>

                    <div className="md:w-56 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 flex flex-col justify-center items-end shrink-0 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wide
                          ${ord.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : ord.status === 'cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                          {ord.status}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 w-full">
                        <button
                          onClick={() => {
                            setChatPartner({
                              id: ord.customerId || ord.customer?.id || ord.customer?._id,
                              name: ord.customer?.name || 'Customer'
                            });
                          }}
                          className="w-full py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/60 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          💬 Chat Customer
                        </button>

                        {ord.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateOrderDelivery(ord.id || ord._id, 'cancelled')}
                              className="flex-1 py-1.5 border border-rose-200 text-rose-600 rounded-xl text-[10px] font-semibold hover:bg-rose-50 cursor-pointer"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => updateOrderDelivery(ord.id || ord._id, 'accepted')}
                              className="flex-1 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-[10px] font-semibold cursor-pointer"
                            >
                              Accept
                            </button>
                          </div>
                        )}

                        {ord.status === 'accepted' && (
                          <button
                            onClick={() => updateOrderDelivery(ord.id || ord._id, 'out-for-delivery')}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-bold cursor-pointer"
                          >
                            🏍️ Mark Out for Delivery
                          </button>
                        )}

                        {ord.status === 'out-for-delivery' && (
                          <button
                            onClick={() => updateOrderDelivery(ord.id || ord._id, 'delivered', 'paid')}
                            className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-[10px] font-bold cursor-pointer"
                          >
                            Confirm Delivery & Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl">
                  <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Dispatch log is empty.</p>
                </div>
              )}
            </div>
          )}

          {/* PRESCRIPTIONS VALIDATION PANEL */}
          {!loading && activeTab === 'prescriptions' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              {prescriptions.length > 0 ? (
                prescriptions.map((p) => (
                  <div key={p.id || p._id} className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-outfit font-bold text-xs text-slate-800">User: {p.customer?.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">📞 Contact: {p.customer?.phone}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 text-[9px] font-extrabold rounded-full border uppercase
                        ${p.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : p.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                        {p.status}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[10px]">Uploaded: {new Date(p.createdAt).toLocaleDateString()}</span>
                      <a
                        href={p.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 font-bold hover:text-brand-700 flex items-center gap-0.5"
                      >
                        View File
                      </a>
                    </div>

                    {p.status === 'pending' && (
                      <div className="flex gap-2 pt-2 border-t mt-1">
                        <button
                          onClick={() => verifyPrescription(p.id || p._id, 'rejected')}
                          className="flex-1 py-1.5 border border-rose-200 text-rose-600 rounded-xl text-[10px] font-semibold hover:bg-rose-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => verifyPrescription(p.id || p._id, 'approved')}
                          className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-semibold"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-16 bg-white border border-slate-100 rounded-3xl">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No prescription uploads found.</p>
                </div>
              )}
            </div>
          )}

        </div>

      </main>
      
      {chatPartner && (
        <ChatDrawer
          activeUserId={user?.id || user?._id}
          activeUserName={user?.name || 'Pharmacy'}
          chatPartnerId={chatPartner.id}
          chatPartnerName={chatPartner.name}
          onClose={() => setChatPartner(null)}
        />
      )}
    </div>
  );
}
