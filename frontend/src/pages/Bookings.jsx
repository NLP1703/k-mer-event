import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchBookings, downloadTicketPdf } from '../services/api.js';

function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookings()
      .then((data) => {
        setBookings(data.bookings || []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Unable to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (booking) => {
    const pdfData = await downloadTicketPdf(booking.id);
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket-${booking.booking_number}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) {
    return <p className="text-white/70">Loading bookings...</p>;
  }

  if (error) {
    return <p className="text-rose-400">{error}</p>;
  }

  if (!bookings.length) {
    return <p className="text-white/70">No bookings found yet.</p>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="text-4xl font-semibold text-white">My bookings</h1>
      <div className="grid gap-6">
        {bookings.map((booking) => (
          <div key={booking.id} className="glass-card rounded-3xl border border-white/10 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">{booking.event.title}</h2>
                <p className="mt-2 text-sm text-white/70">{booking.event.venue} · {new Date(booking.event.start_date).toLocaleDateString()}</p>
              </div>
              <div className="space-y-2 text-right">
                <p className="text-white/70">Booking: {booking.booking_number}</p>
                <button onClick={() => handleDownload(booking)} className="rounded-full bg-neon px-5 py-3 text-sm font-semibold text-night transition hover:bg-white">
                  Download ticket
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default Bookings;
