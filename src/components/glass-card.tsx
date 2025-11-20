import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
