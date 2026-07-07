import { Suspense, lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Layout from './components/Layout.jsx';
import { Skeleton } from './components/ui';
import { useAuth } from './context/AuthContext.jsx';

// Code splitting : chaque page est chargée à la demande.
// Home reste eager (page d'atterrissage), le reste est différé —
// notamment les pages lourdes (recharts, leaflet, html5-qrcode).
const EventDetails = lazy(() => import('./pages/EventDetails.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const PaymentInstructions = lazy(() => import('./pages/PaymentInstructions.jsx'));
const Success = lazy(() => import('./pages/Success.jsx'));
const Bookings = lazy(() => import('./pages/Bookings.jsx'));
const AdminEvents = lazy(() => import('./pages/AdminEvents.jsx'));
const AdminUsers = lazy(() => import('./pages/AdminUsers.jsx'));
const OrganizerEvents = lazy(() => import('./pages/OrganizerEvents.jsx'));
const OrganizerStatistics = lazy(() => import('./pages/OrganizerStatistics.jsx'));
const CheckIn = lazy(() => import('./pages/CheckIn.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));

function PageFallback() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement de la page">
      <Skeleton className="w-64 h-9" />
      <Skeleton className="w-full h-40 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>
  );
}

function App() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="event/:id" element={<EventDetails />} />
          <Route path="login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="register" element={user ? <Navigate to="/" /> : <Register />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={user ? <Checkout /> : <Navigate to="/login" />} />
          <Route path="payment" element={user ? <PaymentInstructions /> : <Navigate to="/login" />} />
          <Route path="success" element={<Success />} />
          <Route path="bookings" element={user ? <Bookings /> : <Navigate to="/login" />} />
          <Route path="profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="dashboard" element={user?.role === 'admin' ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="admin/events" element={user?.role === 'admin' ? <AdminEvents /> : user?.role === 'organizer' ? <OrganizerEvents /> : <Navigate to="/login" />} />
          <Route path="admin/users" element={user?.role === 'admin' ? <AdminUsers /> : <Navigate to="/login" />} />
          <Route path="organizer/statistics" element={user?.role === 'organizer' ? <OrganizerStatistics /> : <Navigate to="/login" />} />
          <Route
            path="checkin"
            element={user?.role === 'admin' || user?.role === 'organizer' ? <CheckIn /> : <Navigate to="/login" />}
          />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
