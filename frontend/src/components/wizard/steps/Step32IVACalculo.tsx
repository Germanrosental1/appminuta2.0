import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Calculator, Percent } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export const Step32IVACalculo: React.FC = () => {
    // Content from Step35IVACalculo.tsx, renamed to Step32IVACalculo.
    const { data, updateData } = useWizard();
    const [basePrice, setBasePrice] = useState<number>(0);

    // Calcular precio base (Parte F)
    useEffect(() => {
        let price = 0;
        // Si la composición ya se definió en el paso anterior
        if (data.modoA === "porcentaje") {
            // Si es porcentaje, es el X% del total
            const total = data.precioNegociado || 0; // Assuming total is stored here or summing units
            // Better calculate total again to be safe
            let totalCalc = 0;
            if (data.unidades && data.unidades.length > 0) {
                data.unidades.forEach(u => totalCalc += u.precioNegociado || 0);
            } else {
                totalCalc = data.precioNegociado || 0;
                if (data.cocheras) data.cocheras.forEach(c => totalCalc += c.precioNegociado || 0);
                if (data.baulera) totalCalc += data.baulera.precioNegociado || 0;
            }
            price = (totalCalc * (data.porcA || 0)) / 100;
        } else {
            // Si es importe fijo
            price = data.impA || 0;
        }

        // Convert to ARS if needed? Actually IVA calculation usually on the currency of the invoice
        // Assuming Parte F might be in ARS or USD.
        // If we want to show everything in USD for now or stick to the selected currency.
        // The design shows "Monto Imponible (Parte F)"

        setBasePrice(price);
    }, [data]);

    const handlePercentageChange = (value: string) => {
        const num = parseFloat(value);
        if (!isNaN(num) && num >= 0 && num <= 100) {
            updateData({ porcentajeIVA: num });
        } else if (value === "") {
            updateData({ porcentajeIVA: 0 });
        }
    };

    // Calculate IVA Amount
    const ivaAmount = (basePrice * (data.porcentajeIVA || 0)) / 100;
    const totalWithIVA = basePrice + ivaAmount;

    // Update context with calculated IVA amount
    useEffect(() => {
        updateData({ montoIVA: ivaAmount });
    }, [ivaAmount]);

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 uppercase tracking-wider">Paso 3.2</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Cálculo de IVA</h2>
                <p className="text-slate-400">
                    El proyecto seleccionado no incluye IVA. Calcule el monto correspondiente sobre la Parte F.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Card Input */}
                <div className="bg-[#1a2234] border border-[#334366] rounded-xl p-6 shadow-sm flex flex-col gap-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-[#334366]">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Calculator className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Configuración</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Base Imponible (Parte F)</label>
                            <div className="md:h-12 bg-[#0f131a] border border-[#334366] rounded-lg flex items-center px-4 py-3 md:py-0">
                                <span className="text-slate-500 mr-2">$</span>
                                <span className="text-white font-mono text-lg">{basePrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                                <span className="ml-auto text-xs font-bold text-slate-500 uppercase">{data.monedaA || "ARS"}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Porcentaje de IVA</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={data.porcentajeIVA || ""}
                                    onChange={(e) => handlePercentageChange(e.target.value)}
                                    className="w-full h-12 bg-[#0f131a] border border-[#334366] rounded-lg text-white px-4 pr-12 text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                    placeholder="0.00"
                                    step="0.01"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                    <Percent className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card Result */}
                <div className="bg-[#1a2234] border border-[#334366] rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-3 pb-4 border-b border-[#334366]">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                            <Percent className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Detalle</h3>
                    </div>

                    <div className="flex flex-col gap-4 mt-4">
                        <div className="flex justify-between items-center text-sm text-slate-400">
                            <span>Base Imponible</span>
                            <span>${basePrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-slate-400">
                            <span>Tasa IVA</span>
                            <span>{data.porcentajeIVA || 0}%</span>
                        </div>

                        <Separator className="bg-[#334366]" />

                        <div className="flex justify-between items-center">
                            <span className="text-white font-medium">Monto IVA</span>
                            <span className="text-xl font-bold text-blue-400">${ivaAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="mt-4 p-4 bg-[#0f131a] rounded-lg border border-[#334366]">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-300">Total Parte F (Con IVA)</span>
                                <span className="text-lg font-bold text-white">${totalWithIVA.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <Alert className="bg-yellow-500/10 border-yellow-500/20 text-yellow-200">
                <AlertDescription>
                    Recuerde que el IVA calculado se sumará al plan de pagos de la Parte F.
                </AlertDescription>
            </Alert>

        </div>
    );
};
