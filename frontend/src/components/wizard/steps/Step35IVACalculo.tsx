import React, { useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const Step35IVACalculo: React.FC = () => {
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

    // Manejar cambio de base imponible
    const handleBaseImponibleChange = (value: string) => {
        const numValue = Number.parseFloat(value);
        if (!Number.isNaN(numValue) && numValue >= 0 && numValue <= 100) {
            // Recalcular IVA con la nueva base imponible
            const baseImponible = montoA * (numValue / 100);
            const nuevoMontoIVA = baseImponible * ((data.porcentajeIVA || 0) / 100);
            updateData({
                baseImponiblePorc: numValue,
                montoIVA: nuevoMontoIVA
            });
        } else if (value === '') {
            updateData({
                baseImponiblePorc: 100,
                montoIVA: montoA * ((data.porcentajeIVA || 0) / 100)
            });
        }
    };

    // Manejar cambio de porcentaje de IVA
    const handlePorcentajeChange = (value: string) => {
        const numValue = Number.parseFloat(value);
        if (!Number.isNaN(numValue) && numValue >= 0) {
            // Calcular base imponible primero
            const baseImponiblePorc = data.baseImponiblePorc || 100; // Default 100%
            const baseImponible = montoA * (baseImponiblePorc / 100);
            // Calcular nuevo monto de IVA sobre la base imponible
            const nuevoMontoIVA = baseImponible * (numValue / 100);
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
            // Calcular base imponible
            const baseImponiblePorc = data.baseImponiblePorc || 100; // Default 100%
            const baseImponible = montoA * (baseImponiblePorc / 100);
            // Recalcular IVA sobre la base imponible
            const nuevoMontoIVA = baseImponible * (data.porcentajeIVA / 100);

            // Solo actualizar si hay diferencia significativa
            if (Math.abs(nuevoMontoIVA - (data.montoIVA || 0)) > 0.01) {
                updateData({
                    montoIVA: nuevoMontoIVA
                });
            }
        }
    }, [montoA, data.porcentajeIVA, data.baseImponiblePorc]);


    // Helpers de formato
    const formatCurrency = (val: number) =>
        val.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <Card className="border border-border bg-card">
                <CardHeader className="bg-muted/30 border-b border-border">
                    <CardTitle className="text-xl flex items-center gap-2 text-card-foreground">
                        <Info className="w-5 h-5 text-primary" />
                        Cálculo de Impuestos (IVA)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <Alert className="bg-primary/10 border-primary/20 text-foreground">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription>
                            Este proyecto tiene el <strong className="text-foreground">IVA NO INCLUIDO</strong>.
                            Por favor, ingrese el porcentaje de IVA a aplicar sobre la <strong className="text-foreground">Parte F (Financiada)</strong>.
                            <br />
                            <span className="text-xs mt-1 block text-muted-foreground">
                                * El cálculo se realiza en USD sobre el valor base de la unidad. La conversión a ARS se realizará en el siguiente paso si corresponde.
                            </span>
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-6">
                        {/* Visualización del Monto Base (Parte F) */}
                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                            <Label className="text-muted-foreground">Parte F (Financiada)</Label>
                            <p className="text-3xl font-bold tracking-tight text-foreground">
                                USD {formatCurrency(montoA)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Monto total de la Parte F (en USD).
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Input de Base Imponible */}
                            <div className="space-y-2">
                                <Label htmlFor="baseImponible" className="text-lg text-foreground">Base Imponible (%)</Label>
                                <div className="relative">
                                    <Input
                                        id="baseImponible"
                                        type="number"
                                        placeholder="100"
                                        value={data.baseImponiblePorc !== undefined ? data.baseImponiblePorc : 100}
                                        onChange={(e) => handleBaseImponibleChange(e.target.value)}
                                        className="text-xl h-12 pr-8 bg-background border-input text-foreground"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                    />
                                    <span className="absolute right-3 top-3 text-muted-foreground font-medium">%</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Porcentaje de F sobre el que se calcula el IVA
                                </p>
                                <p className="text-sm font-medium text-primary">
                                    = USD {formatCurrency(montoA * ((data.baseImponiblePorc || 100) / 100))}
                                </p>
                            </div>

                            {/* Input de Porcentaje de IVA */}
                            <div className="space-y-2">
                                <Label htmlFor="porcentajeIVA" className="text-lg text-foreground">Porcentaje de IVA (%)</Label>
                                <div className="relative">
                                    <Input
                                        id="porcentajeIVA"
                                        type="number"
                                        placeholder="0"
                                        value={data.porcentajeIVA || ''}
                                        onChange={(e) => handlePorcentajeChange(e.target.value)}
                                        className="text-xl h-12 pr-8 bg-background border-input text-foreground"
                                        min="0"
                                        step="0.01"
                                    />
                                    <span className="absolute right-3 top-3 text-muted-foreground font-medium">%</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Porcentaje de IVA sobre la base imponible
                                </p>
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-border" />

                    {/* Resultado */}
                    <div className="bg-primary/10 p-6 rounded-lg space-y-4 border border-primary/20">
                        <div className="flex justify-between items-center text-lg text-foreground">
                            <span>Monto de IVA Calculado:</span>
                            <span className="font-bold text-primary text-xl">+ USD {formatCurrency(data.montoIVA || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center font-medium opacity-80 text-foreground">
                            <span>Total Parte F (Con IVA):</span>
                            <span>USD {formatCurrency(montoA + (data.montoIVA || 0))}</span>
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
};
