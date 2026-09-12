import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import LandingPage from './pages/LandingPage';
import AuthPages from './pages/AuthPages';
import CustomerDashboard from './pages/CustomerDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import AdminDashboard from './pages/AdminDashboard';

import ChatDrawer from './components/ChatDrawer';
import { Sparkles } from 'lucide-react';

// Route protection for Authenticated users & specific roles
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ alert: 'You must sign in to view this dashboard.' }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function MainLayout() {
  const { user } = useAuth();
  const [isAiChatOpen, setIsAiChatOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 relative">
      <Navbar />
      <CartDrawer />
      
      {/* Floating MediFind AI launcher */}
      {!isAiChatOpen && (
        <button
          onClick={() => setIsAiChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-slate-700/50 hover:scale-105 transition-all cursor-pointer shadow-brand-500/20"
          title="Open MediFind AI Assistant"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <Sparkles className="w-4 h-4 text-emerald-300" />
          <span>MediFind AI</span>
        </button>
      )}

      {/* Persistent MediFind AI Chat Drawer */}
      {isAiChatOpen && (
        <ChatDrawer
          activeUserId={user?.id || user?._id}
          activeUserName={user?.name || 'User'}
          onClose={() => setIsAiChatOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPages />} />
          <Route path="/register" element={<AuthPages />} />
          <Route path="/forgot-password" element={<AuthPages />} />

          {/* Customer Protected Routes */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/reservations"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/deliveries"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/prescriptions"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Pharmacy Protected Routes */}
          <Route
            path="/pharmacy"
            element={
              <ProtectedRoute allowedRoles={['pharmacy']}>
                <PharmacyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy/inventory"
            element={
              <ProtectedRoute allowedRoles={['pharmacy']}>
                <PharmacyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy/reservations"
            element={
              <ProtectedRoute allowedRoles={['pharmacy']}>
                <PharmacyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy/deliveries"
            element={
              <ProtectedRoute allowedRoles={['pharmacy']}>
                <PharmacyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy/prescriptions"
            element={
              <ProtectedRoute allowedRoles={['pharmacy']}>
                <PharmacyDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/approvals"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/deliveries"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <CartProvider>
            <MainLayout />
          </CartProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}
