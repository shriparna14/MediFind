import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import MapContainer from '../components/MapContainer';
import MedicineCard from '../components/MedicineCard';
import Modal from '../components/ui/Modal';
import QuantityStepper from '../components/ui/QuantityStepper';
import { 
  medicineService, pharmacyService, reservationService, orderService 
} from '../services/api';
import { 
  Search, MapPin, AlertCircle, ShoppingBag, Truck, ShieldAlert, BadgeInfo,
  ChevronDown, CheckCircle, Star, ArrowRight, UploadCloud, Clock, ShieldCheck, Zap,
  ShoppingCart
} from 'lucide-react';

export default function LandingPage() {
  const { user, addToCart } = useAuth();
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [userLoc, setUserLoc] = useState({ latitude: 12.9716, longitude: 77.5946 }); // Bengaluru default
  const [locationQuery, setLocationQuery] = useState('');
  const [searchRadius, setSearchRadius] = useState(15);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('');

  // Modals state
  const [activeMedicine, setActiveMedicine] = useState(null);
  const [reserveQty, setReserveQty] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [deliveryPhone, setDeliveryPhone] = useState(user?.phone || '');
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  const [message, setMessage] = useState({ type: '', text: '' });

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Detect location on load or fallback to user profile address
  useEffect(() => {
    if (user && user.address) {
      setLocationQuery(user.address);
      fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(user.address)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            setUserLoc({
              latitude: Number(data[0].lat),
              longitude: Number(data[0].lon)
            });
          }
        })
        .catch(err => console.error('Error geocoding user address:', err));
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLoc({ latitude: lat, longitude: lng });
          
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(res => res.json())
            .then(data => {
              if (data && data.address) {
                const name = data.address.city || data.address.town || data.address.suburb || data.address.state || 'My Location';
                setLocationQuery(name);
              }
            })
            .catch(err => console.error('Reverse geocode error:', err));
        },
        () => {
          console.warn('Location permission denied, using default coordinates.');
          setLocationQuery('Bengaluru');
        }
      );
    } else {
      setLocationQuery('Bengaluru');
    }
  }, [user]);

  // Fetch all approved pharmacies on load to show default markers
  useEffect(() => {
    const fetchPharmacies = async () => {
      try {
        const res = await pharmacyService.getNearby(userLoc.latitude, userLoc.longitude, searchRadius);
        if (res.data.success) {
          setPharmacies(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching pharmacies:', err);
      }
    };
    fetchPharmacies();
  }, [userLoc, searchRadius]);

  const handleGeocodeLocation = async (query = locationQuery) => {
    if (!query.trim()) return null;
    try {
      setLoading(true);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newLoc = {
          latitude: Number(lat),
          longitude: Number(lon)
        };
        setUserLoc(newLoc);
        const cleanName = display_name.split(',')[0];
        setLocationQuery(cleanName);
        setMessage({ type: 'success', text: `Location set to ${display_name}` });
        return newLoc;
      } else {
        setMessage({ type: 'error', text: `Could not resolve location "${query}".` });
        return null;
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setMessage({ type: 'error', text: 'Error resolving location coordinates.' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const triggerInstantSearch = async (term, customLoc) => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    setSelectedPharmacy(null);

    const activeLoc = customLoc || userLoc;

    try {
      const res = await medicineService.search(term, category);
      
      if (res.data.success) {
        const list = res.data.data.map(med => {
          if (med.pharmacy && activeLoc) {
            const dist = getDistance(
              activeLoc.latitude,
              activeLoc.longitude,
              med.pharmacy.latitude,
              med.pharmacy.longitude
            );
            med.distance = Number(dist.toFixed(2));
          }
          return med;
        });

        // Filter by radius
        const filteredList = list.filter(med => {
          if (searchRadius >= 99999) return true;
          return (med.distance || 0) <= searchRadius;
        });

        // Sort by closest first
        filteredList.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        setMedicines(filteredList);

        // Load alternatives
        const alts = res.data.alternatives.map(med => {
          if (med.pharmacy && activeLoc) {
            const dist = getDistance(
              activeLoc.latitude,
              activeLoc.longitude,
              med.pharmacy.latitude,
              med.pharmacy.longitude
            );
            med.distance = Number(dist.toFixed(2));
          }
          return med;
        });

        const filteredAlts = alts.filter(med => {
          if (searchRadius >= 99999) return true;
          return (med.distance || 0) <= searchRadius;
        });
        filteredAlts.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        setAlternatives(filteredAlts);

        // Update markers to only show pharmacies containing this medicine within the radius
        const activePharms = filteredList
          .filter(m => m.pharmacy)
          .map(m => ({
            ...m.pharmacy,
            distance: m.distance
          }));
        
        const uniquePharms = [];
        const seen = new Set();
        for (const p of activePharms) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            uniquePharms.push(p);
          }
        }
        setPharmacies(uniquePharms.length > 0 ? uniquePharms : []);

        // Smooth scroll to results
        document.getElementById('search-results-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Search error:', err);
      setMessage({ type: 'error', text: 'Error searching medicines.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle search form submission
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    
    let currentLoc = userLoc;
    if (locationQuery.trim()) {
      const geocoded = await handleGeocodeLocation(locationQuery);
      if (geocoded) currentLoc = geocoded;
    }

    if (!searchQuery.trim() && !category) return;
    triggerInstantSearch(searchQuery, currentLoc);
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Search category handler
  const selectCategory = (cat) => {
    const newCat = category === cat ? '' : cat;
    setCategory(newCat);
  };

  useEffect(() => {
    if (category) {
      handleSearch();
    }
  }, [category]);

  // Reservation Action
  const triggerReservationModal = (med) => {
    if (!user) {
      navigate('/login', { state: { alert: 'Please sign in to reserve medicines.' } });
      return;
    }
    setActiveMedicine(med);
    setReserveQty(1);
    setIsReserveModalOpen(true);
  };

  const handleReserve = async () => {
    try {
      const res = await reservationService.create(
        activeMedicine.id || activeMedicine._id,
        reserveQty
      );
      if (res.data.success) {
        setIsReserveModalOpen(false);
        setMessage({
          type: 'success',
          text: `Reservation placed. Pickup Code: ${res.data.data.pickupCode}. Please collect from ${activeMedicine.pharmacy.shopName} within 24 hours.`
        });
        handleSearch();
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to place reservation'
      });
    }
  };

  // Emergency Delivery Action
  const triggerDeliveryModal = (med) => {
    if (!user) {
      navigate('/login', { state: { alert: 'Please sign in to order emergency deliveries.' } });
      return;
    }
    setActiveMedicine(med);
    setReserveQty(1);
    setDeliveryAddress(user.address || '');
    setDeliveryPhone(user.phone || '');
    setIsDeliveryModalOpen(true);
  };

  const handleDeliveryOrder = async () => {
    if (!deliveryAddress || !deliveryPhone) {
      alert('Please fill out address and phone details.');
      return;
    }

    try {
      const res = await orderService.create({
        pharmacyId: activeMedicine.pharmacyId || activeMedicine.pharmacy?.id || activeMedicine.pharmacy?._id,
        items: [{
          medicineId: activeMedicine.id || activeMedicine._id,
          quantity: reserveQty
        }],
        deliveryAddress,
        deliveryPhone,
        deliveryType: 'emergency'
      });
      if (res.data.success) {
        setIsDeliveryModalOpen(false);
        setMessage({
          type: 'success',
          text: `Emergency delivery requested! Pharmacy: ${activeMedicine.pharmacy.shopName}. Track dispatch progress in your dashboard.`
        });
        handleSearch();
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to request emergency delivery'
      });
    }
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col font-sans">
      
      {/* 1. HERO SECTION (Apple-level simplicity, large spacing) */}
      <section className="relative pt-20 pb-24 px-6 lg:px-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left column text */}
        <div className="lg:col-span-7 flex flex-col items-start text-left gap-6 z-10">
          <span className="bg-brand-50 text-brand-600 text-xs px-3.5 py-1.5 rounded-full font-bold tracking-wider uppercase inline-flex items-center gap-1 border border-brand-100">
            <Zap className="w-3 h-3 text-brand-500 fill-brand-500" /> Real-Time Health Network
          </span>
          
          <h1 className="font-fraunces font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-slate-900 leading-[1.08]">
            Find Medicines Near You in <span className="text-brand-500 font-sans italic">Seconds</span>
          </h1>
          
          <p className="text-slate-500 text-sm sm:text-base max-w-lg leading-relaxed">
            MediFind checks live stock levels across verified local pharmacies in real-time. Block inventory for pickup or request a 10-minute emergency delivery.
          </p>

          {/* Search bar inside Hero (Glassmorphism layout) */}
          <form onSubmit={handleSearch} className="w-full max-w-3xl flex flex-col md:flex-row gap-2.5 p-2 bg-white rounded-[24px] premium-shadow border border-slate-200/50">
            {/* Medicine Query */}
            <div className="flex-[2] flex items-center px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
              <Search className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Enter medicine name (e.g., Dolo 650, Calpol)..."
                className="w-full ml-2 text-xs text-slate-800 focus:outline-none placeholder-slate-400 bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Location Query */}
            <div className="flex-1 flex items-center px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
              <MapPin className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Location (e.g. Punjab)..."
                className="w-full ml-2 text-xs text-slate-850 focus:outline-none placeholder-slate-400 bg-transparent font-medium"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onBlur={() => handleGeocodeLocation()}
              />
            </div>

            {/* Search Radius Dropdown */}
            <div className="md:w-36 flex items-center px-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
              <select
                className="w-full text-xs text-slate-600 focus:outline-none bg-transparent font-bold border-none cursor-pointer"
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
              >
                <option value={5}>Within 5 km</option>
                <option value={15}>Within 15 km</option>
                <option value={50}>Within 50 km</option>
                <option value={2000}>Within 2000 km</option>
                <option value={99999}>Global (All)</option>
              </select>
            </div>
            
            <button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-3.5 rounded-2xl font-semibold transition-all duration-300 text-xs shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 active:scale-95 shrink-0"
            >
              Search
            </button>
          </form>

          {/* Search suggestions */}
          <div className="flex items-center gap-2.5 flex-wrap text-xs text-slate-400">
            <span>Try searching:</span>
            {['Dolo 650', 'Crocin 650', 'Calpol 650', 'Combiflam'].map((s) => (
              <button
                key={s}
                onClick={() => { setSearchQuery(s); triggerInstantSearch(s); }}
                className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200/60 rounded-full transition-colors font-medium text-slate-600 cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Right column abstract graphic illustration */}
        <div className="lg:col-span-5 hidden lg:flex justify-center relative">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-brand-200/20 rounded-full filter blur-3xl"></div>
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-accent-200/20 rounded-full filter blur-3xl"></div>
          
          <svg className="w-full max-w-[400px] drop-shadow-xl animate-float" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background elements */}
            <circle cx="200" cy="200" r="160" fill="url(#heroGrad)" opacity="0.8"/>
            <rect x="120" y="120" width="160" height="160" rx="36" fill="white" className="premium-shadow"/>
            
            {/* Grid lines resembling routing */}
            <path d="M80 200 H320" stroke="#f1f5f9" strokeWidth="2" strokeDasharray="6 6"/>
            <path d="M200 80 V320" stroke="#f1f5f9" strokeWidth="2" strokeDasharray="6 6"/>
            
            {/* Glowing health icons */}
            <g transform="translate(180, 160)" className="text-brand-500 fill-brand-50">
              <rect width="40" height="40" rx="12" fill="#eff6ff"/>
              <path d="M20 12V28M12 20H28" stroke="#2563eb" strokeWidth="3" strokeLinecap="round"/>
            </g>

            {/* Glowing satellite icons representing pharmacies */}
            <circle cx="290" cy="140" r="20" fill="#ccfbf1" className="premium-shadow"/>
            <text x="283" y="146" fontSize="16">🏥</text>

            <circle cx="100" cy="280" r="20" fill="#fef3c7" className="premium-shadow"/>
            <text x="93" y="286" fontSize="16">📍</text>

            <circle cx="280" cy="290" r="22" fill="#fae8ff" className="premium-shadow"/>
            <text x="272" y="296" fontSize="18">🏍️</text>

            <defs>
              <radialGradient id="heroGrad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" transform="translate(200 200) rotate(90) scale(160)">
                <stop stopColor="#eff6ff"/>
                <stop offset="1" stopColor="#dbeafe" stopOpacity="0.4"/>
              </radialGradient>
            </defs>
          </svg>
        </div>
      </section>

      {/* 2. FEATURE CARDS (Linear-inspired clean cards with rounded corners 24px) */}
      <section className="bg-slate-50 border-t border-slate-100 py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-12">
          
          <div className="text-center max-w-xl mx-auto flex flex-col gap-3">
            <h2 className="font-outfit font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Engineered for Medical Emergencies
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Ditch calling multiple shops. Our live integrations show active stocks, distances, and verification queues.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col gap-4">
              <span className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                <Clock className="w-5.5 h-5.5" />
              </span>
              <h3 className="font-outfit font-bold text-base text-slate-800">Live Medicine Availability</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Pharmacies verify stock numbers dynamically. Users view live quantities before placing requests.
              </p>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col gap-4">
              <span className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <MapPin className="w-5.5 h-5.5" />
              </span>
              <h3 className="font-outfit font-bold text-base text-slate-800">Nearby Lookup</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Calculates geographical distances closest-first and logs generic alternatives in stock nearby.
              </p>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col gap-4">
              <span className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                <UploadCloud className="w-5.5 h-5.5" />
              </span>
              <h3 className="font-outfit font-bold text-base text-slate-800">Prescription Upload</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Securely upload PDF/PNG prescriptions to Cloudinary for pharmacy approval before delivery setup.
              </p>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col gap-4">
              <span className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                <Truck className="w-5.5 h-5.5" />
              </span>
              <h3 className="font-outfit font-bold text-base text-slate-800">Emergency Delivery</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                One-click dispatch dispatches a local pharmacy rider. Live status trackers watch arrival times.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. MEDICINE SEARCH RESULTS & SPLIT MAP VIEW */}
      <section id="search-results-section" className="py-20 px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
        
        {/* Banner if search is active or showing default pharmacies */}
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-fraunces font-bold text-xl sm:text-2xl text-slate-900 tracking-tight">
              {medicines.length > 0 ? `Inventory Search Results (${medicines.length})` : 'Nearby Pharmacy Network'}
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Select pharmacy items below to look up their exact routing directions.
            </p>
          </div>
          {userLoc && (
            <span className="text-[10px] bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-semibold border">
              Center coordinates: {userLoc.latitude.toFixed(4)}, {userLoc.longitude.toFixed(4)}
            </span>
          )}
        </div>

        {message.text && (
          <div className={`p-4 rounded-2xl border flex items-start gap-2.5 animate-fade-in
            ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-semibold">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left panel: cards (Split Screen layout) */}
          <div className="lg:col-span-7 flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-2">
            
            {loading ? (
              // 8. Skeleton Shimmer UI
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between">
                      <div className="w-1/3 h-5 rounded-lg animate-shimmer"></div>
                      <div className="w-12 h-6 rounded-lg animate-shimmer"></div>
                    </div>
                    <div className="w-1/2 h-3.5 rounded-lg animate-shimmer"></div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-slate-50">
                      <div className="w-1/4 h-3.5 rounded-lg animate-shimmer"></div>
                      <div className="w-1/5 h-5 rounded-full animate-shimmer"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : medicines.length > 0 ? (
              <div className="flex flex-col gap-4">
                {medicines.map((med) => (
                  <MedicineCard
                    key={med.id || med._id}
                    med={med}
                    onSelect={() => med.pharmacy && setSelectedPharmacy(med.pharmacy)}
                    onReserve={triggerReservationModal}
                    onDelivery={triggerDeliveryModal}
                    onAddToCart={addToCart}
                    isSelected={selectedPharmacy && selectedPharmacy.id === med.pharmacy?.id}
                  />
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center flex flex-col items-center">
                <span className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 mb-4 font-bold text-lg">
                  ⚠️
                </span>
                <h3 className="font-outfit font-bold text-slate-800">Formulation Unavailable</h3>
                <p className="text-slate-500 text-xs mt-1 max-w-sm">
                  We couldn't locate stock for "{searchQuery}" in neighboring shops. See generic alternatives below.
                </p>
              </div>
            ) : (
              // Nearby Pharmacies default view
              <div className="flex flex-col gap-3">
                {pharmacies.length > 0 ? (
                  pharmacies.map((p) => (
                    <div
                      key={p.id || p._id}
                      onClick={() => setSelectedPharmacy(p)}
                      className={`bg-white rounded-3xl p-4.5 border cursor-pointer hover:shadow-sm transition-all flex items-start gap-4
                        ${selectedPharmacy && selectedPharmacy.id === p.id ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-slate-100'}`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sm shrink-0">
                        🏥
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-outfit font-bold text-sm text-slate-800 truncate">{p.shopName || p.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{p.address}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                            🚗 {p.distance !== undefined ? `${p.distance} km away` : 'Nearby'}
                          </span>
                          <span className="text-[10px] bg-emerald-50 px-2 py-0.5 rounded text-emerald-700 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Open 24/7
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center flex flex-col items-center">
                    <span className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 mb-4 font-bold text-lg">
                      📍
                    </span>
                    <h3 className="font-outfit font-bold text-slate-800">No Nearby Pharmacies</h3>
                    <p className="text-slate-500 text-xs mt-1 max-w-sm">
                      There are no registered pharmacies within {searchRadius}km of your current location ({locationQuery || 'selected coordinates'}). Try choosing "Within 2000 km" or "Global (All)" from the dropdown above to look up registered pharmacies.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Alternatives suggestion panel */}
            {!loading && alternatives.length > 0 && (
              <div className="bg-amber-50/30 border border-amber-200/40 rounded-3xl p-5 mt-2">
                <h3 className="font-outfit font-bold text-xs text-amber-800 flex items-center gap-1.5 mb-2.5">
                  <BadgeInfo className="w-4 h-4 text-amber-600" />
                  Recommended Generic Equivalents
                </h3>
                <p className="text-xs text-amber-600/80 mb-4 leading-normal">
                  Your search query is out of stock. These recommended alternatives contain the same active formula and are available now:
                </p>
                <div className="flex flex-col gap-3">
                  {alternatives.map((alt) => (
                    <div key={alt.id || alt._id} className="bg-white rounded-2xl p-4 border border-amber-100 flex justify-between items-center gap-4 shadow-sm">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">{alt.name} <span className="font-normal text-slate-400">({alt.brand})</span></h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">🏥 {alt.pharmacy?.shopName} • 🚗 {alt.distance} km away</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-700 mr-2">₹{alt.price}</span>
                        <button
                          onClick={() => triggerReservationModal(alt)}
                          className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-[10px] font-bold transition-all shadow"
                        >
                          Reserve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right panel: map (Split screen layout) */}
          <div className="lg:col-span-5 h-[350px] lg:h-auto min-h-[400px]">
            <MapContainer
              userLocation={userLoc}
              pharmacies={pharmacies}
              selectedPharmacy={selectedPharmacy}
              onSelectPharmacy={setSelectedPharmacy}
            />
          </div>
        </div>

      </section>

      {/* 4. TESTIMONIALS (Airbnb inspired clean layout) */}
      <section className="bg-white border-t border-b border-slate-100 py-20 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-12">
          <div className="text-center max-w-lg mx-auto flex flex-col gap-3">
            <h2 className="font-fraunces font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Trusted by Patients & Providers
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Discover how customers are avoiding queues during critical emergency pickups.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100/50">
              <div className="flex gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
              </div>
              <p className="text-slate-600 text-xs italic leading-relaxed">
                "During my dad's heart congestion, we couldn't find cardilate anywhere. MediFind located a pharmacy 2km away with 5 strips left. Saved us precious time."
              </p>
              <div className="mt-2 border-t pt-3 border-slate-200/50">
                <span className="font-bold text-xs text-slate-800 block">Ananya Sharma</span>
                <span className="text-[10px] text-slate-400">Koramangala, Patient</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100/50">
              <div className="flex gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
              </div>
              <p className="text-slate-600 text-xs italic leading-relaxed">
                "Our daily walk-in pharmacy stock queries went down significantly. Customers now block items online via the dashboard and pick them up with codes."
              </p>
              <div className="mt-2 border-t pt-3 border-slate-200/50">
                <span className="font-bold text-xs text-slate-800 block">Dr. Ramesh Kumar</span>
                <span className="text-[10px] text-slate-400">Apollo Pharmacy Owner</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100/50">
              <div className="flex gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
              </div>
              <p className="text-slate-600 text-xs italic leading-relaxed">
                "The emergency dispatch service works flawlessly. The map calculations are precise, and prescriptions are uploaded instantly via mobile."
              </p>
              <div className="mt-2 border-t pt-3 border-slate-200/50">
                <span className="font-bold text-xs text-slate-800 block">Saurabh Verma</span>
                <span className="text-[10px] text-slate-400">Indiranagar, Customer</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ SECTION (Notion-style accordion FAQs) */}
      <section className="py-20 px-6 lg:px-8 max-w-3xl mx-auto w-full flex flex-col gap-8">
        <h2 className="font-fraunces font-bold text-2xl text-center text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h2>

        <div className="flex flex-col gap-3">
          {[
            { q: 'How does live stock tracking work?', a: 'Partner pharmacies have their inventory systems integrated with the MediFind server. Whenever stock changes at their end, updates are broadcasted immediately.' },
            { q: 'Is a prescription mandatory for all medicines?', a: 'No. Prescription limits only apply to schedule H drugs. If required, you can upload a scan of your prescription during checkout.' },
            { q: 'What is the delivery radius for emergency dispatch?', a: 'Emergency deliveries operate within a 10km radius from the source pharmacy to ensure rapid transit times.' },
            { q: 'How do I pick up reserved items?', a: 'When you block a reservation, the app generates a unique pickup code. Present this code at the pharmacy counter to pay and collect.' }
          ].map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={idx} className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-5 py-4.5 flex justify-between items-center text-left text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-500' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-500 leading-relaxed border-t border-slate-50 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. MODERN FOOTER (Stripe inspired minimal footer) */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-xs">
          <div className="flex flex-col gap-4">
            <span className="font-outfit font-bold text-base text-white tracking-tight">
              Medi<span className="text-brand-500">Find</span>
            </span>
            <p className="leading-relaxed">
              Premium decentralized local medicine inventory and emergency routing network.
            </p>
            <span className="text-[10px] text-slate-600 block mt-2">
              © {new Date().getFullYear()} MediFind. All rights reserved.
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-white text-xs tracking-wider uppercase">Product</h4>
            <Link to="/" className="hover:text-white transition-colors">Search Finder</Link>
            <Link to="/customer/reservations" className="hover:text-white transition-colors">Patient Portal</Link>
            <Link to="/pharmacy" className="hover:text-white transition-colors">Pharmacy Workspace</Link>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-white text-xs tracking-wider uppercase">Compliance</h4>
            <span className="cursor-pointer hover:text-white transition-colors">Verified Vendors Only</span>
            <span className="cursor-pointer hover:text-white transition-colors">HIPAA Standards Compliant</span>
            <span className="cursor-pointer hover:text-white transition-colors">FDA Regulations</span>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-white text-xs tracking-wider uppercase">Support</h4>
            <span className="cursor-pointer hover:text-white transition-colors">Help Center</span>
            <span className="cursor-pointer hover:text-white transition-colors">Emergency Helplines</span>
            <span className="cursor-pointer hover:text-white transition-colors">Developer APIs</span>
          </div>
        </div>
      </footer>

      {/* Reservation Modal */}
      <Modal
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
        title="Reserve Formulation"
      >
        {activeMedicine && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Your reservation blocks physical inventory in the store for 24 hours. Code generated after confirmation.
            </p>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-white">{activeMedicine.name}</h4>
                <p className="text-[10px] text-slate-400 font-semibold">{activeMedicine.pharmacy?.shopName}</p>
              </div>
              <span className="font-mono-plex font-bold text-accent-500 text-sm">₹{activeMedicine.price}</span>
            </div>

            {activeMedicine.prescriptionRequired && (
              <div className="p-3 bg-danger-50 border border-danger-100 text-danger-750 text-[10px] rounded-2xl flex items-start gap-2 leading-relaxed">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-danger-500" />
                <div>
                  <span className="font-bold">Prescription Required:</span> You must present a medical slip at the counter or upload a digital scan in your dashboard before collection.
                </div>
              </div>
            )}

            <QuantityStepper
              value={reserveQty}
              onChange={setReserveQty}
              max={activeMedicine.stock}
              label="Select Quantity (Units)"
            />

            <div className="flex justify-between items-center pt-2 border-t dark:border-slate-800 mt-2">
              <div>
                <p className="text-[10px] text-slate-400">Total Price</p>
                <span className="font-mono-plex font-bold text-base text-slate-900 dark:text-white">₹{(activeMedicine.price * reserveQty).toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsReserveModalOpen(false)}
                  className="px-4 py-2 border dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReserve}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Confirm Reservation
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Emergency Delivery Modal */}
      <Modal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        title="Request Emergency Dispatch"
      >
        {activeMedicine && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              We will allocate an active rider to deliver these medicines to your door immediately.
            </p>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-white">{activeMedicine.name}</h4>
                <p className="text-[10px] text-slate-400 font-semibold">{activeMedicine.pharmacy?.shopName}</p>
              </div>
              <span className="font-mono-plex font-bold text-accent-500 text-sm">₹{activeMedicine.price}</span>
            </div>

            {activeMedicine.prescriptionRequired && (
              <div className="p-3 bg-danger-50 border border-danger-100 text-danger-750 text-[10px] rounded-2xl flex items-start gap-2 leading-relaxed">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-danger-500" />
                <div>
                  <span className="font-bold">Prescription Required:</span> The dispatcher will verify your prescription status online before confirming rider pickup. Make sure to upload it!
                </div>
              </div>
            )}

            <QuantityStepper
              value={reserveQty}
              onChange={setReserveQty}
              max={activeMedicine.stock}
              label="Quantity"
            />

            <div className="flex flex-col gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Delivery Address</label>
                <textarea
                  rows={2}
                  className="w-full text-slate-800 dark:text-white text-xs p-2.5 border dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-slate-400 bg-slate-50 dark:bg-slate-800"
                  placeholder="Enter detailed delivery address..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Contact Phone</label>
                <input
                  type="text"
                  className="w-full text-slate-800 dark:text-white text-xs p-2.5 border dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-slate-400 bg-slate-50 dark:bg-slate-800"
                  placeholder="Enter phone number..."
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t dark:border-slate-800 mt-2">
              <div>
                <p className="text-[10px] text-slate-400">Total + Delivery</p>
                <span className="font-mono-plex font-bold text-base text-slate-900 dark:text-white">₹{(activeMedicine.price * reserveQty + 40).toFixed(2)}</span>
                <span className="text-[9px] text-slate-400 block font-mono-plex">+ ₹40 express fee</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="px-4 py-2 border dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeliveryOrder}
                  className="px-4 py-2 bg-danger-500 hover:bg-danger-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-danger-500/10 cursor-pointer"
                >
                  Request Dispatch
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
