import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { backendAPI } from "@/services/backendAPI";

interface GastosGenerales {
    proyecto: string;
    sellado?: number;
    certificaciondefirmas?: number;
    alajamiento?: number;
    planosm2propiedad?: number;
    planosm2cochera?: number;
    comisioninmobiliaria?: number;
    otrosgastos?: number;
    fecha_posesion?: string;
    etapatorre?: string;
}

interface GastosGeneralesTabProps {
    projectId: string;
}

export function GastosGeneralesTab({ projectId }: GastosGeneralesTabProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [gastos, setGastos] = useState<GastosGenerales>({
        proyecto: projectId,
        sellado: 0,
        alajamiento: 0,
        comisioninmobiliaria: 0,
    });

    useEffect(() => {
        loadGastos();
    }, [projectId]);

    const loadGastos = async () => {
        try {
            setLoading(true);
            const data = await backendAPI.getGastosGenerales(projectId);

            if (data) {
                setGastos(data);
            }
            // If no data, default values are kept
        } catch (error) {
            toast.error('Error al cargar los gastos generales');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const updated = await backendAPI.updateGastosGenerales(projectId, gastos);
            setGastos(updated);
            toast.success('Gastos generales guardados correctamente');
        } catch (error) {
            toast.error('Error al guardar los gastos generales');
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: keyof GastosGenerales, value: any) => {
        setGastos(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gastos Generales del Proyecto</CardTitle>
                    <CardDescription>
                        Configure los gastos generales y comisiones aplicables a todas las unidades del proyecto
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Porcentajes */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">Porcentajes</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sellado">Sellado (%)</Label>
                                <Input
                                    id="sellado"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={gastos.sellado || ''}
                                    onChange={(e) => updateField('sellado', parseFloat(e.target.value) || 0)}
                                    placeholder="Ej: 0.05 para 5%"
                                    className={gastos.sellado ? "text-foreground" : ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="alajamiento">Alojamiento (%)</Label>
                                <Input
                                    id="alajamiento"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={gastos.alajamiento || ''}
                                    onChange={(e) => updateField('alajamiento', parseFloat(e.target.value) || 0)}
                                    placeholder="Ej: 0.02 para 2%"
                                    className={gastos.alajamiento ? "text-foreground" : ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="comisioninmobiliaria">Comisión Inmobiliaria (%)</Label>
                                <Input
                                    id="comisioninmobiliaria"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={gastos.comisioninmobiliaria || ''}
                                    onChange={(e) => updateField('comisioninmobiliaria', parseFloat(e.target.value) || 0)}
                                    placeholder="Ej: 0.02 para 2%"
                                    className={gastos.comisioninmobiliaria ? "text-foreground" : ""}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Costos por M² */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">Costos por M²</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="planosm2propiedad">Planos M² Propiedad</Label>
                                <Input
                                    id="planosm2propiedad"
                                    type="number"
                                    step="0.01"
                                    value={gastos.planosm2propiedad || ''}
                                    onChange={(e) => updateField('planosm2propiedad', parseFloat(e.target.value) || 0)}
                                    placeholder="Ej: 8.00"
                                    className={gastos.planosm2propiedad ? "text-foreground" : ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="planosm2cochera">Planos M² Cochera</Label>
                                <Input
                                    id="planosm2cochera"
                                    type="number"
                                    step="0.01"
                                    value={gastos.planosm2cochera || ''}
                                    onChange={(e) => updateField('planosm2cochera', parseFloat(e.target.value) || 0)}
                                    placeholder="Ej: 100.00"
                                    className={gastos.planosm2cochera ? "text-foreground" : ""}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Otros */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">Otros Gastos</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="certificaciondefirmas">Certificación de Firmas</Label>
                                <Input
                                    id="certificaciondefirmas"
                                    type="number"
                                    step="0.01"
                                    value={gastos.certificaciondefirmas || ''}
                                    onChange={(e) => updateField('certificaciondefirmas', parseFloat(e.target.value) || 0)}
                                    placeholder="Monto"
                                    className={gastos.certificaciondefirmas ? "text-foreground" : ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="otrosgastos">Otros Gastos</Label>
                                <Input
                                    id="otrosgastos"
                                    type="number"
                                    step="0.01"
                                    value={gastos.otrosgastos || ''}
                                    onChange={(e) => updateField('otrosgastos', parseFloat(e.target.value) || 0)}
                                    placeholder="Monto"
                                    className={gastos.otrosgastos ? "text-foreground" : ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fecha_posesion">Fecha Posesión</Label>
                                <Input
                                    id="fecha_posesion"
                                    type="text"
                                    value={gastos.fecha_posesion || ''}
                                    onChange={(e) => updateField('fecha_posesion', e.target.value)}
                                    placeholder="Ej: 30 días"
                                    className={gastos.fecha_posesion ? "text-foreground" : ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="etapatorre">Etapa / Torre</Label>
                                <Input
                                    id="etapatorre"
                                    type="text"
                                    value={gastos.etapatorre || ''}
                                    onChange={(e) => updateField('etapatorre', e.target.value)}
                                    placeholder="Ej: Torre A"
                                    className={gastos.etapatorre ? "text-foreground" : ""}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Botón de guardar */}
                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Guardar Cambios
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
