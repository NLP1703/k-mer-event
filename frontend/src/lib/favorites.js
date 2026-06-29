import { useSyncExternalStore } from 'react';
import {
  getAccessToken,
  addFavoriteApi,
  removeFavoriteApi,
  syncFavoritesApi,
} from '../services/api.js';

// Favorites store backed by localStorage for instant, offline-friendly UI, and
// mirrored to the server (multi-device sync) whenever the user is authenticated.
const KEY = 'kmer-favorites';
const listeners = new Set();

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

let snapshot = read();

function emit() {
  snapshot = read();
  listeners.forEach((l) => l());
}

function writeAll(ids) {
  localStorage.setItem(KEY, JSON.stringify([...new Set(ids.map(String))]));
  emit();
}

export function toggleFavorite(id) {
  if (id == null) return;
  const key = String(id);
  const set = new Set(read().map(String));
  const adding = !set.has(key);
  if (adding) set.add(key);
  else set.delete(key);
  writeAll([...set]);

  // Best-effort server mirror (only when authenticated).
  if (getAccessToken()) {
    (adding ? addFavoriteApi(key) : removeFavoriteApi(key)).catch(() => {});
  }
}

// Merge local favourites into the server set, then adopt the server as the
// source of truth. Call on login / session restore.
export async function syncFavoritesWithServer() {
  if (!getAccessToken()) return;
  try {
    const data = await syncFavoritesApi(read());
    if (Array.isArray(data?.eventIds)) writeAll(data.eventIds);
  } catch {
    // offline / unauthenticated — keep local copy
  }
}

function subscribe(cb) {
  listeners.add(cb);
  const onStorage = (e) => {
    if (e.key === KEY) emit();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot() {
  return snapshot;
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    favorites,
    isFavorite: (id) => favorites.includes(String(id)),
    toggle: toggleFavorite,
    count: favorites.length,
  };
}
