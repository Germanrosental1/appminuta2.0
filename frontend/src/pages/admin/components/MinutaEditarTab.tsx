import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit, Save, XCircle, Loader2 } from 'lucide-react';

interface MinutaEditarTabProps {
    editandoDatos: boolean;
    guardandoDatos: boolean;
    datosEditados: any;
    minutaDatos: any;
    onEditar: () => void;
    onCancelar: () => void;
    onGuardar: () => void;
    onCambioDato: (campo: string, valor: string) => void;
}

export const MinutaEditarTab: React.FC<MinutaEditarTabProps> = ({
    editandoDatos,
    guardandoDatos,
    datosEditados,
    minutaDatos,
    onEditar,
    onCancelar,
    onGuardar,
    onCambioDato
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Editar Datos de la Minuta Comercial</span>
                    <div className="flex gap-2">
                        {editandoDatos ? (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onCancelar}
                                    disabled={guardandoDatos}
                                >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancelar
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={onGuardar}
                                    disabled={guardandoDatos}
                                >
                                    {guardandoDatos ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-1" />
                                            Guardar Cambios
                                        </>
                                    )}
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onEditar}
                            >
                                <Edit className="h-4 w-4 mr-1" />
                                Editar Datos
                            </Button>
                        )}
                    </div>
                </CardTitle>
                <CardDescription>
                    Modifique los datos de la minuta comercial según sea necesario
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                    {editandoDatos ? (
                        <div className="space-y-4">
                            {datosEditados && Object.entries(datosEditados).map(([key, value]) => {
                                // No mostrar objetos anidados o arrays
                                if (typeof value === 'object' && value !== null) return null;

                                return (
                                    <div key={key} className="grid gap-2">
                                        <Label htmlFor={key}>{key}</Label>
                                        <Input
                                            id={key}
                                            value={value as string}
                                            onChange={(e) => onCambioDato(key, e.target.value)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {minutaDatos && Object.entries(minutaDatos).map(([key, value]) => {
                                // No mostrar objetos anidados o arrays
                                if (typeof value === 'object' && value !== null) return null;

                                return (
                                    <div key={key} className="border-b pb-2">
                                        <span className="font-medium">{key}: </span>
                                        <span>{typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : ''}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
