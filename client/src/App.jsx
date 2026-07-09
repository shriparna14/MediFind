import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AuthPages from './pages/AuthPages';
import CustomerDashboard from './pages/CustomerDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import AdminDashboard from './pages/AdminDashboard';

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

// Route controller that forces a dashboard sub-tab depending on route
const TabWrapper = ({ Component, initialTab }) => {
  // We can pass initialTab as a custom prop to the component
  return <Component key={initialTab} defaultTab={initialTab} />;
};

function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPages />} />
          <Route path="/register" element={<AuthPages />} />
          <Route path="/forgot-password" element={<AuthPages />} />

          {/* Customer Protected Routes */}
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
          <MainLayout />
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}
