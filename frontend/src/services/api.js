import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Token handling
// ─────────────────────────────────────────────────────────────────────────────
// The short-lived ACCESS token lives in memory only (never localStorage) to
// shrink the XSS blast radius. The long-lived REFRESH token is an HttpOnly,
// Secure, SameSite cookie the JS never touches. On a 401 we transparently call
// /auth/refresh (which rotates the refresh token) and retry the request once.
let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token || null;
};
export const getAccessToken = () => accessToken;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send/receive the HttpOnly refresh cookie
});

api.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Single-flight refresh so concurrent 401s trigger only one /auth/refresh call.
let refreshPromise = null;
const runRefresh = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return res.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');
    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        const fresh = await runRefresh();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${fresh}`;
        return api(original);
      } catch {
        setAccessToken(null);
      }
    }
    return Promise.reject(error);
  },
);

export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  setAccessToken(response.data.accessToken);
  return response.data;
};

export const register = async (payload) => {
  const response = await api.post('/auth/register', payload);
  setAccessToken(response.data.accessToken);
  return response.data;
};

// Restore a session on app load using the HttpOnly refresh cookie (if any).
export const refreshSession = async () => {
  const response = await api.post('/auth/refresh', {});
  setAccessToken(response.data.accessToken);
  return response.data;
};

export const logout = async () => {
  try {
    await api.post('/auth/logout', {});
  } finally {
    setAccessToken(null);
  }
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

  const token = getAccessToken();
  const response = await axios.post(`${api.defaults.baseURL}/uploads`, formData, {
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data; // { urls: [...], url }
};

// Upload a single video file (device gallery picker). Bare axios call so the
// browser sets the multipart boundary itself. Returns { url }.
export const uploadVideo = async (file) => {
  if (!file) return { url: '' };
  const formData = new FormData();
  formData.append('file', file);

  const token = getAccessToken();
  const response = await axios.post(`${api.defaults.baseURL}/uploads/video`, formData, {
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data; // { url }
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

// Admin dashboard: aggregated platform statistics.
export const fetchDashboardStats = async () => {
  const response = await api.get('/dashboard');
  return response.data;
};

// Admin dashboard: snapshot of who is currently online.
export const fetchPresence = async () => {
  const response = await api.get('/dashboard/presence');
  return response.data;
};

// Admin dashboard: platform usage aggregated per week.
export const fetchWeeklyUsage = async (weeks = 8) => {
  const response = await api.get('/dashboard/usage', { params: { weeks } });
  return response.data;
};







