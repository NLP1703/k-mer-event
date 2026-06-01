import { cn } from '../../lib/cn.js';

export function Card({ as: Comp = 'div', className, children, interactive = false, ...props }) {
  return (
    <Comp
      className={cn(
        'rounded-2xl border border-border bg-surface shadow-card',
        interactive && 'transition hover:shadow-elevated hover:-translate-y-0.5',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('p-6 border-b border-border', className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('p-6 border-t border-border', className)} {...props}>
      {children}
    </div>
  );
}

export default Card;
