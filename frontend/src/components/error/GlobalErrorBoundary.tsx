import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    handleReload = () => {
        globalThis.location.reload();
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
                    <div className="max-w-md space-y-4">
                        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">Algo salió mal</h1>
                        <p className="text-muted-foreground">
                            Se ha producido un error inesperado en la aplicación.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="bg-muted/50 p-4 rounded-lg text-left overflow-auto max-h-48 text-xs font-mono border border-border">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <div className="flex justify-center gap-4">
                            <Button onClick={() => globalThis.location.href = '/'} variant="outline">
                                Ir al Inicio
                            </Button>
                            <Button onClick={this.handleReload}>
                                Recargar
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
