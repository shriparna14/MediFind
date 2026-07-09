import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, User, Building2, Phone, Mail, Lock, FileText, MapPin, Eye, EyeOff } from 'lucide-react';

export default function AuthPages() {
  const { login, register, error, setError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // URL state check to see which form to load
  const isRegister = location.pathname === '/register';
  const isForgot = location.pathname === '/forgot-password';
  const redirectAlert = location.state?.alert || '';

  // Form Fields
  const [role, setRole] = useState('customer'); // 'customer' or 'pharmacy'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  // Pharmacy fields
  const [shopName, setShopName] = useState('');
  const [license, setLicense] = useState('');
  const [latitude, setLatitude] = useState('12.9716'); // Default Bengaluru
  const [longitude, setLongitude] = useState('77.5946');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setError('');

    const res = await login(email, password);
    setSubmitting(false);

    if (res.success) {
      if (res.user.role === 'admin') {
        navigate('/admin');
      } else if (res.user.role === 'pharmacy') {
        navigate('/pharmacy');
      } else {
        navigate('/');
      }
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    const payload = {
      name,
      email,
      password,
      role,
      phone,
      address,
      ...(role === 'pharmacy' ? {
        shopName,
        license,
        latitude: Number(latitude),
        longitude: Number(longitude)
      } : {})
    };

    const res = await register(payload);
    setSubmitting(false);

    if (res.success) {
      if (role === 'pharmacy') {
        setSuccessMsg(res.message);
        // Clear fields
        setName('');
        setEmail('');
        setPassword('');
        setPhone('');
        setAddress('');
        setShopName('');
        setLicense('');
      } else {
        navigate('/');
      }
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSuccessMsg('A password reset link has been dispatched to your registered email address.');
      setEmail('');
    }, 1200);
  };

  return (
    <div className="flex-1 bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white rounded-3xl p-8 border border-slate-200/60 shadow-xl shadow-slate-100/50 animate-fade-in relative overflow-hidden">
        {/* Decorative background gradients */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full filter blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent-500/5 rounded-full filter blur-xl"></div>

        <div className="text-center relative z-10">
          <span className="text-3xl">🩺</span>
          <h2 className="mt-2 font-outfit font-extrabold text-2xl text-slate-800">
            {isForgot
              ? 'Reset Password'
              : isRegister
              ? 'Join MediFind'
              : 'Sign In to MediFind'}
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 max-w-xs mx-auto">
            {isForgot
              ? 'Enter email to receive password recovery details'
              : isRegister
              ? 'Select your account type below to get started'
              : 'Access stock search, reservations and deliveries'}
          </p>
        </div>

        {/* Redirect warning from state */}
        {redirectAlert && !error && !successMsg && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
            <span className="font-medium">{redirectAlert}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl font-medium animate-fade-in">
            ✅ {successMsg}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-medium animate-fade-in">
            ⚠️ {error}
          </div>
        )}

        {/* LOGIN FORM */}
        {!isRegister && !isForgot && (
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  className="w-full text-xs p-3.5 pl-10 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 border-slate-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-600">Password</label>
                <Link to="/forgot-password" className="text-[10px] font-semibold text-brand-600 hover:text-brand-700">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="w-full text-xs p-3.5 pl-10 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 border-slate-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 text-xs disabled:opacity-50"
            >
              {submitting ? 'Authenticating...' : 'Sign In'}
            </button>

            <div className="text-center pt-2">
              <span className="text-[11px] text-slate-500">Don't have an account? </span>
              <Link to="/register" className="text-[11px] font-bold text-brand-600 hover:text-brand-700">
                Register here
              </Link>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {isRegister && !isForgot && (
          <form className="space-y-4" onSubmit={handleRegisterSubmit}>
            {/* Role Tab Toggle */}
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => { setRole('customer'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all
                  ${role === 'customer'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <User className="w-3.5 h-3.5" />
                Customer
              </button>
              <button
                type="button"
                onClick={() => { setRole('pharmacy'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all
                  ${role === 'pharmacy'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Pharmacy Owner
              </button>
            </div>

            {/* Common Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className="w-full text-xs p-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 border-slate-200"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Contact Phone</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    className="w-full text-xs p-3 pl-8.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 border-slate-200"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  className="w-full text-xs p-3 pl-8.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 border-slate-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="w-full text-xs p-3 pl-8.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 border-slate-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Residential Address</label>
              <textarea
                required
                rows={1.5}
                placeholder="123 Street name, Bengaluru"
                className="w-full text-slate-800 text-xs p-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 border-slate-200 placeholder-slate-400"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* Pharmacy Specific Fields */}
            {role === 'pharmacy' && (
              <div className="space-y-3 pt-2 border-t border-slate-100 animate-fade-in">
                <h4 className="text-xs font-bold text-slate-700">Business Credentials</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Shop Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Apollo Pharmacy"
                      className="w-full text-xs p-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 border-slate-200"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">License Number</label>
                    <div className="relative">
                      <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="LIC-123456"
                        className="w-full text-xs p-3 pl-8.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 border-slate-200"
                        value={license}
                        onChange={(e) => setLicense(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Latitude Coordinate</label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        className="w-full text-xs p-3 pl-8.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 border-slate-200"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Longitude Coordinate</label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        className="w-full text-xs p-3 pl-8.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 border-slate-200"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 block mt-1">
                  💡 Tip: Coordinates place your shop on the live finder map. (Indiranagar is ~12.97, 77.64)
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 text-xs disabled:opacity-50"
            >
              {submitting ? 'Creating Profile...' : 'Register Profile'}
            </button>

            <div className="text-center pt-2">
              <span className="text-[11px] text-slate-500">Already registered? </span>
              <Link to="/login" className="text-[11px] font-bold text-brand-600 hover:text-brand-700">
                Log in here
              </Link>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {isForgot && (
          <form className="space-y-4" onSubmit={handleForgotSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Registered Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  className="w-full text-xs p-3.5 pl-10 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 border-slate-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 text-xs disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Send Reset Link'}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-[11px] font-bold text-brand-600 hover:text-brand-700">
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
