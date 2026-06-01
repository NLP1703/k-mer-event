import { cn } from '../../lib/cn.js';

const variants = {
  neutral: 'bg-surface-hover text-fg border border-border',
  primary: 'bg-primary/10 text-primary border border-primary/20',
  success: 'bg-success/10 text-success border border-success/20',
  danger: 'bg-danger/10 text-danger border border-danger/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  accent: 'bg-accent/10 text-accent border border-accent/20',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

function Badge({ variant = 'neutral', size = 'md', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full uppercase tracking-wide',
        variants[variant] ?? variants.neutral,
        sizes[size] ?? sizes.md,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
