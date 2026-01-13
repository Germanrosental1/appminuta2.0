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
import { AlertTriangle, Info } from 'lucide-react';

interface MotivoModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (motivo: string) => Promise<void>;
    isLoading?: boolean;
    title: string;
    description: string;
    label?: string;
    placeholder?: string;
    actionLabel?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    icon?: React.ReactNode;
}

export const MotivoModal: React.FC<MotivoModalProps> = ({
    open,
    onOpenChange,
    onConfirm,
    isLoading = false,
    title,
    description,
    label = "Motivo",
    placeholder = "Escribe el motivo...",
    actionLabel = "Confirmar",
    variant = "default",
    icon
}) => {
    const [motivo, setMotivo] = useState('');
    const [error, setError] = useState('');

    const handleConfirm = async () => {
        if (!motivo.trim()) {
            setError('Este campo es obligatorio');
            return;
        }

        try {
            await onConfirm(motivo.trim());
            setMotivo('');
            setError('');
            onOpenChange(false);
        } catch (err) {
            console.error('Error in action:', err);
            setError('Ocurrió un error al procesar la acción');
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
                    <DialogTitle className={`flex items-center gap-2 ${variant === 'destructive' ? 'text-destructive' : ''}`}>
                        {icon || (variant === 'destructive' ? <AlertTriangle className="h-5 w-5" /> : <Info className="h-5 w-5" />)}
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="motivo">
                            {label} <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="motivo"
                            placeholder={placeholder}
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
                        variant={variant}
                        onClick={handleConfirm}
                        disabled={!motivo.trim() || isLoading}
                    >
                        {isLoading ? 'Procesando...' : actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
