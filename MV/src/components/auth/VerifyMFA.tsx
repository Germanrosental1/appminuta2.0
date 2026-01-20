import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Shield, Loader2 } from 'lucide-react';

interface VerifyMFAProps {
    onVerified: () => void;
    onCancel?: () => void;
}

/**
 * VerifyMFA - Pantalla de verificación 2FA durante login
 * El usuario ingresa el código de 6 dígitos de su app de autenticación
 */
<<<<<<< HEAD
export function VerifyMFA({ onVerified, onCancel }: Readonly<VerifyMFAProps>) {
=======
export function VerifyMFA({ onVerified, onCancel }: VerifyMFAProps) {
>>>>>>> 321c444ac886421694c5304e301925e1e4b8e1a0
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
<<<<<<< HEAD
        if (code?.length !== 6) {
=======
        if (!code || code.length !== 6) {
>>>>>>> 321c444ac886421694c5304e301925e1e4b8e1a0
            setError('Ingresa el código de 6 dígitos');
            return;
        }

        setError('');
        setLoading(true);

        try {
            // Obtener factores TOTP del usuario
            const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

            if (factorsError) {
                setError(factorsError.message);
                setLoading(false);
                return;
            }

            const totpFactor = factorsData.totp[0];
            if (!totpFactor) {
                // 🔒 SECURITY: Generic error message
                setError('Error de autenticación. Contacta al administrador.');
                setLoading(false);
                return;
            }

            // Crear challenge
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: totpFactor.id
            });

            if (challengeError) {
                setError(challengeError.message);
                setLoading(false);
                return;
            }

            // Verificar código
            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: totpFactor.id,
                challengeId: challengeData.id,
                code
            });

            if (verifyError) {
                setError('Código incorrecto. Intenta nuevamente.');
                setLoading(false);
                return;
            }

            // Éxito - el JWT ahora tiene aal2
            onVerified();
        } catch (err: any) {
            setError(err.message || 'Error al verificar código');
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && code.length === 6) {
            handleVerify();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-primary p-3 rounded-full">
                            <Shield className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <CardTitle>Verificación de Seguridad</CardTitle>
                    <CardDescription>
                        Ingresa el código de tu app de autenticación
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="mfaCode">Código de verificación</Label>
                        <Input
                            id="mfaCode"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            placeholder="000000"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={handleKeyDown}
                            className="text-center text-3xl tracking-[0.5em] font-mono"
                            disabled={loading}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground text-center">
                            Abre Google Authenticator, 1Password u otra app y copia el código
                        </p>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Button
                        className="w-full"
                        onClick={handleVerify}
                        disabled={loading || code.length !== 6}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Verificando...
                            </>
                        ) : (
                            'Verificar'
                        )}
                    </Button>

                    {onCancel && (
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
