import { cn } from '../../lib/cn.js';

function Container({ size = 'lg', className, children, as: Comp = 'div', ...props }) {
  const max =
    size === 'sm' ? 'max-w-3xl' : size === 'md' ? 'max-w-5xl' : size === 'xl' ? 'max-w-screen-2xl' : 'max-w-7xl';
  return (
    <Comp className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', max, className)} {...props}>
      {children}
    </Comp>
  );
}

export default Container;
