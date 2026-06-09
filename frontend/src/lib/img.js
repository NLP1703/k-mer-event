// Local fallback used when an event has no image or the remote one fails.
export const PLACEHOLDER_IMG = '/placeholder.svg';

/**
 * Resolve an event image URL for display.
 * - Returns the local placeholder when empty.
 * - Optimizes bare Unsplash URLs (which serve multi-MB originals) by
 *   requesting a sized, compressed variant so images load fast and reliably.
 * - Leaves any other URL (uploads, other hosts) untouched.
 */
export function eventImage(url, { w = 1200, q = 70 } = {}) {
  const src = typeof url === 'string' ? url.trim() : '';
  if (!src) return PLACEHOLDER_IMG;

  if (src.includes('images.unsplash.com') && !src.includes('?')) {
    return `${src}?auto=format&fit=crop&w=${w}&q=${q}`;
  }
  return src;
}
