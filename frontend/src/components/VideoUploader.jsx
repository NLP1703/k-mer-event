import { useRef, useState } from 'react';
import { Film, X, Loader2 } from 'lucide-react';
import { uploadVideo, deleteUploadedImage } from '../services/api.js';

/**
 * Device-gallery video uploader (no URL pasting).
 * value is a string URL, onChange(url). A single video file is uploaded to the
 * backend and stored as a served URL.
 */
function VideoUploader({ value, onChange, label }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const openPicker = () => inputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const { url } = await uploadVideo(file);
      onChange(url || '');
    } catch (err) {
      const msg = err?.response?.data?.message
        || (err?.request && !err?.response
          ? 'Serveur injoignable. Vérifiez votre connexion (sur mobile, l’API ne doit pas pointer vers « localhost »).'
          : 'Échec de l’upload. Réessayez.');
      setError(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = ''; // allow re-selecting same file
    }
  };

  const removeVideo = () => {
    const removed = value;
    onChange('');
    if (removed) deleteUploadedImage(removed); // same /uploads delete endpoint
  };

  return (
    <div className="space-y-3">
      {label ? <span className="block text-sm text-muted">{label}</span> : null}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleFile}
        className="hidden"
      />

      <button
        type="button"
        onClick={openPicker}
        disabled={uploading}
        className="flex flex-col items-center justify-center w-full gap-2 px-6 py-8 text-center transition border border-dashed cursor-pointer rounded-3xl border-border bg-surface hover:border-primary hover:bg-bg-elevated disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        ) : (
          <Film className="w-6 h-6 text-primary" />
        )}
        <span className="text-sm font-medium text-fg">
          {uploading ? 'Téléversement…' : 'Choisir une vidéo depuis l’appareil'}
        </span>
        <span className="text-xs text-subtle">MP4, WEBM, MOV · 100 Mo max</span>
      </button>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {value ? (
        <div className="relative overflow-hidden border rounded-2xl border-border bg-bg-elevated">
          <video src={value} controls className="w-full max-h-72" />
          <button
            type="button"
            onClick={removeVideo}
            aria-label="Retirer la vidéo"
            className="absolute inline-flex items-center justify-center w-7 h-7 transition rounded-full top-1.5 right-1.5 bg-black/70 text-white hover:bg-rose-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default VideoUploader;
