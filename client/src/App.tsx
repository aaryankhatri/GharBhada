import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PropertyDetail from './pages/PropertyDetail';
import BookingForm from './pages/BookingForm';
import TenantDashboard from './pages/TenantDashboard';
import LandlordDashboard from './pages/LandlordDashboard';
import AddProperty from './pages/AddProperty';
import TaxCalculatorPage from './pages/TaxCalculatorPage';
import PaymentCallback from './pages/PaymentCallback';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import WhoAmI from './pages/WhoAmI';
import type { ReactNode } from 'react';

function Protected({ children, role }: { children: ReactNode; role?: 'tenant' | 'landlord' | 'admin' }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-gray-500 text-center py-10">लोड हुँदैछ...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/welcome" element={<WhoAmI />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/properties/:id" element={<PropertyDetail />} />
        <Route path="/tax-calculator" element={<TaxCalculatorPage />} />
        <Route path="/payment/callback" element={<PaymentCallback />} />
        <Route path="/properties/:id/book" element={<Protected role="tenant"><BookingForm /></Protected>} />
        <Route path="/tenant" element={<Protected role="tenant"><TenantDashboard /></Protected>} />
        <Route path="/landlord" element={<Protected role="landlord"><LandlordDashboard /></Protected>} />
        <Route path="/landlord/add-property" element={<Protected role="landlord"><AddProperty /></Protected>} />
        <Route path="/admin" element={<Protected role="admin"><AdminDashboard /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
