import { Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import EventDetails from './pages/EventDetails.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Success from './pages/Success.jsx';
import Bookings from './pages/Bookings.jsx';
import AdminEvents from './pages/AdminEvents.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import OrganizerEvents from './pages/OrganizerEvents.jsx';
import OrganizerStatistics from './pages/OrganizerStatistics.jsx';
import CheckIn from './pages/CheckIn.jsx';
import Layout from './components/Layout.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Profile from './pages/Profile.jsx';



function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="event/:id" element={<EventDetails />} />
        <Route path="login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={user ? <Checkout /> : <Navigate to="/login" />} />
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
  );
}

export default App;

