import { Sidebar } from './Sidebar';
import { ModeToggle } from '@/components/mode-toggle';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            <Sidebar />
            <main className="flex flex-1 flex-col overflow-hidden bg-background relative">
                {/* Header with Mode Toggle */}
                <div className="absolute top-4 right-8 z-50">
                    <ModeToggle />
                </div>

                {/* Background Gradients for Dashboard Content */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                </div>

                <div className="flex-1 overflow-y-auto w-full z-10 p-6 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
