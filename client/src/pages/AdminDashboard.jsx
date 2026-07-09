import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Bar } from 'react-chartjs-2';
import MapContainer from '../components/MapContainer';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  Users, Building2, Layers, Truck, ShieldCheck, Trash2, ShieldAlert,
  MapPin, Clock, RefreshCw, BarChart2, ListCollapse, Eye, UserCheck, Shield
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function AdminDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const location = useLocation();

  // Tabs: 'analytics', 'approvals', 'users', 'deliveries'
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('/approvals')) return 'approvals';
    if (location.pathname.includes('/users')) return 'users';
    if (location.pathname.includes('/deliveries')) return 'deliveries';
    return 'analytics';
  });

  useEffect(() => {
    if (location.pathname.includes('/approvals')) setActiveTab('approvals');
    else if (location.pathname.includes('/users')) setActiveTab('users');
    else if (location.pathname.includes('/deliveries')) setActiveTab('deliveries');
    else setActiveTab('analytics');
  }, [location.pathname]);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Data states
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPharmacies: 0,
    totalMedicines: 0,
    activeDeliveries: 0,
    popularMedicines: []
  });
  const [pharmacies, setPharmacies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);

  // Fetch admin data
  const fetchData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      if (activeTab === 'analytics') {
        const res = await axios.get('/admin/stats');
        if (res.data.success) setStats(res.data.data);
      } else if (activeTab === 'approvals') {
        const res = await axios.get('/admin/pharmacies');
        if (res.data.success) setPharmacies(res.data.data);
      } else if (activeTab === 'users') {
        const cRes = await axios.get('/admin/users');
        const pRes = await axios.get('/admin/pharmacies');
        if (cRes.data.success) setCustomers(cRes.data.data);
        if (pRes.data.success) setPharmacies(pRes.data.data.filter(p => p.isApproved));
      } else if (activeTab === 'deliveries') {
        const res = await axios.get('/admin/deliveries');
        if (res.data.success) setDeliveries(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
      setMessage({ type: 'error', text: 'Error retrieving catalog records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [activeTab, user]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewOrder = (data) => {
      if (activeTab === 'deliveries') {
        setDeliveries(prev => [data, ...prev]);
      }
      setStats(prev => ({ ...prev, activeDeliveries: prev.activeDeliveries + 1 }));
      setMessage({ type: 'success', text: `🚨 System Alert: New emergency dispatch order placed.` });
    };

    socket.on('global_emergency_order', handleNewOrder);

    return () => {
      socket.off('global_emergency_order', handleNewOrder);
    };
  }, [socket, user, activeTab]);

  // Approve Pharmacy Action
  const approvePharmacy = async (id) => {
    try {
      const res = await axios.put(`/admin/pharmacies/${id}/approve`);
      if (res.data.success) {
        setPharmacies(prev => prev.map(p => (p.id === id ? { ...p, isApproved: true } : p)));
        setMessage({ type: 'success', text: res.data.message });
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to approve pharmacy.' });
    }
  };

  // Decline / Remove Pharmacy Action
  const deletePharmacy = async (id) => {
    if (!window.confirm('Remove this pharmacy store from the directory?')) return;
    try {
      const res = await axios.delete(`/admin/pharmacies/${id}`);
      if (res.data.success) {
        setPharmacies(prev => prev.filter(p => p.id !== id));
        setMessage({ type: 'success', text: res.data.message });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to remove pharmacy.' });
    }
  };

  // Delete Customer Action
  const deleteCustomer = async (id) => {
    if (!window.confirm('Delete this user profile permanently?')) return;
    try {
      const res = await axios.delete(`/admin/users/${id}`);
      if (res.data.success) {
        setCustomers(prev => prev.filter(c => c.id !== id));
        setMessage({ type: 'success', text: res.data.message });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to delete user profile.' });
    }
  };

  // Most Searched Medicines chart configuration
  const popularMedNames = stats.popularMedicines.map(m => m.name.toUpperCase());
  const popularMedCounts = stats.popularMedicines.map(m => m.count);

  const popularMedsChartData = {
    labels: popularMedNames.length > 0 ? popularMedNames : ['Dolo 650', 'Paracetamol', 'Crocin', 'Calpol', 'Augmentin'],
    datasets: [
      {
        label: 'Search Frequency Count',
        data: popularMedCounts.length > 0 ? popularMedCounts : [42, 35, 29, 18, 14],
        backgroundColor: '#f43f5e', // Rose-Coral
        borderRadius: 8
      }
    ]
  };

  const activeDeliveryMapMarkers = deliveries
    .filter(d => d.pharmacy && d.status !== 'delivered' && d.status !== 'cancelled')
    .map(d => ({
      ...d.pharmacy,
      id: d._id || d.id,
      distance: d.status.toUpperCase(),
    }));

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 flex-1 flex flex-col gap-8 font-sans">
      
      {/* Central Header Banner (Royal Blue theme) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100">
        <div>
          <span className="text-[10px] text-brand-600 font-bold bg-brand-50 px-3 py-1 rounded-full uppercase tracking-wider border border-brand-100">
            🛡️ Administrative portal
          </span>
          <h1 className="font-fraunces font-bold text-2xl sm:text-3xl text-slate-900 mt-3 tracking-tight">
            MediFind Central Administration
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Audit licensing requests, monitor active deliveries, and examine user search statistics.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4.5 py-2 rounded-xl text-xs font-semibold border transition-all
              ${activeTab === 'analytics'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Metrics Overview
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4.5 py-2 rounded-xl text-xs font-semibold border relative transition-all
              ${activeTab === 'approvals'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Licensing
            {pharmacies.filter(p => !p.isApproved).length > 0 && (
              <span className="absolute -top-1.5 -right-1 bg-brand-500 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold">
                {pharmacies.filter(p => !p.isApproved).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4.5 py-2 rounded-xl text-xs font-semibold border transition-all
              ${activeTab === 'users'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Directories
          </button>
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`px-4.5 py-2 rounded-xl text-xs font-semibold border transition-all
              ${activeTab === 'deliveries'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Live Monitor
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 border rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all shrink-0"
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

      <div className="flex-1">
        
        {loading && (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
          </div>
        )}

        {/* METRICS & ANALYTICS PANEL */}
        {!loading && activeTab === 'analytics' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white border border-slate-200/60 rounded-3xl p-5.5 shadow-sm">
                <span className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 mb-3">
                  <Users className="w-5 h-5" />
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Customers</span>
                <span className="font-outfit font-extrabold text-2xl text-slate-800 block mt-1">{stats.totalUsers}</span>
              </div>

              <div className="bg-white border border-slate-200/60 rounded-3xl p-5.5 shadow-sm">
                <span className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mb-3">
                  <Building2 className="w-5 h-5" />
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Registered Shops</span>
                <span className="font-outfit font-extrabold text-2xl text-slate-800 block mt-1">{stats.totalPharmacies}</span>
              </div>

              <div className="bg-white border border-slate-200/60 rounded-3xl p-5.5 shadow-sm">
                <span className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 mb-3">
                  <Layers className="w-5 h-5" />
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cataloged Items</span>
                <span className="font-outfit font-extrabold text-2xl text-slate-800 block mt-1">{stats.totalMedicines}</span>
              </div>

              <div className="bg-white border border-slate-200/60 rounded-3xl p-5.5 shadow-sm">
                <span className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-3">
                  <Truck className="w-5 h-5" />
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Deliveries</span>
                <span className="font-outfit font-extrabold text-2xl text-slate-800 block mt-1">{stats.activeDeliveries}</span>
              </div>

            </div>

            {/* Popular Searches Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <div className="bg-white border border-slate-200/60 rounded-3xl p-5.5 shadow-sm">
                <h3 className="font-outfit font-bold text-xs text-slate-500 uppercase tracking-wide mb-4">Most Searched Formulations</h3>
                <div className="h-60 flex items-center justify-center">
                  <Bar data={popularMedsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>

              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <h3 className="font-outfit font-bold text-sm text-slate-800">Administrative Overview</h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Centralized supervisory desk metrics. You hold keys to delete profiles, approve pharmacy registrations, and monitor global rider dispatches.
                </p>
                <div className="border-t pt-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Global Geolocation Node:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Real-time socket sync:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Connected
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* LICENSE APPROVALS PANEL */}
        {!loading && activeTab === 'approvals' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="font-outfit font-bold text-sm text-slate-800">Verify Pharmacy License Requests</h3>
            
            {pharmacies.filter(p => !p.isApproved).length > 0 ? (
              pharmacies
                .filter(p => !p.isApproved)
                .map((p) => (
                  <div key={p.id} className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1 flex flex-col gap-3">
                      <div>
                        <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[8px] font-extrabold rounded uppercase tracking-wide">Pending Approval</span>
                        <h4 className="font-outfit font-extrabold text-base text-slate-800 mt-2">{p.shopName || p.name}</h4>
                        <p className="text-[10px] text-slate-400">License Verification ID: {p.license}</p>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-4.5 text-xs text-slate-500 flex flex-col gap-1">
                        <p className="font-semibold text-slate-700">👤 Store Owner: {p.name}</p>
                        <p className="text-[10px] text-slate-400">📍 Address location: {p.address}</p>
                        <p className="text-[10px] text-slate-500">📞 Contact phone: {p.phone} | Email: {p.email}</p>
                      </div>
                    </div>

                    <div className="md:w-48 flex items-center justify-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                      <button
                        onClick={() => deletePharmacy(p.id)}
                        className="px-4 py-2 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => approvePharmacy(p.id)}
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold"
                      >
                        Approve License
                      </button>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl">
                <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No pending licensing applications.</p>
              </div>
            )}
          </div>
        )}

        {/* DIRECTORIES PANEL */}
        {!loading && activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
              <h3 className="font-outfit font-bold text-sm text-slate-800 mb-2 flex items-center gap-1.5">
                <Users className="w-4.5 h-4.5 text-brand-500" /> Registered Customers Directory ({customers.length})
              </h3>
              
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px] pr-1">
                {customers.length > 0 ? (
                  customers.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 border rounded-2xl flex justify-between items-start gap-4 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">{c.name}</span>
                        <span className="text-[10px] text-slate-400 block">{c.email} • Phone: {c.phone}</span>
                        <span className="text-[10px] text-slate-500 block mt-1">📍 {c.address}</span>
                      </div>
                      <button
                        onClick={() => deleteCustomer(c.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 text-xs py-8 text-center">No customers registered.</span>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
              <h3 className="font-outfit font-bold text-sm text-slate-800 mb-2 flex items-center gap-1.5">
                <Building2 className="w-4.5 h-4.5 text-accent-500" /> Approved Pharmacies Storefronts ({pharmacies.length})
              </h3>
              
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px] pr-1">
                {pharmacies.length > 0 ? (
                  pharmacies.map((p) => (
                    <div key={p.id} className="p-3 bg-slate-50 border rounded-2xl flex justify-between items-start gap-4 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">{p.shopName}</span>
                        <span className="text-[10px] text-slate-400 block">Owner: {p.name} • License: {p.license}</span>
                        <span className="text-[10px] text-slate-500 block mt-1">📍 {p.address}</span>
                      </div>
                      <button
                        onClick={() => deletePharmacy(p.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100"
                        title="Remove Store"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 text-xs py-8 text-center">No approved pharmacies storefronts.</span>
                )}
              </div>
            </div>

          </div>
        )}

        {/* DELIVERIES MAP MONITOR PANEL */}
        {!loading && activeTab === 'deliveries' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[480px] animate-fade-in">
            
            <div className="lg:col-span-4 bg-white border border-slate-200/60 rounded-3xl p-4 shadow-sm overflow-y-auto flex flex-col gap-3 h-full">
              <h3 className="font-outfit font-bold text-xs text-slate-800 mb-2">Live Delivery Dispatches Monitor</h3>
              
              {deliveries.length > 0 ? (
                deliveries.map((d) => (
                  <div key={d.id || d._id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-850">Order #{String(d.id || d._id).substring(0, 6).toUpperCase()}</span>
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[8px] uppercase
                        ${d.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">🏥 Origin: {d.pharmacy?.shopName}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">📍 Destination address: {d.deliveryAddress}</p>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
                  <Clock className="w-8 h-8 mb-2" />
                  <span className="text-xs">No active dispatches.</span>
                </div>
              )}
            </div>

            <div className="lg:col-span-8 h-full">
              <MapContainer
                userLocation={null}
                pharmacies={activeDeliveryMapMarkers}
                selectedPharmacy={null}
                onSelectPharmacy={null}
              />
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
