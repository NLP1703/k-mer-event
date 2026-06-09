import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { downloadTicketPdf } from '../services/api.js';

function Success() {
  const location = useLocation();
  const bookings = location.state?.bookings || [];

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

  if (!bookings.length) {
    return (
      <div className="glass-card rounded-[36px] border border-border p-10 text-center">
        <h1 className="text-3xl font-semibold text-fg">Booking complete</h1>
        <p className="mt-4 text-muted">Your tickets are ready. Visit your bookings page to access downloads.</p>
        <Link to="/bookings" className="mt-8 inline-flex rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-fg transition hover:bg-primary-hover">
          View bookings
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <section className="glass-card rounded-[36px] border border-border p-10 text-center">
        <h1 className="text-4xl font-semibold text-fg">Success!</h1>
        <p className="mt-4 text-muted">Your ticket booking has been confirmed. Download your PDF tickets below.</p>
      </section>

      <div className="grid gap-6">
        {bookings.map((booking) => (
          <div key={booking.id} className="glass-card rounded-3xl border border-border p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-primary">Booking number</p>
                <h2 className="mt-2 text-2xl font-semibold text-fg">{booking.booking_number}</h2>
                <p className="mt-2 text-sm text-muted">Total: FCFA {booking.total_price.toFixed(0)}</p>
              </div>
              <button onClick={() => handleDownload(booking)} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-fg transition hover:bg-primary-hover">
                Download ticket
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default Success;

