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


// Upload one or several image files to the backend (device file picker).
// Uses a bare axios call so the browser sets the multipart boundary itself
// (the shared `api` instance forces a JSON content-type).
export const uploadImages = async (files) => {
  const list = Array.from(files || []);
  if (!list.length) return { urls: [] };

  const formData = new FormData();
  list.forEach((file) => formData.append('files', file));

  const token = localStorage.getItem('kmer-token');
  const response = await axios.post(`${api.defaults.baseURL}/uploads`, formData, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data; // { urls: [...], url }
};

// Validate a ticket at the entrance. `code` is a booking number or the raw
// QR JSON payload. Returns { status, message, booking } (status may also be
// delivered via a non-2xx response, which we surface to the caller).
export const checkInTicket = async (code) => {
  try {
    const response = await api.post('/bookings/checkin', { code });
    return response.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    throw err;
  }
};

// Delete a previously uploaded file from the server. Only acts on our own
// /uploads/ files; ignored (and never throws) for external URLs.
export const deleteUploadedImage = async (url) => {
  if (!url || !String(url).includes('/uploads/')) return;
  try {
    await api.delete('/uploads', { data: { url } });
  } catch {
    // best-effort cleanup; do not block the UI on failure
  }
};

// Waitlist — be notified when seats free up for a full event.
export const joinWaitlist = async ({ eventId, quantity = 1 }) => {
  const response = await api.post('/waitlist', { eventId, quantity });
  return response.data;
};

export const fetchMyWaitlist = async () => {
  const response = await api.get('/waitlist/me');
  return response.data;
};

export const leaveWaitlist = async (id) => {
  const response = await api.delete(`/waitlist/${id}`);
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







