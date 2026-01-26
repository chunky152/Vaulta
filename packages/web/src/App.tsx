import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/Home';
import { HowItWorksPage } from './pages/HowItWorks';
import { SearchPage } from './pages/Search';
import { LocationDetailPage } from './pages/LocationDetail';
import { BookingPage } from './pages/Booking';
import { CheckoutPage } from './pages/Checkout';
import { DashboardPage } from './pages/Dashboard';
import { BookingsPage } from './pages/Bookings';
import { InventoryPage } from './pages/Inventory';
import { ProfilePage } from './pages/Profile';
import { LoginPage } from './pages/auth/Login';
import { RegisterPage } from './pages/auth/Register';
import { ForgotPasswordPage } from './pages/auth/ForgotPassword';
import { ResetPasswordPage } from './pages/auth/ResetPassword';
import { AdminDashboardPage } from './pages/admin/Dashboard';
import { AdminLocationsPage } from './pages/admin/Locations';
import { AdminBookingsPage } from './pages/admin/Bookings';
import { AdminUsersPage } from './pages/admin/Users';
import { useAuthStore } from './stores/auth.store';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="locations/:id" element={<LocationDetailPage />} />

        {/* Guest only routes */}
        <Route path="login" element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        } />
        <Route path="register" element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        } />
        <Route path="forgot-password" element={
          <GuestRoute>
            <ForgotPasswordPage />
          </GuestRoute>
        } />
        <Route path="reset-password" element={
          <GuestRoute>
            <ResetPasswordPage />
          </GuestRoute>
        } />

        {/* Protected routes */}
        <Route path="booking/:unitId" element={
          <ProtectedRoute>
            <BookingPage />
          </ProtectedRoute>
        } />
        <Route path="checkout/:bookingId" element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        } />
        <Route path="dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="bookings" element={
          <ProtectedRoute>
            <BookingsPage />
          </ProtectedRoute>
        } />
        <Route path="inventory" element={
          <ProtectedRoute>
            <InventoryPage />
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="admin" element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        } />
        <Route path="admin/locations" element={
          <AdminRoute>
            <AdminLocationsPage />
          </AdminRoute>
        } />
        <Route path="admin/bookings" element={
          <AdminRoute>
            <AdminBookingsPage />
          </AdminRoute>
        } />
        <Route path="admin/users" element={
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        } />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
