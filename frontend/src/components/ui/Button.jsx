import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn.js';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

const variants = {
  // CTA principal : dégradé de marque (violet → indigo → bleu électrique).
  primary:
    'bg-grad-brand text-white shadow-glow hover:brightness-110 hover:-translate-y-px active:translate-y-0',
  secondary: 'bg-surface text-fg border border-border hover:border-primary hover:text-primary',
  ghost: 'text-fg hover:bg-surface-hover',
  danger: 'bg-danger text-white hover:opacity-90',
  outline: 'border border-border-strong text-fg hover:bg-surface-hover',
  link: 'text-primary hover:underline underline-offset-4 px-0',
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-9 w-9 p-0',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', as, to, href, className, children, ...props },
  ref,
) {
  const classes = cn(base, variants[variant] ?? variants.primary, sizes[size] ?? sizes.md, className);

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }

  const Comp = as || 'button';
  return (
    <Comp ref={ref} className={classes} {...props}>
      {children}
    </Comp>
  );
});

export default Button;
