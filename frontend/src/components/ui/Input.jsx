import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn.js';

const baseField =
  'w-full rounded-xl border border-border bg-bg-elevated px-4 py-2.5 text-sm text-fg placeholder:text-subtle transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed';

export const Input = forwardRef(function Input(
  { className, type = 'text', icon: Icon, ...props },
  ref,
) {
  if (Icon) {
    return (
      <div className="relative">
        <Icon className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-subtle" />
        <input ref={ref} type={type} className={cn(baseField, 'pl-10', className)} {...props} />
      </div>
    );
  }
  return <input ref={ref} type={type} className={cn(baseField, className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 4, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(baseField, 'resize-y', className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(baseField, 'appearance-none pr-10', className)} {...props}>
      {children}
    </select>
  );
});

export function Label({ htmlFor, className, children, hint, ...props }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('inline-flex items-baseline gap-2 text-xs font-medium uppercase tracking-wide text-muted', className)}
      {...props}
    >
      {children}
      {hint ? <span className="text-[10px] normal-case font-normal text-subtle">{hint}</span> : null}
    </label>
  );
}

export function Field({ label, hint, error, children, className }) {
  const id = useId();
  // Clone first child to inject the generated id if it lacks one.
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? <Label htmlFor={id} hint={hint}>{label}</Label> : null}
      <div>
        {/* Most usages just place an <Input> as the child; the id ensures label-for linking. */}
        {typeof children === 'function' ? children({ id }) : children}
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export default Input;
