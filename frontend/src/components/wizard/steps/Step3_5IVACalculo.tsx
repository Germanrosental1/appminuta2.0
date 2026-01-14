import React, { useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const Step3_5IVACalculo: React.FC = () => {
    const { data, updateData } = useWizard();

    // Calcular precio total de todas las unidades seleccionadas
    const calcularPrecioTotal = () => {
        let total = 0;
        if (data.unidades && data.unidades.length > 0) {
            data.unidades.forEach(unidad => {
                total += unidad.precioNegociado || 0;
            });
            return total;
        }
        // Fallback simple
        return data.precioNegociado || 0;
    };

    const precioTotal = calcularPrecioTotal();

    // Parte A = Parte F (Financiada)
    // Si modo es porcentaje, es % del total. Si es importe, es el importe fijo.
    // MANTENER SIEMPRE EN USD
    let montoA = data.modoA === "porcentaje"
        ? (precioTotal * (data.porcA || 0)) / 100
        : (data.impA || 0);

    // Manejar cambio de porcentaje
    const handlePorcentajeChange = (value: string) => {
        const numValue = Number.parseFloat(value);
        if (!Number.isNaN(numValue) && numValue >= 0) {
            // Calcular nuevo monto de IVA (EN USD)
            const nuevoMontoIVA = montoA * (numValue / 100);
            updateData({
                porcentajeIVA: numValue,
                montoIVA: nuevoMontoIVA
            });
        } else {
            updateData({
                porcentajeIVA: 0,
                montoIVA: 0
            });
        }
    };

    // Efecto inicial: calcular si ya hay porcentaje pero cambió el monto base
    useEffect(() => {
        if (data.porcentajeIVA && data.porcentajeIVA > 0) {
            // Recalcular en USD
            const nuevoMontoIVA = montoA * (data.porcentajeIVA / 100);

            // Solo actualizar si hay diferencia significativa
            if (Math.abs(nuevoMontoIVA - (data.montoIVA || 0)) > 0.01) {
                updateData({
                    montoIVA: nuevoMontoIVA
                });
            }
        }
    }, [montoA, data.porcentajeIVA]);


    // Helpers de formato
    const formatCurrency = (val: number) =>
        val.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <Card>
                <CardHeader className="bg-muted/50">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Info className="w-5 h-5 text-primary" />
                        Cálculo de Impuestos (IVA)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Este proyecto tiene el <strong>IVA NO INCLUIDO</strong>.
                            Por favor, ingrese el porcentaje de IVA a aplicar sobre la <strong>Parte F (Financiada)</strong>.
                            <br />
                            <span className="text-xs mt-1 block text-muted-foreground">
                                * El cálculo se realiza en USD sobre el valor base de la unidad. La conversión a ARS se realizará en el siguiente paso si corresponde.
                            </span>
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        {/* Visualización del Monto Base (Parte F) */}
                        <div className="space-y-2 p-4 bg-secondary/20 rounded-lg border border-secondary/30">
                            <Label className="text-muted-foreground">Base Imponible (Parte F)</Label>
                            <p className="text-3xl font-bold tracking-tight">
                                USD {formatCurrency(montoA)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Monto sobre el cual se calculará el impuesto (en USD).
                            </p>
                        </div>

                        {/* Input de Porcentaje */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="porcentajeIVA" className="text-lg">Porcentaje de IVA (%)</Label>
                                <div className="relative">
                                    <Input
                                        id="porcentajeIVA"
                                        type="number"
                                        placeholder="0"
                                        value={data.porcentajeIVA || ''}
                                        onChange={(e) => handlePorcentajeChange(e.target.value)}
                                        className="text-xl h-12 pr-8"
                                        min="0"
                                        step="0.01"
                                    />
                                    <span className="absolute right-3 top-3 text-muted-foreground font-medium">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Resultado */}
                    <div className="bg-primary/5 p-6 rounded-lg space-y-4">
                        <div className="flex justify-between items-center text-lg">
                            <span>Monto de IVA Calculado:</span>
                            <span className="font-bold text-primary text-xl">+ USD {formatCurrency(data.montoIVA || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center font-medium opacity-80">
                            <span>Total Parte F (Con IVA):</span>
                            <span>USD {formatCurrency(montoA + (data.montoIVA || 0))}</span>
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
};
