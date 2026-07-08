// ─────────────────────────────────────────────────────────────────────────────
// Ticket PDF renderer.
// ─────────────────────────────────────────────────────────────────────────────
// Draws a single premium ticket onto a pdfkit document, styled as a physical
// ticket card: dark header (logo, event title, organizer) over a gradient
// hairline, a date/time/venue strip, a perforated divider with edge notches,
// then the stub (attendee details next to the QR code and ticket code), and
// an "important information" panel. The controller owns the HTTP response and
// just pipes the document; this module only draws.

import fs from 'fs';
import path from 'path';

// Brand palette — mirrors the v2 tokens in frontend/src/index.css.
const INK = '#12142E';        // indigo-black: primary text & dark header
const PRIMARY = '#6355F5';    // violet-indigo brand accent
const VIOLET = '#8B5CF6';
const BLUE = '#2E7CF6';
const LABEL = '#6B7399';      // muted uppercase labels
const BODY = '#3A3D5C';       // body text
const LINE = '#E6E7F0';       // hairline separators / borders
const QR_LINE = '#DDD9FB';    // violet-tinted QR frame
const HEADER_MUTED = '#A9A3EC'; // small caps on the dark header
const HEADER_SOFT = '#C8C3F8';  // organizer line on the dark header
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
// or a violet monogram tile when no local image is available. `onDark` softens
// the border so the tile sits well on the dark header.
const drawLogo = (doc, x, y, size, imagePath, monogram) => {
  const r = 12;
  if (imagePath) {
    try {
      doc.save();
      doc.roundedRect(x, y, size, size, r).clip();
      doc.image(imagePath, x, y, { cover: [size, size], align: 'center', valign: 'center' });
      doc.restore();
      doc.roundedRect(x, y, size, size, r).lineWidth(1).stroke('#2A2C4E');
      return;
    } catch {
      try { doc.restore(); } catch { /* no-op */ }
    }
  }
  const grad = doc.linearGradient(x, y, x + size, y + size);
  grad.stop(0, VIOLET).stop(1, PRIMARY);
  doc.roundedRect(x, y, size, size, r).fill(grad);
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

// A label + value block used in the stub details column.
const drawField = (doc, x, y, w, label, value, { mono = false, valueSize = 11, gap = 13 } = {}) => {
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

// One column of the date/time/venue strip: violet small-caps label over a bold
// single-line value (ellipsized to the column width).
const drawMetaColumn = (doc, x, y, w, label, value) => {
  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor(PRIMARY)
    .text(String(label).toUpperCase(), x, y, { width: w, characterSpacing: 1 });
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK);
  doc.text(fitText(doc, String(value || '—'), w), x, y + 13, { width: w, lineBreak: false });
};

// The three-stop brand gradient used for accent lines.
const brandGradient = (doc, x1, x2, y) => {
  const grad = doc.linearGradient(x1, y, x2, y);
  grad.stop(0, VIOLET).stop(0.5, PRIMARY).stop(1, BLUE);
  return grad;
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
  doc.rect(0, 0, PAGE_W, 6).fill(brandGradient(doc, 0, PAGE_W, 0));

  // ── Ticket card geometry ──────────────────────────────────────────────────
  const cardX = M;
  const cardW = CONTENT_W;
  const cardTop = 44;
  const cardR = 18;
  const padX = 24;

  // Header content is measured first so the dark band hugs the title height.
  const logoSize = 48;
  const title = truncate(event.title || 'Événement', 60);
  const titleX = cardX + padX + logoSize + 16;
  const titleW = cardX + cardW - padX - titleX;
  doc.font('Helvetica-Bold').fontSize(19);
  const titleH = doc.heightOfString(title, { width: titleW });
  const headerH = 20 + 11 + 16 + Math.max(logoSize, titleH + 7 + 12) + 20;

  // ── Header band (dark, clipped to the card's rounded top) ────────────────
  doc.save();
  doc.roundedRect(cardX, cardTop, cardW, headerH + cardR, cardR).clip();
  doc.rect(cardX, cardTop, cardW, headerH).fill(INK);
  doc.restore();

  // Row 1: "billet officiel" + wordmark.
  let y = cardTop + 20;
  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor(HEADER_MUTED)
    .text('BILLET OFFICIEL', cardX + padX, y, { characterSpacing: 2, lineBreak: false });
  doc
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .fillColor(WHITE)
    .text('K-MER EVENT', cardX + padX, y - 1.5, {
      width: cardW - padX * 2,
      align: 'right',
      lineBreak: false,
    });

  // Row 2: logo + title + organizer.
  y += 11 + 16;
  drawLogo(doc, cardX + padX, y, logoSize, loadEventImage(event), initials(event.organizer || event.title));
  doc.font('Helvetica-Bold').fontSize(19).fillColor(WHITE);
  doc.text(title, titleX, y, { width: titleW });
  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(HEADER_SOFT)
    .text(
      fitText(doc, `Organisé par ${event.organizer || 'K-MER Event'}`, titleW),
      titleX,
      y + titleH + 7,
      { width: titleW, lineBreak: false },
    );

  // Gradient hairline sealing the header.
  const headerBottom = cardTop + headerH;
  doc.rect(cardX, headerBottom - 3, cardW, 3).fill(brandGradient(doc, cardX, cardX + cardW, headerBottom));

  // ── Date / Heure / Lieu strip ─────────────────────────────────────────────
  // Weighted columns: "Heure" is always short, so venue gets the spare width.
  const metaTop = headerBottom + 18;
  const metaW = cardW - padX * 2;
  const colX = [0, 0.36, 0.58].map((f) => cardX + padX + metaW * f);
  const colW = [metaW * 0.36 - 14, metaW * 0.22 - 14, metaW * 0.42];
  const venue = [event.venue, event.city].filter(Boolean).join(', ') || 'À préciser';
  drawMetaColumn(doc, colX[0], metaTop, colW[0], 'Date', validStart ? cap(frDate(start)) : 'À préciser');
  drawMetaColumn(
    doc,
    colX[1],
    metaTop,
    colW[1],
    'Heure',
    validStart ? (validEnd ? `${hhmm(start)} – ${hhmm(end)}` : hhmm(start)) : 'À préciser',
  );
  drawMetaColumn(doc, colX[2], metaTop, colW[2], 'Lieu', venue);
  [colX[1], colX[2]].forEach((sx) => {
    doc.moveTo(sx - 14, metaTop + 1).lineTo(sx - 14, metaTop + 25).lineWidth(1).stroke(LINE);
  });

  // ── Perforated divider with edge notches ─────────────────────────────────
  const perfY = metaTop + 26 + 16;
  doc
    .save()
    .dash(4, { space: 5 })
    .moveTo(cardX + 14, perfY)
    .lineTo(cardX + cardW - 14, perfY)
    .lineWidth(1.2)
    .stroke('#CFD1E3')
    .undash()
    .restore();

  // ── Stub: attendee details (left) + QR (right) ───────────────────────────
  const stubTop = perfY + 22;
  const qrSize = 142;
  const qrX = cardX + cardW - padX - qrSize;
  const leftX = cardX + padX;
  const leftW = qrX - leftX - 26;

  doc.roundedRect(qrX, stubTop, qrSize, qrSize, 14).lineWidth(1.4).fillAndStroke(WHITE, QR_LINE);
  const qrBuffer = dataUrlToBuffer(booking.qr_code_url);
  if (qrBuffer) {
    const inset = 12;
    try {
      doc.image(qrBuffer, qrX + inset, stubTop + inset, {
        fit: [qrSize - inset * 2, qrSize - inset * 2],
        align: 'center',
        valign: 'center',
      });
    } catch { /* skip a corrupt QR rather than fail the whole ticket */ }
  }
  doc.font('Courier-Bold').fontSize(12.5).fillColor(INK);
  doc.text(fitText(doc, String(booking.booking_number || '—'), qrSize + 24), qrX - 12, stubTop + qrSize + 10, {
    width: qrSize + 24,
    align: 'center',
    lineBreak: false,
  });
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(LABEL)
    .text('SCANNER À L’ENTRÉE', qrX, stubTop + qrSize + 27, {
      width: qrSize,
      align: 'center',
      characterSpacing: 1,
    });
  const qrBottom = stubTop + qrSize + 27 + 10;

  let ly = stubTop;
  ly = drawField(doc, leftX, ly, leftW, 'Nom du participant', booking.customer_name || buyer.name, { valueSize: 12 });
  ly = drawField(doc, leftX, ly, leftW, 'E-mail', booking.customer_email || buyer.email);
  ly = drawField(doc, leftX, ly, leftW, 'Type de billet', cap(event.category) || 'Standard');
  if (Number(booking.quantity) > 1) {
    ly = drawField(doc, leftX, ly, leftW, 'Places', String(booking.quantity));
  }
  ly = drawField(doc, leftX, ly, leftW, 'Référence de réservation', booking.id, { mono: true, valueSize: 8.5, gap: 0 });

  const cardBottom = Math.max(ly, qrBottom) + 22;

  // ── Card outline + perforation notches ───────────────────────────────────
  doc.roundedRect(cardX, cardTop, cardW, cardBottom - cardTop, cardR).lineWidth(1.2).stroke(LINE);
  [cardX, cardX + cardW].forEach((nx) => {
    doc.circle(nx, perfY, 7).lineWidth(1.2).fillAndStroke(WHITE, LINE);
  });

  y = cardBottom + 20;

  // ── Important information panel ───────────────────────────────────────────
  const bullets = [
    'Présentez ce billet à l’entrée (imprimé ou sur votre téléphone).',
    'Votre QR code sera scanné à l’entrée pour un accès rapide.',
    'Gardez votre code de billet confidentiel et ne le partagez pas.',
    'Contactez l’organisateur pour toute question.',
  ];
  const boxPadX = 18;
  const boxPadY = 16;
  const bulletX = M + boxPadX + 12;
  const bulletW = CONTENT_W - boxPadX * 2 - 12;
  doc.font('Helvetica').fontSize(9);
  const bulletHeights = bullets.map((b) => doc.heightOfString(b, { width: bulletW }));
  const titleLineH = 14;
  const boxH = boxPadY + titleLineH + 6 + bulletHeights.reduce((a, h) => a + h + 7, 0) - 7 + boxPadY;

  doc.roundedRect(M, y, CONTENT_W, boxH, 12).fillAndStroke(BOX_BG, LINE);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(INK)
    .text('Informations importantes', M + boxPadX, y + boxPadY, { width: CONTENT_W - boxPadX * 2 });
  let by = y + boxPadY + titleLineH + 6;
  bullets.forEach((b, i) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(VIOLET).text('•', M + boxPadX, by, { width: 10 });
    doc.font('Helvetica').fontSize(9).fillColor(BODY).text(b, bulletX, by, { width: bulletW });
    by += bulletHeights[i] + 7;
  });

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
