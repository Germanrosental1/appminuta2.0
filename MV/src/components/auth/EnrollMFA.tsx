import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Shield, Loader2 } from 'lucide-react';

interface EnrollMFAProps {
    onEnrolled: () => void;
    onCancelled: () => void;
}

/**
 * EnrollMFA - Componente para configurar 2FA por primera vez
 * Muestra un código QR que el usuario escanea con Google Authenticator, 1Password, etc.
 */
export function EnrollMFA({ onEnrolled, onCancelled }: EnrollMFAProps) {
    const [factorId, setFactorId] = useState('');
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);

    // Iniciar enrollment al montar el componente
    useEffect(() => {
        const enrollMFA = async () => {
            try {
                const { data, error } = await supabase.auth.mfa.enroll({
                    factorType: 'totp',
                    friendlyName: 'Mapa de Ventas'
                });

                if (error) {
                    setError(error.message);
                    return;
                }

                setFactorId(data.id);
                setQrCode(data.totp.qr_code);
                setSecret(data.totp.secret);
            } catch (err: any) {
                setError(err.message || 'Error al configurar 2FA');
            } finally {
                setLoading(false);
            }
        };

        enrollMFA();
    }, []);

    const handleVerify = async () => {
        if (!verifyCode || verifyCode.length !== 6) {
            setError('Ingresa el código de 6 dígitos');
            return;
        }

        setError('');
        setVerifying(true);

        try {
            // Crear challenge
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId
            });

            if (challengeError) {
                setError(challengeError.message);
                setVerifying(false);
                return;
            }

            // Verificar código
            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code: verifyCode
            });

            if (verifyError) {
                setError(verifyError.message);
                setVerifying(false);
                return;
            }

            // Éxito
            onEnrolled();
        } catch (err: any) {
            setError(err.message || 'Error al verificar código');
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Configurando autenticación...</p>
            </div>
        );
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <div className="bg-primary p-3 rounded-full">
                        <Shield className="h-8 w-8 text-white" />
                    </div>
                </div>
                <CardTitle>Configurar Autenticación 2FA</CardTitle>
                <CardDescription>
                    Escanea el código QR con Google Authenticator, 1Password u otra app de autenticación
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Código QR */}
                <div className="flex justify-center">
                    {qrCode && (
                        <img
                            src={qrCode}
                            alt="Código QR para 2FA"
                            className="w-48 h-48 border rounded-lg"
                        />
                    )}
                </div>

                {/* 🔒 SECURITY: Código secreto oculto por defecto */}
                <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                        ¿No puedes escanear? Haz click para ver el código:
                    </p>
                    <button
                        type="button"
                        className="bg-muted px-3 py-1 rounded text-sm font-mono select-all hover:bg-muted/80 transition-colors"
                        onClick={(e) => {
                            const target = e.currentTarget;
                            if (target.textContent === '••••••••••••••••') {
                                target.textContent = secret;
                            } else {
                                target.textContent = '••••••••••••••••';
                            }
                        }}
                    >
                        ••••••••••••••••
                    </button>
                </div>

                {/* Input de verificación */}
                <div className="space-y-2">
                    <Label htmlFor="verifyCode">Código de verificación</Label>
                    <Input
                        id="verifyCode"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="123456"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                        className="text-center text-2xl tracking-widest"
                        disabled={verifying}
                    />
                    <p className="text-xs text-muted-foreground">
                        Ingresa el código de 6 dígitos de tu app de autenticación
                    </p>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Botones */}
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onCancelled}
                        disabled={verifying}
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleVerify}
                        disabled={verifying || verifyCode.length !== 6}
                    >
                        {verifying ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Verificando...
                            </>
                        ) : (
                            'Activar 2FA'
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
