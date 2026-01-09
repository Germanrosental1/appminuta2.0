import React from 'react';
import { useWizard } from '@/context/WizardContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone } from 'lucide-react';

export const Step6DatosCliente: React.FC = () => {
    const { data, updateData } = useWizard();

    const handleNombreChange = (value: string) => {
        updateData({
            clienteInteresado: {
                dni: 0,
                nombreApellido: value,
                telefono: data.clienteInteresado?.telefono,
            },
        });
    };

    const handleTelefonoChange = (value: string) => {
        updateData({
            clienteInteresado: {
                dni: 0,
                nombreApellido: data.clienteInteresado?.nombreApellido || '',
                telefono: value,
            },
        });
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
                    {/* Nombre y Apellido */}
                    <div className="space-y-2">
                        <Label htmlFor="clienteNombre" className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Nombre y Apellido
                        </Label>
                        <Input
                            id="clienteNombre"
                            type="text"
                            placeholder="Ej: Juan Pérez"
                            value={data.clienteInteresado?.nombreApellido || ''}
                            onChange={(e) => handleNombreChange(e.target.value)}
                            maxLength={255}
                        />
                    </div>

                    {/* Teléfono */}
                    <div className="space-y-2">
                        <Label htmlFor="clienteTelefono" className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Teléfono
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
