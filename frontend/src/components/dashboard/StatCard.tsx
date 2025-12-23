import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import './dashboard.css';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    colorScheme?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
    isLoading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon: Icon,
    trend,
    colorScheme = 'blue',
    isLoading = false
}) => {
    return (
        <Card className={`stat-card stat-card-${colorScheme}`}>
            <CardContent className="stat-card-content">
                <div className="stat-card-header">
                    <div className={`stat-card-icon stat-card-icon-${colorScheme}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    {trend && (
                        <div className={`stat-trend ${trend.isPositive ? 'stat-trend-up' : 'stat-trend-down'}`}>
                            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                        </div>
                    )}
                </div>
                <div className="stat-card-body">
                    <h3 className="stat-card-title">{title}</h3>
                    {isLoading ? (
                        <div className="stat-card-skeleton"></div>
                    ) : (
                        <p className="stat-card-value">{value}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
