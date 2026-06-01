// Tiny classnames helper. Avoids adding clsx/tailwind-merge as deps.
export const cn = (...parts) => parts.filter(Boolean).join(' ');
