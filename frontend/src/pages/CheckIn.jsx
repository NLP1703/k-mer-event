import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle, QrCode } from 'lucide-react';
import { checkInTicket } from '../services/api.js';
import { Card, Button, Input } from '../components/ui';
import { cn } from '../lib/cn.js';

const READER_ID = 'kmer-qr-reader';

const STATUS_UI = {
  ok: { icon: CheckCircle2, tone: 'text-success', ring: 'border-success/40 bg-success/5', label: 'Billet validé' },
  already: { icon: AlertTriangle, tone: 'text-warm', ring: 'border-warm/40 bg-warm/5', label: 'Déjà validé' },
  expired: { icon: XCircle, tone: 'text-danger', ring: 'border-danger/40 bg-danger/5', label: 'Billet expiré' },
  cancelled: { icon: XCircle, tone: 'text-danger', ring: 'border-danger/40 bg-danger/5', label: 'Billet annulé' },
  invalid: { icon: XCircle, tone: 'text-danger', ring: 'border-danger/40 bg-danger/5', label: 'Billet introuvable' },
  forbidden: { icon: XCircle, tone: 'text-danger', ring: 'border-danger/40 bg-danger/5', label: 'Non autorisé' },
  error: { icon: XCircle, tone: 'text-danger', ring: 'border-danger/40 bg-danger/5', label: 'Erreur' },
};

function ResultPanel({ result }) {
  if (!result) return null;
  const ui = STATUS_UI[result.status] || STATUS_UI.error;
  const Icon = ui.icon;
  const b = result.booking;
  return (
    <div className={cn('flex items-start gap-3 p-4 border rounded-2xl', ui.ring)}>
      <Icon className={cn('w-6 h-6 shrink-0', ui.tone)} />
      <div className="min-w-0">
        <p className={cn('font-semibold', ui.tone)}>{result.message || ui.label}</p>
        {b ? (
          <div className="mt-1 text-sm text-muted">
            <p className="font-mono text-fg">{b.booking_number}</p>
            {b.event?.title ? <p>{b.event.title}</p> : null}
            <p>
              {b.user?.name || b.customer_name || '—'} · {b.quantity} place{b.quantity > 1 ? 's' : ''}
            </p>
            {result.status === 'already' && b.checked_in_at ? (
              <p className="text-xs text-subtle">Validé le {new Date(b.checked_in_at).toLocaleString('fr-FR')}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CheckIn() {
  const scannerRef = useRef(null);
  const lockRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState('');
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState('');
  const [history, setHistory] = useState([]);

  const handleCode = async (code) => {
    if (lockRef.current) return;
    lockRef.current = true;
    try {
      const res = await checkInTicket(code);
      setResult(res);
      setHistory((h) => [{ at: Date.now(), ...res }, ...h].slice(0, 8));
    } catch {
      setResult({ status: 'error', message: 'Validation impossible (réseau).' });
    } finally {
      // brief cooldown to avoid validating the same QR repeatedly
      setTimeout(() => {
        lockRef.current = false;
      }, 1500);
    }
  };

  const startCamera = async () => {
    setCamError('');
    // Browsers only expose the camera on a secure context (HTTPS or localhost).
    // Over plain HTTP the camera API is unavailable, so tell the user why.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCamError(
        "La caméra nécessite une connexion sécurisée (HTTPS). Utilisez la saisie manuelle ci-dessous.",
      );
      return;
    }
    try {
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => handleCode(decoded),
        () => {}, // per-frame decode errors: ignore
      );
      setScanning(true);
    } catch (err) {
      setCamError(
        err?.message?.includes('NotAllowed') || err?.name === 'NotAllowedError'
          ? 'Accès caméra refusé. Autorisez la caméra ou utilisez la saisie manuelle.'
          : 'Caméra indisponible. Utilisez la saisie manuelle.',
      );
    }
  };

  const stopCamera = async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const submitManual = (e) => {
    e.preventDefault();
    const code = manual.trim();
    if (code) {
      handleCode(code);
      setManual('');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-warm">Contrôle d’accès</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-fg md:text-4xl">Scan & check-in</h1>
        <p className="mt-2 text-sm text-muted">
          Scannez le QR du billet à l’entrée, ou saisissez son numéro manuellement.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Scanner */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
              <QrCode className="w-5 h-5 text-primary" />
              Scanner caméra
            </h2>
            {scanning ? (
              <Button variant="secondary" size="sm" onClick={stopCamera}>
                <CameraOff className="w-4 h-4" />
                Arrêter
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={startCamera}>
                <Camera className="w-4 h-4" />
                Démarrer la caméra
              </Button>
            )}
          </div>

          <div
            id={READER_ID}
            className={cn(
              'mt-4 overflow-hidden rounded-2xl border border-border bg-bg',
              scanning ? 'aspect-square' : 'flex aspect-square items-center justify-center',
            )}
          >
            {!scanning ? (
              <div className="text-center text-subtle">
                <Camera className="w-8 h-8 mx-auto" />
                <p className="mt-2 text-sm">Caméra arrêtée</p>
              </div>
            ) : null}
          </div>

          {camError ? <p className="mt-3 text-sm text-danger">{camError}</p> : null}

          {/* Manual entry */}
          <form onSubmit={submitManual} className="flex gap-2 mt-5">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="N° de billet (ex. KMER-12345678)"
              className="flex-1"
              aria-label="Numéro de billet"
            />
            <Button type="submit" variant="secondary" size="md">Valider</Button>
          </form>
        </Card>

        {/* Result + history */}
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-base font-semibold text-fg">Dernier contrôle</h2>
            <div className="mt-4">
              {result ? <ResultPanel result={result} /> : <p className="text-sm text-subtle">Aucun billet scanné pour le moment.</p>}
            </div>
          </Card>

          {history.length ? (
            <Card className="p-6">
              <h2 className="text-base font-semibold text-fg">Historique de la session</h2>
              <ul className="mt-3 divide-y divide-border">
                {history.map((h, i) => {
                  const ui = STATUS_UI[h.status] || STATUS_UI.error;
                  const Icon = ui.icon;
                  return (
                    <li key={`${h.at}-${i}`} className="flex items-center gap-3 py-2.5">
                      <Icon className={cn('w-4 h-4 shrink-0', ui.tone)} />
                      <span className="font-mono text-sm text-fg">{h.booking?.booking_number || '—'}</span>
                      <span className="ml-auto text-xs text-subtle">{ui.label}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default CheckIn;
