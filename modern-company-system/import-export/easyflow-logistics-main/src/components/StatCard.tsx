import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
  children?: ReactNode;
}

const variantStyles = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
};

export function StatCard({ title, value, icon: Icon, description, variant = 'default', children }: StatCardProps) {
  return (
    <div className="rounded-xl bg-card p-5 card-shadow transition-shadow hover:card-shadow-hover h-full flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-2 text-xl font-bold text-foreground break-words leading-snug">
            {typeof value === 'string' && value.includes('|') ? (
              value.split('|').map((v, i) => <span key={i} className="block">{v.trim()}</span>)
            ) : value}
          </p>
          {description && <p className="mt-2 text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className={`rounded-lg p-3 shrink-0 ${variantStyles[variant]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {children && <div className="mt-4 pt-3 border-t border-border/50">{children}</div>}
    </div>
  );
}
