import { useState } from 'react';
import { cn } from '../../lib/cn.js';

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
};

const initialsFor = (name) => {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
};

function Avatar({ src, alt = '', name, size = 'md', className }) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-full border border-border bg-surface-hover text-fg font-semibold select-none',
        sizes[size] ?? sizes.md,
        className,
      )}
      aria-label={alt || name || 'Avatar'}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="object-cover w-full h-full"
          onError={() => setErrored(true)}
        />
      ) : (
        <span aria-hidden="true">{initialsFor(name)}</span>
      )}
    </span>
  );
}

export default Avatar;
