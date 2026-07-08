// ─────────────────────────────────────────────────────────────────────────────
// Ticket PDF renderer.
// ─────────────────────────────────────────────────────────────────────────────
// Draws a single premium ticket onto a pdfkit document: brand accent bar,
// event logo + organizer badge, event title with date/time/location, a details
// column (ticket code, attendee, type, booking reference) next to the QR code,
// and an "important information" panel. The controller owns the HTTP response
// and just pipes the document; this module only draws.

import fs from 'fs';
import path from 'path';

// Brand palette — mirrors the v2 tokens in frontend/src/index.css.
const INK = '#12142E';        // indigo-black: primary text & dark badges
const PRIMARY = '#6355F5';    // violet-indigo brand accent
const VIOLET = '#8B5CF6';
const LABEL = '#6B7399';      // muted uppercase labels
const BODY = '#3A3D5C';       // body text
const LINE = '#E6E7F0';       // hairline separators / borders
const BOX_BG = '#F4F3FC';     // soft indigo info panel
const WHITE = '#FFFFFF';

const PAGE_W = 595.28;        // A4 width in points
const M = 40;                 // page margin
const CONTENT_W = PAGE_W - M * 2;
const RIGHT = PAGE_W - M;

// Rendered for a Cameroon audience (UTC+1) so the printed time matches what
// buyers saw in the browser when booking.
const TZ = 'Africa/Douala';

const frDate = (d) => {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ,
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
};

const hhmm = (d) => {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit', minute: '2-digit', timeZone: TZ,
    }).format(d);
  } catch {
    return d.toLocaleTimeString();
  }
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const truncate = (s, max) => {
  const str = String(s || '');
  return str.length > max ? `${str.slice(0, max - 1).trimEnd()}…` : str;
};

const initials = (name) => {
  const parts = String(name || 'K').trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || 'K';
};

// Extract the raw bytes of a data: URL (the QR is a PNG data URL). Returns null
// for anything that isn't a base64 data URL, so the QR is simply skipped.
const dataUrlToBuffer = (dataUrl) => {
  const [, base64] = String(dataUrl || '').split(',');
  if (!base64) return null;
  try {
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
};

// Resolve an event image to a local file path so it can be used as the ticket
// logo. Only handles files we host (…/uploads/<file>); returns null for remote
// URLs or missing files, so the caller falls back to a monogram tile.
const loadEventImage = (event) => {
  const candidates = [event?.banner_url, ...(event?.photo_urls || [])].filter(Boolean);
  for (const raw of candidates) {
    const marker = '/uploads/';
    const idx = String(raw).indexOf(marker);
    if (idx === -1) continue;
    const filename = String(raw).slice(idx + marker.length).split(/[?#]/)[0];
    if (!filename || filename.includes('..') || filename.includes('/')) continue;
    const filePath = path.resolve(process.cwd(), 'uploads', filename);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
};

// Small rounded logo tile: the event image cover-cropped into a rounded square,
// or a violet monogram tile when no local image is available.
const drawLogo = (doc, x, y, size, imagePath, monogram) => {
  const r = 12;
  if (imagePath) {
    try {
      doc.save();
      doc.roundedRect(x, y, size, size, r).clip();
      doc.image(imagePath, x, y, { cover: [size, size], align: 'center', valign: 'center' });
      doc.restore();
      doc.roundedRect(x, y, size, size, r).lineWidth(1).stroke(LINE);
      return;
    } catch {
      try { doc.restore(); } catch { /* no-op */ }
    }
  }
  doc.roundedRect(x, y, size, size, r).fill(PRIMARY);
  doc
    .fillColor(WHITE)
    .font('Helvetica-Bold')
    .fontSize(size * 0.36)
    .text(monogram, x, y + size / 2 - size * 0.2, { width: size, align: 'center' });
};

// Shorten a string with an ellipsis until it fits `maxW` at the current font.
const fitText = (doc, str, maxW) => {
  if (doc.widthOfString(str) <= maxW) return str;
  let s = String(str);
  while (s.length > 1 && doc.widthOfString(`${s}…`) > maxW) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
};

// Dark rounded pill, right-aligned and centered on `centerY`, holding the
// organizer name in white caps on a single line.
const drawOrganizerBadge = (doc, centerY, name) => {
  const padX = 13;
  const h = 24;
  const maxAvail = 260 - padX * 2;
  doc.font('Helvetica-Bold').fontSize(8.5);
  const text = fitText(doc, String(name || 'Organisateur').toUpperCase(), maxAvail);
  const w = Math.min(doc.widthOfString(text) + padX * 2 + 2, 260);
  const x = RIGHT - w;
  const y = centerY - h / 2;
  doc.roundedRect(x, y, w, h, h / 2).fill(INK);
  doc
    .fillColor(WHITE)
    .text(text, x + padX, y + h / 2 - 5, { width: w - padX * 2, align: 'center', lineBreak: false });
};

// A label + value block used in the details column.
const drawField = (doc, x, y, w, label, value, { mono = false, valueSize = 11, gap = 14 } = {}) => {
  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor(LABEL)
    .text(String(label).toUpperCase(), x, y, { width: w, characterSpacing: 0.8 });
  const vy = y + 12;
  const text = value || '—';
  doc.font(mono ? 'Courier-Bold' : 'Helvetica').fontSize(valueSize).fillColor(INK);
  doc.text(text, x, vy, { width: w });
  const vh = doc.heightOfString(text, { width: w });
  return vy + vh + gap;
};

// Bold "Label : " prefix followed by a regular value, on one line.
const drawMeta = (doc, y, label, value) => {
  doc.fontSize(11);
  doc.font('Helvetica-Bold').fillColor(INK).text(`${label} : `, M, y, { continued: true });
  doc.font('Helvetica').fillColor(BODY).text(value || '—');
  return y + 18;
};

// Draw one full ticket. `booking` is expected to carry `event` and (optionally)
// `user`; `user` is a fallback (e.g. the authenticated buyer).
export const drawTicket = (doc, { booking, user }) => {
  const event = booking.event || {};
  const buyer = booking.user || user || {};

  const start = event.start_date ? new Date(event.start_date) : null;
  const end = event.end_date ? new Date(event.end_date) : null;
  const validStart = start && Number.isFinite(start.getTime());
  const validEnd = end && Number.isFinite(end.getTime());

  // ── Brand accent bar (full-bleed, top edge) ──────────────────────────────
  const grad = doc.linearGradient(0, 0, PAGE_W, 0);
  grad.stop(0, VIOLET).stop(0.5, PRIMARY).stop(1, '#2E7CF6');
  doc.rect(0, 0, PAGE_W, 6).fill(grad);

  // ── Header: logo + organizer badge ───────────────────────────────────────
  let y = 46;
  const logoSize = 46;
  drawLogo(doc, M, y, logoSize, loadEventImage(event), initials(event.organizer || event.title));
  drawOrganizerBadge(doc, y + logoSize / 2, event.organizer);
  y += logoSize + 22;

  // ── Event title ──────────────────────────────────────────────────────────
  const title = event.title || 'Événement';
  doc.font('Helvetica-Bold').fontSize(23).fillColor(INK);
  doc.text(title, M, y, { width: CONTENT_W });
  y += doc.heightOfString(title, { width: CONTENT_W }) + 12;

  // ── Date / Heure / Lieu ───────────────────────────────────────────────────
  y = drawMeta(doc, y, 'Date', validStart ? cap(frDate(start)) : 'À préciser');
  y = drawMeta(
    doc,
    y,
    'Heure',
    validStart ? (validEnd ? `${hhmm(start)} – ${hhmm(end)}` : hhmm(start)) : 'À préciser',
  );
  y = drawMeta(doc, y, 'Lieu', truncate([event.venue, event.city].filter(Boolean).join(', ') || 'À préciser', 52));

  // ── Divider ───────────────────────────────────────────────────────────────
  y += 8;
  doc.moveTo(M, y).lineTo(RIGHT, y).lineWidth(1).stroke(LINE);
  y += 22;

  // ── Details column + QR ───────────────────────────────────────────────────
  const colsTop = y;
  const qrSize = 150;
  const qrX = RIGHT - qrSize;
  const leftW = qrX - M - 28;

  // QR box (right).
  doc.roundedRect(qrX, colsTop, qrSize, qrSize, 14).fillAndStroke(WHITE, LINE);
  const qrBuffer = dataUrlToBuffer(booking.qr_code_url);
  if (qrBuffer) {
    const inset = 14;
    try {
      doc.image(qrBuffer, qrX + inset, colsTop + inset, {
        fit: [qrSize - inset * 2, qrSize - inset * 2],
        align: 'center',
        valign: 'center',
      });
    } catch { /* skip a corrupt QR rather than fail the whole ticket */ }
  }
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(LABEL)
    .text('Scanner à l’entrée', qrX, colsTop + qrSize + 9, {
      width: qrSize,
      align: 'center',
      characterSpacing: 0.5,
    });
  const qrBottom = colsTop + qrSize + 9 + 12;

  // Detail fields (left).
  let ly = colsTop;
  ly = drawField(doc, M, ly, leftW, 'Code du billet', booking.booking_number, { mono: true, valueSize: 15, gap: 16 });
  ly = drawField(doc, M, ly, leftW, 'Nom du participant', booking.customer_name || buyer.name);
  ly = drawField(doc, M, ly, leftW, 'E-mail', booking.customer_email || buyer.email);
  ly = drawField(doc, M, ly, leftW, 'Type de billet', cap(event.category) || 'Standard');
  if (Number(booking.quantity) > 1) {
    ly = drawField(doc, M, ly, leftW, 'Places', String(booking.quantity));
  }
  ly = drawField(doc, M, ly, leftW, 'Référence de réservation', booking.id, { mono: true, valueSize: 9, gap: 0 });

  y = Math.max(ly, qrBottom) + 24;

  // ── Important information panel ───────────────────────────────────────────
  const bullets = [
    'Présentez ce billet à l’entrée (imprimé ou sur votre téléphone).',
    'Votre QR code sera scanné à l’entrée pour un accès rapide.',
    'Gardez votre code de billet confidentiel et ne le partagez pas.',
    'Contactez l’organisateur pour toute question.',
  ];
  const padX = 18;
  const padY = 16;
  const bulletX = M + padX + 12;
  const bulletW = CONTENT_W - padX * 2 - 12;
  doc.font('Helvetica').fontSize(9);
  const bulletHeights = bullets.map((b) => doc.heightOfString(b, { width: bulletW }));
  const titleH = 14;
  const boxH = padY + titleH + 6 + bulletHeights.reduce((a, h) => a + h + 7, 0) - 7 + padY;

  doc.roundedRect(M, y, CONTENT_W, boxH, 12).fillAndStroke(BOX_BG, LINE);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(INK)
    .text('Informations importantes', M + padX, y + padY, { width: CONTENT_W - padX * 2 });
  let by = y + padY + titleH + 6;
  bullets.forEach((b, i) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(VIOLET).text('•', M + padX, by, { width: 10 });
    doc.font('Helvetica').fontSize(9).fillColor(BODY).text(b, bulletX, by, { width: bulletW });
    by += bulletHeights[i] + 7;
  });
  y += boxH;

  // ── Footer ────────────────────────────────────────────────────────────────
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(LABEL)
    .text(`Billet émis par K-MER Event · ${frDate(new Date())}`, M, 808, {
      width: CONTENT_W,
      align: 'center',
    });
};
