import { Component } from 'react';

// After a redeploy, a still-open SPA session holds an index.html that points at
// old hashed chunk filenames which no longer exist on the server. Navigating to
// a lazy route then makes import() 404 (ChunkLoadError) and the UI would hang on
// the Suspense fallback forever — exactly the "navigation gets stuck" symptom.
//
// This boundary catches that and reloads once to pull the fresh index.html +
// chunks. A timestamped sessionStorage flag prevents an infinite reload loop:
// if the same error recurs within a short window (a genuinely broken build), we
// fall back to a small recovery screen instead of looping.
const RELOAD_KEY = 'chunk-reload-at';
const RELOAD_WINDOW_MS = 10000;

const isChunkLoadError = (error) =>
  /loading chunk|loading css chunk|dynamically imported module|importing a module script failed|chunkloaderror|failed to fetch dynamically/i.test(
    String(error?.message || ''),
  );

export default class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error)) {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last > RELOAD_WINDOW_MS) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="max-w-md p-10 mx-auto text-center">
          <p className="text-fg">Une erreur est survenue lors du chargement de la page.</p>
          <p className="mt-1 text-sm text-muted">Vérifiez votre connexion puis réessayez.</p>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(RELOAD_KEY);
              window.location.reload();
            }}
            className="px-5 mt-5 text-sm font-bold text-white transition rounded-full h-11 bg-grad-brand shadow-glow hover:brightness-110"
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
