// Share an event via WhatsApp (very common in Cameroon). Falls back to the
// native share sheet on mobile when available.
export function shareEventWhatsApp(event) {
  const url = `${window.location.origin}/event/${event.id}`;
  const parts = [event.title, event.city ? `Lieu : ${event.city}` : null, url].filter(Boolean);
  const text = parts.join('\n');
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

export function shareEventNative(event) {
  const url = `${window.location.origin}/event/${event.id}`;
  if (navigator.share) {
    navigator.share({ title: event.title, text: event.title, url }).catch(() => {});
    return true;
  }
  return false;
}
