import React, { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, Hash } from 'lucide-react';

export const Step6DatosCliente: React.FC = () => {
    const { data, updateData } = useWizard();
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleDniChange = (value: string) => {
        // Solo permitir números
        const numericValue = value.replaceAll(/\D/g, '');

        updateData({
            clienteInteresado: {
                dni: numericValue ? Number.parseInt(numericValue, 10) : 0,
                nombreApellido: data.clienteInteresado?.nombreApellido || '',
                telefono: data.clienteInteresado?.telefono,
            },
        });

        // Validar DNI
        if (errors.dni) {
            const dni = Number.parseInt(numericValue, 10);
            if (dni >= 1000000 && dni <= 99999999) {
                setErrors((prev) => ({ ...prev, dni: '' }));
            }
        }
    };

    const handleNombreChange = (value: string) => {
        updateData({
            clienteInteresado: {
                dni: data.clienteInteresado?.dni || 0,
                nombreApellido: value,
                telefono: data.clienteInteresado?.telefono,
            },
        });

        // Validar nombre
        if (errors.nombreApellido) {
            if (value.trim().length >= 3) {
                setErrors((prev) => ({ ...prev, nombreApellido: '' }));
            }
        }
    };

    const handleTelefonoChange = (value: string) => {
        updateData({
            clienteInteresado: {
                dni: data.clienteInteresado?.dni || 0,
                nombreApellido: data.clienteInteresado?.nombreApellido || '',
                telefono: value,
            },
        });
    };

    const handleBlur = (field: string) => {
        const newErrors: Record<string, string> = {};

        if (field === 'dni' || !field) {
            const dni = data.clienteInteresado?.dni || 0;
            if (!dni || dni < 1000000 || dni > 99999999) {
                newErrors.dni = 'Ingrese un DNI válido (7-8 dígitos)';
            }
        }

        if (field === 'nombreApellido' || !field) {
            const nombre = data.clienteInteresado?.nombreApellido || '';
            if (nombre.trim().length < 3) {
                newErrors.nombreApellido = 'Ingrese nombre y apellido (mínimo 3 caracteres)';
            }
        }

        setErrors((prev) => ({ ...prev, ...newErrors }));
    };

    return (
        <div className="space-y-6">
            <Card className="border-2 border-primary/20">
                <CardHeader className="bg-primary/5">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <User className="w-6 h-6" />
                        Datos del Cliente Interesado
                    </CardTitle>
                    <CardDescription>
                        Ingrese los datos del cliente que está interesado en la/s unidad/es
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    {/* DNI */}
                    <div className="space-y-2">
                        <Label htmlFor="clienteDni" className="flex items-center gap-2">
                            <Hash className="w-4 h-4" />
                            DNI <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="clienteDni"
                            type="text"
                            inputMode="numeric"
                            placeholder="Ej: 12345678"
                            value={data.clienteInteresado?.dni || ''}
                            onChange={(e) => handleDniChange(e.target.value)}
                            onBlur={() => handleBlur('dni')}
                            className={errors.dni ? 'border-destructive' : ''}
                            maxLength={8}
                        />
                        {errors.dni && (
                            <p className="text-sm text-destructive">{errors.dni}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Documento Nacional de Identidad del cliente
                        </p>
                    </div>

                    {/* Nombre y Apellido */}
                    <div className="space-y-2">
                        <Label htmlFor="clienteNombre" className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Nombre y Apellido <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="clienteNombre"
                            type="text"
                            placeholder="Ej: Juan Pérez"
                            value={data.clienteInteresado?.nombreApellido || ''}
                            onChange={(e) => handleNombreChange(e.target.value)}
                            onBlur={() => handleBlur('nombreApellido')}
                            className={errors.nombreApellido ? 'border-destructive' : ''}
                            maxLength={255}
                        />
                        {errors.nombreApellido && (
                            <p className="text-sm text-destructive">{errors.nombreApellido}</p>
                        )}
                    </div>

                    {/* Teléfono */}
                    <div className="space-y-2">
                        <Label htmlFor="clienteTelefono" className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Teléfono <span className="text-muted-foreground">(opcional)</span>
                        </Label>
                        <Input
                            id="clienteTelefono"
                            type="tel"
                            placeholder="Ej: 3416412391"
                            value={data.clienteInteresado?.telefono || ''}
                            onChange={(e) => handleTelefonoChange(e.target.value)}
                            maxLength={50}
                        />
                        <p className="text-xs text-muted-foreground">
                            Número de contacto del cliente (sin espacios ni guiones)
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Tip informativo */}
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-1">💡 Tip:</p>
                <p>
                    Estos datos se utilizarán para identificar al cliente interesado en la operación.
                    Si el cliente ya existe en el sistema, se vinculará automáticamente. Si es nuevo, se creará un registro.
                </p>
            </div>
        </div>
    );
};
