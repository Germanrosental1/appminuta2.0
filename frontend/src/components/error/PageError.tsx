import React from 'react';
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export const PageError: React.FC = () => {
    const error = useRouteError();

    let errorMessage: string;
    let errorTitle = "Ha ocurrido un error";

    if (isRouteErrorResponse(error)) {
        // Error de React Router (404, 401, etc si se lanzan)
        errorTitle = `${error.status} ${error.statusText}`;
        errorMessage = error.data?.message || 'Error en la navegación';
    } else if (error instanceof Error) {
        // Error JS standard
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        errorMessage = 'Error desconocido';
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">{errorTitle}</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    {errorMessage}
                </p>
            </div>

            <div className="flex gap-4">
                <Button variant="outline" onClick={() => globalThis.location.reload()}>
                    Intentar nuevamente
                </Button>
                <Button asChild>
                    <Link to="/">Volver al Inicio</Link>
                </Button>
            </div>
        </div>
    );
};
