import { useRef, useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { uploadImages, deleteUploadedImage } from '../services/api.js';

/**
 * Device-file-picker image uploader (no URL pasting).
 * - single mode: value is a string URL, onChange(url)
 * - multiple mode: value is an array of URLs, onChange(urls[])
 * Files are uploaded to the backend and stored as served URLs.
 */
function ImageUploader({ value, onChange, multiple = false, label }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const urls = multiple ? (Array.isArray(value) ? value.filter(Boolean) : []) : value ? [value] : [];

  const openPicker = () => inputRef.current?.click();

  const handleFiles = async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setError('');
    setUploading(true);
    try {
      const { urls: uploaded = [] } = await uploadImages(files);
      if (multiple) {
        onChange([...(Array.isArray(value) ? value.filter(Boolean) : []), ...uploaded]);
      } else {
        onChange(uploaded[0] || '');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Échec de l’upload. Réessayez.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = ''; // allow re-selecting same file
    }
  };

  const removeAt = (index) => {
    const removed = urls[index];
    if (multiple) {
      onChange((Array.isArray(value) ? value : []).filter((_, i) => i !== index));
    } else {
      onChange('');
    }
    // Actually delete the file from the server (best-effort).
    if (removed) deleteUploadedImage(removed);
  };

  return (
    <div className="space-y-3">
      {label ? <span className="block text-sm text-muted">{label}</span> : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFiles}
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
          <UploadCloud className="w-6 h-6 text-primary" />
        )}
        <span className="text-sm font-medium text-fg">
          {uploading ? 'Téléversement…' : multiple ? 'Choisir des images depuis l’appareil' : 'Choisir une image depuis l’appareil'}
        </span>
        <span className="text-xs text-subtle">
          {multiple ? 'Plusieurs fichiers acceptés · ' : ''}JPG, PNG, WEBP, GIF · 8 Mo max
        </span>
      </button>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {urls.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {urls.map((url, index) => (
            <div key={`${url}-${index}`} className="relative overflow-hidden border rounded-2xl border-border bg-bg-elevated aspect-[4/3] group">
              <img src={url} alt="" className="object-cover w-full h-full" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label="Retirer l’image"
                className="absolute inline-flex items-center justify-center w-7 h-7 transition rounded-full top-1.5 right-1.5 bg-black/70 text-white hover:bg-rose-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default ImageUploader;
