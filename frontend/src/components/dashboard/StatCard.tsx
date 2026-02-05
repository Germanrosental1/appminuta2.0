import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  borderColor?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconColor = 'text-muted-foreground',
  trend,
  borderColor,
  className
}) => {
  return (
    <div
      className={cn(
        "stat-card",
        borderColor && `border-l-4`,
        className
      )}
      style={borderColor ? { borderLeftColor: borderColor } : undefined}
    >
      <div className="stat-card-content">
        <div className="stat-card-header">
          <p className="stat-card-title">{title}</p>
          {icon && (
            <span className={cn("material-symbols-outlined", iconColor)}>
              {icon}
            </span>
          )}
        </div>
        <div className="stat-card-body">
          <p className="stat-card-value">{value}</p>
          {trend && (
            <p className={cn(
              "stat-trend",
              trend.positive ? "stat-trend-up" : "stat-trend-down"
            )}>
              <span className="material-symbols-outlined text-[14px]">
                {trend.positive ? 'trending_up' : 'trending_down'}
              </span>
              {trend.value}
            </p>
          )}
          {subtitle && !trend && (
            <p className="text-xs font-medium mt-1 text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
