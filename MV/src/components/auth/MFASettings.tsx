import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Shield, ShieldCheck, ShieldOff, Loader2, Trash2 } from 'lucide-react';
import { EnrollMFA } from './EnrollMFA';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface MFAFactor {
    id: string;
    friendly_name: string;
    factor_type: string;
    status: string;
    created_at: string;
}

/**
 * MFASettings - Panel de configuración de autenticación 2FA
 * Permite activar, ver estado y desactivar MFA (con verificación)
 */
export function MFASettings() {
    const [factors, setFactors] = useState<MFAFactor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEnroll, setShowEnroll] = useState(false);
    const [showUnenrollDialog, setShowUnenrollDialog] = useState(false);
    const [unenrollFactorId, setUnenrollFactorId] = useState<string | null>(null);
    const [unenrollCode, setUnenrollCode] = useState('');
    const [unenrolling, setUnenrolling] = useState(false);
    const [error, setError] = useState('');

    const loadFactors = async () => {
        try {
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) {
                setError(error.message);
                return;
            }
            const verifiedFactors = data.totp.filter(f => f.status === 'verified');
            setFactors(verifiedFactors as MFAFactor[]);
        } catch (err: unknown) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFactors();
    }, []);

    // 🔒 SECURITY: Require TOTP verification before unenroll
    const handleUnenroll = async () => {
        if (!unenrollFactorId || unenrollCode.length !== 6) {
            setError('Ingresa el código de 6 dígitos');
            return;
        }

        setUnenrolling(true);
        setError('');

        try {
            // Verify TOTP code first
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: unenrollFactorId
            });

            if (challengeError) {
                setError('Error al verificar código');
                setUnenrolling(false);
                return;
            }

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: unenrollFactorId,
                challengeId: challengeData.id,
                code: unenrollCode
            });

            if (verifyError) {
                setError('Código incorrecto');
                setUnenrolling(false);
                return;
            }

            // Code verified, now unenroll
            const { error: unenrollError } = await supabase.auth.mfa.unenroll({
                factorId: unenrollFactorId
            });

            if (unenrollError) {
                setError(unenrollError.message);
                setUnenrolling(false);
                return;
            }

            // Success
            setShowUnenrollDialog(false);
            setUnenrollCode('');
            setUnenrollFactorId(null);
            await loadFactors();
            await supabase.auth.refreshSession();
        } catch (err: unknown) {
            setError('Error al desactivar 2FA');
        } finally {
            setUnenrolling(false);
        }
    };

    const openUnenrollDialog = (factorId: string) => {
        setUnenrollFactorId(factorId);
        setUnenrollCode('');
        setError('');
        setShowUnenrollDialog(true);
    };

    const handleEnrollSuccess = async () => {
        setShowEnroll(false);
        await loadFactors();
    };

    const hasMFA = factors.length > 0;

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {hasMFA ? (
                            <ShieldCheck className="h-6 w-6 text-green-600" />
                        ) : (
                            <ShieldOff className="h-6 w-6 text-amber-500" />
                        )}
                        <div>
                            <CardTitle className="text-lg">Autenticación de Dos Factores</CardTitle>
                            <CardDescription>
                                Protege tu cuenta con un código adicional
                            </CardDescription>
                        </div>
                    </div>
                    <Badge variant={hasMFA ? 'default' : 'secondary'}>
                        {hasMFA ? 'Activo' : 'Inactivo'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && !showUnenrollDialog && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {hasMFA ? (
                    <>
                        <div className="text-sm text-muted-foreground">
                            Tu cuenta está protegida con autenticación de dos factores.
                        </div>

                        <div className="space-y-2">
                            {factors.map((factor) => (
                                <div
                                    key={factor.id}
                                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <Shield className="h-5 w-5 text-primary" />
                                        <div>
                                            <p className="font-medium text-sm">
                                                {factor.friendly_name || 'App de Autenticación'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Configurado el {new Date(factor.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => openUnenrollDialog(factor.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* 🔒 Unenroll Dialog with TOTP verification */}
                        <Dialog open={showUnenrollDialog} onOpenChange={setShowUnenrollDialog}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Desactivar 2FA</DialogTitle>
                                    <DialogDescription>
                                        Para desactivar la autenticación de dos factores, ingresa el código actual de tu app.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <Alert variant="destructive">
                                        <AlertDescription>
                                            <strong>Advertencia:</strong> Tu cuenta será menos segura sin 2FA.
                                        </AlertDescription>
                                    </Alert>
                                    <div className="space-y-2">
                                        <Label htmlFor="unenrollCode">Código de verificación</Label>
                                        <Input
                                            id="unenrollCode"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder="000000"
                                            value={unenrollCode}
                                            onChange={(e) => setUnenrollCode(e.target.value.replace(/\D/g, ''))}
                                            className="text-center text-2xl tracking-widest"
                                            disabled={unenrolling}
                                        />
                                    </div>
                                    {error && showUnenrollDialog && (
                                        <Alert variant="destructive">
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowUnenrollDialog(false)}
                                        disabled={unenrolling}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleUnenroll}
                                        disabled={unenrolling || unenrollCode.length !== 6}
                                    >
                                        {unenrolling ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Verificando...
                                            </>
                                        ) : (
                                            'Desactivar 2FA'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </>
                ) : (
                    <>
                        <Alert>
                            <Shield className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Recomendado:</strong> Activa la autenticación de dos factores
                                para mayor seguridad.
                            </AlertDescription>
                        </Alert>

                        <Dialog open={showEnroll} onOpenChange={setShowEnroll}>
                            <DialogTrigger asChild>
                                <Button className="w-full">
                                    <Shield className="h-4 w-4 mr-2" />
                                    Activar 2FA
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <EnrollMFA
                                    onEnrolled={handleEnrollSuccess}
                                    onCancelled={() => setShowEnroll(false)}
                                />
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

