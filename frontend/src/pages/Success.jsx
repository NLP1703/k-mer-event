import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Download, Ticket } from 'lucide-react';
import { downloadTicketPdf } from '../services/api.js';
import { Button, Card } from '../components/ui';

const formatPrice = (n) =>
  `FCFA ${Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`;

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
      <Card className="p-10 text-center">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 text-success">
          <CheckCircle2 className="w-7 h-7" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-fg">Réservation confirmée</h1>
        <p className="mt-2 text-sm text-muted">
          Vos billets sont prêts. Retrouvez-les à tout moment dans « Mes billets ».
        </p>
        <Button variant="primary" size="lg" to="/bookings" className="mt-7">
          <Ticket className="w-4 h-4" />
          Voir mes billets
        </Button>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <Card className="p-10 text-center">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 text-success"
        >
          <CheckCircle2 className="w-8 h-8" />
        </motion.span>
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-fg md:text-4xl">
          Réservation confirmée !
        </h1>
        <p className="max-w-md mx-auto mt-3 text-sm text-muted">
          Votre réservation est validée. Téléchargez vos billets PDF ci-dessous —
          ils contiennent votre QR d’accès à présenter à l’entrée.
        </p>
      </Card>

      <div className="grid gap-4">
        {bookings.map((booking) => (
          <Card key={booking.id} className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold tracking-wider uppercase text-primary">
                  N° de réservation
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-fg tabular-nums">
                  {booking.booking_number}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Total : {formatPrice(booking.total_price)}
                </p>
              </div>
              <Button variant="primary" size="md" onClick={() => handleDownload(booking)}>
                <Download className="w-4 h-4" />
                Télécharger le billet
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-sm text-center text-muted">
        Retrouvez tous vos billets dans{' '}
        <Link to="/bookings" className="font-semibold text-primary hover:underline underline-offset-4">
          Mes billets
        </Link>
        .
      </p>
    </motion.div>
  );
}

export default Success;
