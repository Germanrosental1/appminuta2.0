import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, CreditCard, Info, CheckCircle, ListPlus, Lightbulb } from "lucide-react";

export const Step3Pago: React.FC = () => {
    const { data, updateData } = useWizard();
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Initialize defaults
    useEffect(() => {
        if (!data.tipoPago) updateData({ tipoPago: "contado" });
        if (!data.monedaA) updateData({ monedaA: "ARS" }); // Default for Part F?
        if (!data.monedaB) updateData({ monedaB: "USD" }); // Default for Part B?
    }, []);

    const handleChange = (field: string, value: any) => {
        updateData({ [field]: value });
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    // Helper to calculate total
    const calcularPrecioTotal = () => {
        let total = 0;
        if (data.unidades && data.unidades.length > 0) {
            data.unidades.forEach(u => total += u.precioNegociado || 0);
        } else {
            total = data.precioNegociado || 0;
            if (data.cocheras) data.cocheras.forEach(c => total += c.precioNegociado || 0);
            if (data.baulera) total += data.baulera.precioNegociado || 0;
        }
        return total;
    };
    const precioTotal = calcularPrecioTotal();

    // Helper to format currency
    const fmtMoney = (val: number, currency = "USD") => {
        // Simple formatter
        return val.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">

            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 uppercase tracking-wider">Paso 3.1</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Pago y Anticipos</h2>
                <p className="text-slate-400 text-lg max-w-2xl">
                    Defina la modalidad de pago, el tipo de cambio y estructure los anticipos correspondientes a la operación.
                </p>
            </div>

            {/* Modalidad de Pago */}
            <div className="flex flex-col gap-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <CreditCard className="text-blue-500" />
                    Modalidad de Pago
                </h3>

                <RadioGroup
                    value={data.tipoPago}
                    onValueChange={(val: "contado" | "financiado") => handleChange("tipoPago", val)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    {/* Contado */}
                    <Label htmlFor="mode-contado" className={`relative flex flex-col p-5 cursor-pointer rounded-xl border-2 transition-all group ${data.tipoPago === 'contado' ? 'border-blue-500 bg-blue-500/5' : 'border-[#334366] bg-[#1a2234] hover:border-blue-500/50 hover:bg-[#1a2234]/80'}`}>
                        <RadioGroupItem value="contado" id="mode-contado" className="sr-only" />
                        <div className={`absolute top-5 right-5 w-6 h-6 rounded-full border-2 flex items-center justify-center ${data.tipoPago === 'contado' ? 'border-blue-500 bg-blue-500' : 'border-[#334366]'}`}>
                            {data.tipoPago === 'contado' && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                                <CheckCircle className="w-7 h-7" />
                            </div>
                            <div>
                                <span className="block text-lg font-bold text-white">Contado</span>
                                <span className="text-sm text-slate-400">Pago único</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 pl-16">El pago total se realiza en el momento de la firma de la escritura.</p>
                    </Label>

                    {/* Financiado */}
                    <Label htmlFor="mode-financiado" className={`relative flex flex-col p-5 cursor-pointer rounded-xl border-2 transition-all group ${data.tipoPago === 'financiado' ? 'border-blue-500 bg-blue-500/5' : 'border-[#334366] bg-[#1a2234] hover:border-blue-500/50 hover:bg-[#1a2234]/80'}`}>
                        <RadioGroupItem value="financiado" id="mode-financiado" className="sr-only" />
                        <div className={`absolute top-5 right-5 w-6 h-6 rounded-full border-2 flex items-center justify-center ${data.tipoPago === 'financiado' ? 'border-blue-500 bg-blue-500' : 'border-[#334366]'}`}>
                            {data.tipoPago === 'financiado' && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 rounded-lg bg-[#242f47] flex items-center justify-center text-slate-400 group-hover:text-white">
                                <CreditCard className="w-7 h-7" />
                            </div>
                            <div>
                                <span className="block text-lg font-bold text-white">Financiado</span>
                                <span className="text-sm text-slate-400">Esquema en cuotas</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 pl-16">Se establece un anticipo y un plan de pagos para el saldo restante.</p>
                    </Label>
                </RadioGroup>
            </div>

            {/* Removed Ajustes Financieros - Moved to Step 3.1 (Composition) per request */}
            <Separator />

            {/* Anticipo al Boleto UI - Only if Financiado, usually. But design implies explicit inputs */}
            <div className={`flex flex-col gap-5 transition-opacity ${data.tipoPago === 'contado' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ListPlus className="text-blue-500" />
                        Anticipo al Boleto
                    </h3>
                    <button
                        type="button"
                        onClick={() => updateData({ anticipoArsA: 0, anticipoUsdA: 0, anticipoArsB: 0, anticipoUsdB: 0 })}
                        className="text-sm text-blue-500 hover:text-blue-400 font-medium transition-colors"
                    >
                        Limpiar Valores
                    </button>
                </div>

                <div className="bg-[#1a2234] rounded-xl border border-[#334366] overflow-hidden">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 border-b border-[#334366] bg-[#242f47]/50 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <div className="col-span-4 p-4 flex items-center">Concepto</div>
                        <div className="col-span-4 p-4 border-l border-[#334366] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Moneda Nacional (ARS)
                        </div>
                        <div className="col-span-4 p-4 border-l border-[#334366] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Dólares (USD)
                        </div>
                    </div>

                    {/* Row F */}
                    <div className="grid grid-cols-12 border-b border-[#334366] hover:bg-[#242f47]/30 transition-colors">
                        <div className="col-span-4 p-4 flex flex-col justify-center">
                            <p className="text-white font-medium">Monto Fijo (F)</p>
                            <p className="text-xs text-slate-400">Importe fijo establecido</p>
                        </div>
                        <div className="col-span-4 p-3 border-l border-[#334366] flex items-center">
                            <CurrencyInput
                                value={data.anticipoArsA} // Anticipo F in ARS
                                onChange={(val) => updateData({ anticipoArsA: val })}
                                className="w-full h-10 bg-[#111621] border border-[#334366] text-white text-right text-sm font-mono rounded focus:border-blue-500"
                                placeholder="0.00"
                                prefix="$"
                            />
                        </div>
                        <div className="col-span-4 p-3 border-l border-[#334366] flex items-center">
                            <CurrencyInput
                                value={data.anticipoUsdA} // Anticipo F in USD
                                onChange={(val) => updateData({ anticipoUsdA: val })}
                                className="w-full h-10 bg-[#111621] border border-[#334366] text-white text-right text-sm font-mono rounded focus:border-blue-500"
                                placeholder="0.00"
                                prefix="US$"
                            />
                        </div>
                    </div>

                    {/* Row SB */}
                    <div className="grid grid-cols-12 hover:bg-[#242f47]/30 transition-colors">
                        <div className="col-span-4 p-4 flex flex-col justify-center">
                            <p className="text-white font-medium">Saldo Boleto (SB)</p>
                            <p className="text-xs text-slate-400">Remanente a pagar</p>
                        </div>
                        <div className="col-span-4 p-3 border-l border-[#334366] flex items-center">
                            <CurrencyInput
                                value={data.anticipoArsB} // Anticipo SB in ARS
                                onChange={(val) => updateData({ anticipoArsB: val })}
                                className="w-full h-10 bg-[#111621] border border-[#334366] text-white text-right text-sm font-mono rounded focus:border-blue-500"
                                placeholder="0.00"
                                prefix="$"
                            />
                        </div>
                        <div className="col-span-4 p-3 border-l border-[#334366] flex items-center">
                            <CurrencyInput
                                value={data.anticipoUsdB} // Anticipo SB in USD
                                onChange={(val) => updateData({ anticipoUsdB: val })}
                                className="w-full h-10 bg-[#111621] border border-[#334366] text-white text-right text-sm font-mono rounded focus:border-blue-500"
                                placeholder="0.00"
                                prefix="US$"
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* Resumen */}
            <div className="flex flex-col gap-4">
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <ListPlus className="text-blue-500 w-6 h-6" />
                        <h4 className="text-lg font-bold text-white tracking-tight">Resumen</h4>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between text-sm">
                            <p className="font-bold text-white">Anticipo F:</p>
                            <p className="font-mono text-slate-400">
                                ARS ${fmtMoney(data.anticipoArsA || 0, "ARS")} / USD ${fmtMoney(data.anticipoUsdA || 0)}
                            </p>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <p className="font-bold text-white">Anticipo SB:</p>
                            <p className="font-mono text-slate-400">
                                ARS ${fmtMoney(data.anticipoArsB || 0, "ARS")} / USD ${fmtMoney(data.anticipoUsdB || 0)}
                            </p>
                        </div>
                        <Separator className="bg-[#334366] my-1" />
                        <div className="flex items-center justify-between">
                            {/* Note: Actual calculations for Saldo depend on the total and split from Step 3.1 
                      Since we are at Step 3 (Pago), we might not know the split yet?
                      The HTML shows "Saldo: F (ARS) $0 / SB (USD) ...".
                      If the user defines these here, maybe they define the *maximum* advances?
                      Or maybe they are just entering data.
                      Since we can't calculate exact Balance F/SB without knowing Total F/SB (which is defined in next step),
                      we might show placeholders or partial data.
                      HOWEVER, the user might expect us to know the total price.
                      Total price is known.
                      But split F/SB is not known yet (Step 3.1).
                      So we can't show "Saldo F" or "Saldo SB" if we don't know "Total F" or "Total SB".
                      Unless... The user defines them implicitly here? No, Step 3.1 is for "Composición".
                      So maybe we just show "Total Anticipo" here?
                      The HTML has static "0" values.
                      We will show whatever we have.
                  */}
                            <p className="font-bold text-white">Total Anticipos:</p>
                            <p className="font-mono text-white text-sm">
                                <span className="text-blue-400 font-bold">
                                    USD {fmtMoney(
                                        (data.anticipoUsdA || 0) + (data.anticipoUsdB || 0) +
                                        ((data.anticipoArsA || 0) / (data.tcValor || 1)) +
                                        ((data.anticipoArsB || 0) / (data.tcValor || 1))
                                    )}
                                </span> (aprox)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#1a2234] border border-[#334366] rounded-xl p-4 flex items-start gap-4">
                    <div className="bg-yellow-500/10 p-2 rounded-lg flex items-center justify-center">
                        <Lightbulb className="text-yellow-500 w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-white">Tip:</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Verifique que los montos ingresados coincidan con el plan de pagos acordado.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-start gap-2 mt-1">
                <Info className="text-slate-400 w-4 h-4 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                    Los valores ingresados se descontarán de los saldos finales en los pasos siguientes.
                </p>
            </div>

        </div>
    );
};

// Simple Separator Component (or import from ui)
const Separator = ({ className = "" }) => (
    <div className={`h-[1px] w-full bg-[#334366] opacity-50 ${className}`}></div>
);
