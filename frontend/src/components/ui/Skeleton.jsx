import { cn } from '../../lib/cn.js';

function Skeleton({ className, ...props }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" {...props} />;
}

export default Skeleton;
