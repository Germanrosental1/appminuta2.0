import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface CancelarMinutaModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (motivo: string) => Promise<void>;
    isLoading?: boolean;
}

export const CancelarMinutaModal: React.FC<CancelarMinutaModalProps> = ({
    open,
    onOpenChange,
    onConfirm,
    isLoading = false,
}) => {
    const [motivo, setMotivo] = useState('');
    const [error, setError] = useState('');

    const handleConfirm = async () => {
        if (!motivo.trim()) {
            setError('El motivo de cancelación es obligatorio');
            return;
        }

        try {
            await onConfirm(motivo.trim());
            setMotivo('');
            setError('');
            onOpenChange(false);
        } catch (err) {
            console.error('Error canceling minuta:', err);
            setError('Error al cancelar la minuta');
        }
    };

    const handleClose = () => {
        setMotivo('');
        setError('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Cancelar Minuta
                    </DialogTitle>
                    <DialogDescription>
                        Esta acción no se puede deshacer. Por favor, indica el motivo de la cancelación.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="motivo">
                            Motivo de cancelación <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="motivo"
                            placeholder="Escribe el motivo por el cual se cancela esta minuta..."
                            value={motivo}
                            onChange={(e) => {
                                setMotivo(e.target.value);
                                if (error) setError('');
                            }}
                            className={error ? 'border-destructive' : ''}
                            rows={4}
                        />
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        Volver
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!motivo.trim() || isLoading}
                    >
                        {isLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
