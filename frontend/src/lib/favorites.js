import { useSyncExternalStore } from 'react';

// Lightweight favorites store backed by localStorage, shared across all
// components (no provider needed) and synced across browser tabs.
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

export function toggleFavorite(id) {
  if (id == null) return;
  const key = String(id);
  const set = new Set(read().map(String));
  if (set.has(key)) set.delete(key);
  else set.add(key);
  localStorage.setItem(KEY, JSON.stringify([...set]));
  emit();
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
