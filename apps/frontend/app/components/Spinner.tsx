import { cn } from '@/app/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'rounded-full border-[3px] border-[#d0dae8] border-t-[#3a9fd8] animate-spin',
        size === 'sm' && 'h-4 w-4 border-2',
        size === 'md' && 'h-5 w-5',
        size === 'lg' && 'h-10 w-10',
        className,
      )}
    />
  );
}
