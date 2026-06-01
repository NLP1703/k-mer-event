import axios from 'axios';

const api = axios.create({
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kmer-token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const register = async (payload) => {
  const response = await api.post('/auth/register', payload);
  return response.data;
};

export const fetchEvents = async (params = {}) => {
  const response = await api.get('/events', { params });
  return response.data;
};

export const fetchEvent = async (id) => {
  const response = await api.get(`/events/${id}`);
  return response.data;
};

export const createBooking = async (payload) => {
  const response = await api.post('/bookings', payload);
  return response.data;
};

export const fetchCart = async () => {
  const response = await api.get('/cart');
  return response.data;
};

export const addToCart = async (payload) => {
  const response = await api.post('/cart', payload);
  return response.data;
};

export const removeCartItem = async (eventId) => {
  const response = await api.delete(`/cart/${eventId}`);
  return response.data;
};

export const clearCart = async () => {
  const response = await api.delete('/cart');
  return response.data;
};

export const checkoutCart = async (billing) => {
  const response = await api.post('/bookings/checkout', billing);
  return response.data;
};

export const fetchBookings = async () => {
  const response = await api.get('/bookings');
  return response.data;
};

export const downloadTicketPdf = async (bookingId) => {
  const response = await api.get(`/bookings/${bookingId}/ticket`, { responseType: 'blob' });
  return response.data;
};

export const fetchCurrentUserMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Profile management
export const fetchMyFullProfile = async () => {
  const response = await api.get('/users/me');
  return response.data;
};

export const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  const response = await api.put('/users/change-password', {
    currentPassword,
    newPassword,
    confirmPassword,
  });
  return response.data;
};

export const updateProfilePicture = async (profilePictureUrl) => {
  const response = await api.put('/users/profile-picture', {
    profile_picture: profilePictureUrl,
  });
  return response.data;
};

// Organizer statistics
export const fetchOrganizerStatistics = async () => {
  const response = await api.get('/organizer/statistics');
  return response.data;
};

export const fetchOrganizerEventStatistics = async () => {
  const response = await api.get('/organizer/statistics/events');
  return response.data;
};


export const createEvent = async (payload) => {
  const response = await api.post('/events', payload);
  return response.data;
};

export const updateEvent = async (eventId, payload) => {
  const response = await api.put(`/events/${eventId}`, payload);
  return response.data;
};

export const deleteEvent = async (eventId) => {
  const response = await api.delete(`/events/${eventId}`);
  return response.data;
};

// Admin workflow
export const approveEvent = async (eventId) => {
  const response = await api.post(`/events/${eventId}/approve`);
  return response.data;
};

export const cancelEvent = async (eventId) => {
  const response = await api.post(`/events/${eventId}/cancel`);
  return response.data;
};


// Admin: users CRUD
export const fetchUsersForAdmin = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const createUserForAdmin = async (payload) => {
  const response = await api.post('/admin/users', payload);
  return response.data;
};

export const fetchUserForAdmin = async (id) => {
  const response = await api.get(`/admin/users/${id}`);
  return response.data;
};

export const updateUserForAdmin = async (id, payload) => {
  const response = await api.put(`/admin/users/${id}`, payload);
  return response.data;
};

export const deleteUserForAdmin = async (id) => {
  const response = await api.delete(`/admin/users/${id}`);
  return response.data;
};

// Admin: list bookings for a user
export const fetchBookingsForUserAdmin = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/bookings`);
  return response.data;
};







