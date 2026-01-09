import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import './dashboard.css';

interface DashboardHeaderProps {
    title: string;
    userName: string;
    onLogout: () => void;
    subtitle?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    title,
    userName,
    onLogout,
    subtitle
}) => {
    return (
        <div className="dashboard-header">
            <div className="dashboard-header-content">
                <div className="dashboard-header-left">
                    <img
                        src="/logoRosentalBlanco.png"
                        alt="Rosental Logo"
                        className="dashboard-logo"
                    />
                    <div className="dashboard-title-section">
                        <h1 className="dashboard-title">{title}</h1>
                        <p className="dashboard-subtitle">
                            {subtitle}
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={onLogout}
                    className="logout-button"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                </Button>
            </div>
        </div>
    );
};
