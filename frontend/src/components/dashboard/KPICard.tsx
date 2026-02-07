import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    subValue?: string;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    variant?: 'default' | 'blue' | 'yellow' | 'red' | 'orange' | 'green';
    updatedAt?: string;
    urgentCount?: number;
}

export const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    icon: Icon,
    subValue,
    trend,
    variant = 'default',
    updatedAt,
    urgentCount
}) => {
    // Configuración de colores según variante
    const variants = {
        default: {
            border: 'border-border',
            iconBg: 'bg-muted',
            iconColor: 'text-muted-foreground',
            valueColor: 'text-card-foreground'
        },
        blue: {
            border: 'border-blue-500/30',
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-400',
            valueColor: 'text-card-foreground'
        },
        yellow: {
            border: 'border-yellow-500/30',
            iconBg: 'bg-yellow-500/20',
            iconColor: 'text-yellow-400',
            valueColor: 'text-card-foreground'
        },
        red: {
            border: 'border-red-500/30',
            iconBg: 'bg-red-500/20',
            iconColor: 'text-red-400',
            valueColor: 'text-card-foreground'
        },
        orange: {
            border: 'border-orange-500/30',
            iconBg: 'bg-orange-500/20',
            iconColor: 'text-orange-400',
            valueColor: 'text-card-foreground'
        },
        green: {
            border: 'border-green-500/30',
            iconBg: 'bg-green-500/20',
            iconColor: 'text-green-400',
            valueColor: 'text-white'
        }
    };

    const style = variants[variant] || variants['default'];

    return (
        <Card className={`bg-card/80 backdrop-blur-xl ${style.border} shadow-lg transition-all hover:scale-[1.02]`}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">{title}</span>
                    <div className={`p-2 rounded-lg ${style.iconBg} ${style.iconColor}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>

                <div className="space-y-1">
                    <h3 className={`text-3xl font-bold ${style.valueColor}`}>{value}</h3>

                    <div className="flex flex-col gap-1">
                        {updatedAt && (
                            <p className="text-xs text-muted-foreground">{updatedAt}</p>
                        )}

                        {urgentCount !== undefined && urgentCount > 0 && (
                            <p className="text-xs text-yellow-500 font-medium flex items-center gap-1">
                                ! {urgentCount} urgentes
                            </p>
                        )}

                        {trend && (
                            <p className={`text-xs font-medium flex items-center gap-1 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                {trend.isPositive ? '↗' : '↘'} {trend.value}
                            </p>
                        )}

                        {subValue && !trend && !updatedAt && !urgentCount && (
                            <p className="text-xs text-muted-foreground">{subValue}</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
