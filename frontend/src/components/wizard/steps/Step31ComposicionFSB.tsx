import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validateStep } from "@/utils/validation";
import { CheckCircle, Info } from "lucide-react";
import { WizardData } from "@/types/wizard";

// --- Sub-components ---

const PriceSummaryCard = ({ precioTotal, data, fmtMoney }: { precioTotal: number, data: WizardData, fmtMoney: (v: number) => string }) => (
    <div className="bg-white dark:bg-[#1a2233] border border-slate-200 dark:border-[#242f47] rounded-xl p-5 flex flex-col gap-1 min-w-[240px] shadow-sm max-w-lg">
        <span className="text-slate-500 dark:text-[#92a4c8] text-xs font-bold uppercase tracking-wider">
            Precio total (unidad + adicionales)
        </span>
        <span className="text-3xl font-bold text-slate-900 dark:text-white my-1">
            USD {fmtMoney(precioTotal)}
        </span>
        <div className="text-xs text-slate-500 dark:text-[#92a4c8] font-medium border-t border-slate-100 dark:border-[#242f47] pt-3 mt-1 leading-relaxed space-y-1">
            {data.unidades && data.unidades.length > 0 ? (
                data.unidades.map((u, idx) => (
                    <div key={idx} className="flex justify-between">
                        <span>{u.tipo} {u.etapa}</span>
                        <span>${fmtMoney(u.precioNegociado || 0)}</span>
                    </div>
                ))
            ) : (
                <div className="flex justify-between">
                    <span>Unidad Principal</span>
                    <span>${fmtMoney(data.precioNegociado || 0)}</span>
                </div>
            )}
        </div>
    </div>
);

const CompositionRow = ({
    label, title, subtitle, colorClass,
    isPercentageMode, value, onChangeValue,
    currency, onChangeCurrency,
    calculatedValue, fmtMoney,
    disabledInput = false
}: {
    label: string, title: string, subtitle: string, colorClass: string,
    isPercentageMode: boolean, value: number | string, onChangeValue?: (val: string) => void,
    currency: string, onChangeCurrency: (val: "USD" | "ARS") => void,
    calculatedValue: string, fmtMoney: (val: number) => string,
    disabledInput?: boolean
}) => (
    <div className="flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center p-4 rounded-lg bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#242f47]">
        <div className="col-span-4 w-full flex items-center gap-3">
            <div className={`size-10 rounded-full ${colorClass} bg-opacity-20 flex items-center justify-center shrink-0`}>
                <span className={`font-bold text-sm ${colorClass.replace('bg-', 'text-')}`}>{label}</span>
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-slate-900 dark:text-white">{title}</span>
                <span className="text-xs text-slate-500 dark:text-[#92a4c8]">{subtitle}</span>
            </div>
        </div>

        <div className="col-span-3 w-full">
            <div className="relative">
                {isPercentageMode ? (
                    <>
                        <input
                            disabled={disabledInput}
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={value}
                            onChange={(e) => onChangeValue && onChangeValue(e.target.value)}
                            className={`block w-full rounded-lg border-slate-300 dark:border-[#334366] ${disabledInput ? 'bg-slate-100 dark:bg-[#0d111a] opacity-70' : 'bg-white dark:bg-[#1a2233]'} text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-3 pr-8 py-2.5 shadow-sm`}
                            placeholder="0"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <span className="text-slate-400 sm:text-sm">%</span>
                        </div>
                    </>
                ) : (
                    disabledInput ? (
                        <input
                            disabled
                            value={fmtMoney(Number(value) || 0)} // value here is raw generic, but for display in disabled we usually pass pre-formatted or handle it.
                            className="block w-full rounded-lg border-slate-300 dark:border-[#334366] bg-slate-100 dark:bg-[#0d111a] text-slate-500 dark:text-[#92a4c8] sm:text-sm pl-3 pr-8 py-2.5 shadow-sm opacity-70"
                        />
                    ) : (
                        <CurrencyInput
                            value={Number(value)}
                            onChange={(val) => onChangeValue && onChangeValue(val.toString())}
                            className="block w-full rounded-lg border-slate-300 dark:border-[#334366] bg-white dark:bg-[#1a2233] text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-3 pr-8 py-2.5 shadow-sm"
                            placeholder="0.00"
                        />
                    )
                )}
            </div>
        </div>

        <div className="col-span-2 w-full">
            <Select
                value={currency || "ARS"}
                onValueChange={onChangeCurrency}
            >
                <SelectTrigger className="w-full h-[42px] bg-white dark:bg-[#1a2233] border-slate-300 dark:border-[#334366] text-slate-900 dark:text-white rounded-lg">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#1a2233] border-slate-300 dark:border-[#334366] text-slate-900 dark:text-white">
                    <SelectItem value="ARS">ARS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="col-span-3 w-full flex sm:justify-end items-center">
            <div className="flex flex-col sm:items-end">
                <span className="text-sm text-slate-500 dark:text-[#92a4c8] sm:hidden">Monto calculado:</span>
                <span className="font-bold text-lg text-slate-900 dark:text-white">
                    {calculatedValue}
                </span>
            </div>
        </div>
    </div>
);

// --- Main Component ---

export const Step31ComposicionFSB: React.FC = () => {
    const { data, updateData } = useWizard();
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Calculate total price
    const calculateTotalPrice = () => {
        let total = 0;
        if (data.unidades && data.unidades.length > 0) {
            data.unidades.forEach(u => total += u.precioNegociado || 0);
            return total;
        }
        total = data.precioNegociado || 0;
        if (data.cocheras) total += data.cocheras.reduce((acc, c) => acc + (c.precioNegociado || 0), 0);
        if (data.baulera) total += (data.baulera.precioNegociado || 0);
        return total;
    };

    const precioTotal = calculateTotalPrice();
    const fmtMoney = (val: number) => val.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Derived values
    const porcB = 100 - (data.porcA || 0);

    // Calculate impB (SB Amount in USD)
    const calculateImpB = () => {
        if (data.modoA === "porcentaje") {
            return (precioTotal * porcB) / 100;
        } else {
            const impA = data.impA || 0;
            let impAInUSD = impA;
            if (data.monedaA === "ARS" && data.tcValor && data.tcValor > 0) {
                impAInUSD = impA / data.tcValor;
            }
            return precioTotal - impAInUSD;
        }
    };
    const impB = calculateImpB();

    // Side Effects
    useEffect(() => {
        const validation = validateStep(3, data);
        setErrors(validation.valid ? {} : validation.errors);
    }, [data.modoA, data.porcA, data.impA, data.precioNegociado, data.cocheras, data.baulera, data.unidades, data.monedaA, data.tcValor]);

    // Handlers
    const handleModoChange = (modo: "porcentaje" | "importe") => {
        updateData(modo === "porcentaje" ? { modoA: modo, impA: 0 } : { modoA: modo, porcA: 0 });
    };

    const handlePorcAChange = (value: string) => {
        if (value === '') {
            updateData({ porcA: 0 });
            return;
        }
        const num = Number.parseFloat(value);
        if (!Number.isNaN(num) && num >= 0 && num <= 100) {
            updateData({ porcA: num });
        }
    };

    return (
        <div className="w-full max-w-5xl flex flex-col gap-6">

            {/* Header */}
            <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-end">
                <div className="flex flex-col gap-2 max-w-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 uppercase tracking-wider">Paso 3</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Composición F/SB</h1>
                    <p className="text-slate-500 dark:text-[#92a4c8] text-base">
                        Defina la distribución del monto total de la operación entre la Parte F y la Parte SB.
                    </p>
                </div>
                <PriceSummaryCard precioTotal={precioTotal} data={data} fmtMoney={fmtMoney} />
            </div>

            {/* Main Card */}
            <div className="bg-white dark:bg-[#1a2233] rounded-xl border border-slate-200 dark:border-[#242f47] shadow-sm overflow-hidden">

                {/* Mode Switcher */}
                <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-[#242f47] flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-[#1a2233]/50">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Modo de cálculo:</span>
                    <div className="flex p-1 bg-slate-200 dark:bg-[#242f47] rounded-lg">
                        {["porcentaje", "importe"].map(mode => (
                            <label key={mode} className="cursor-pointer">
                                <input
                                    checked={data.modoA === mode}
                                    onChange={() => handleModoChange(mode as any)}
                                    className="peer sr-only"
                                    type="radio"
                                    name="mode"
                                />
                                <span className="block px-4 py-2 rounded-md text-sm font-medium transition-all text-slate-500 dark:text-[#92a4c8] peer-checked:bg-white dark:peer-checked:bg-[#111622] peer-checked:text-blue-500 peer-checked:shadow-sm capitalize">
                                    {mode} ({mode === "porcentaje" ? "%" : "$"})
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Rows */}
                <div className="p-4 sm:p-6 flex flex-col gap-6">
                    {/* Headers */}
                    <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-[#92a4c8] uppercase tracking-wider">
                        <div className="col-span-4">Concepto</div>
                        <div className="col-span-3">{data.modoA === "porcentaje" ? "Porcentaje" : "Valor"}</div>
                        <div className="col-span-2">Moneda</div>
                        <div className="col-span-3 text-right">Monto Resultante</div>
                    </div>

                    {/* Row F */}
                    <CompositionRow
                        label="F" title="Parte F" subtitle="Fondo de comercio" colorClass="bg-blue-500 text-blue-500"
                        isPercentageMode={data.modoA === "porcentaje"}
                        value={data.modoA === "porcentaje" ? (data.porcA === 0 ? '' : data.porcA) : data.impA}
                        onChangeValue={data.modoA === "porcentaje" ? handlePorcAChange : (val) => updateData({ impA: Number(val) })}
                        currency={data.monedaA || "ARS"}
                        onChangeCurrency={(val) => updateData({ monedaA: val })}
                        calculatedValue={`${data.monedaA === "ARS" ? "ARS" : "USD"} ${(() => {
                                let amount = 0;
                                if (data.modoA === "porcentaje") {
                                    const baseUSD = (precioTotal * (data.porcA || 0)) / 100;
                                    // If ARS, convert from USD to ARS using rate
                                    if (data.monedaA === "ARS" && data.tcValor && data.tcValor > 0) {
                                        amount = baseUSD * data.tcValor;
                                    } else {
                                        amount = baseUSD;
                                    }
                                } else {
                                    // If Importe mode, value is already in the selected currency
                                    amount = data.impA || 0;
                                }
                                return fmtMoney(amount);
                            })()
                            }`}
                        fmtMoney={fmtMoney}
                    />

                    {/* Row SB */}
                    <CompositionRow
                        label="SB" title="Parte SB" subtitle="Servicios y Bienes" colorClass="bg-indigo-500 text-indigo-500"
                        isPercentageMode={data.modoA === "porcentaje"}
                        value={data.modoA === "porcentaje" ? (Number.isInteger(porcB) ? porcB.toFixed(0) : porcB.toFixed(2)) : impB} // impB is derived USD amount
                        disabledInput={true}
                        currency={data.monedaB || "ARS"}
                        onChangeCurrency={(val) => updateData({ monedaB: val })}
                        calculatedValue={`${data.monedaB === "ARS" ? "ARS" : "USD"} ${(() => {
                                // impB is always calculated in USD in our logic
                                // Logic: `impB = calculateImpB()` which returns USD.
                                if (data.monedaB === "ARS" && data.tcValor && data.tcValor > 0) {
                                    return fmtMoney(impB * data.tcValor);
                                }
                                return fmtMoney(impB);
                            })()
                            }`}
                        fmtMoney={fmtMoney}
                    />
                </div>

                {/* Footer Visual */}
                <div className="bg-slate-50 dark:bg-[#1a2233]/50 px-6 py-4 border-t border-slate-200 dark:border-[#242f47]">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Distribución Visual</span>
                        <span className="text-xs font-semibold text-green-500 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Total 100%
                        </span>
                    </div>
                    <div className="flex h-6 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-[#334366]">
                        <div
                            className="bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500"
                            style={{ width: `${data.modoA === "porcentaje" ? (data.porcA || 0) : ((data.impA || 0) / precioTotal) * 100}%` }}
                        >
                            {/* Visual approx text */}
                            {(data.modoA === "porcentaje" ? (data.porcA || 0) : ((data.impA || 0) / precioTotal) * 100).toFixed(1)}%
                        </div>
                        <div className="bg-indigo-500 flex-1 flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500">
                            {/* SB Part fills remainder */}
                        </div>
                    </div>
                    <div className="flex gap-4 mt-3 justify-center sm:justify-start">
                        <div className="flex items-center gap-2">
                            <div className="size-3 rounded-full bg-blue-500"></div>
                            <span className="text-xs text-slate-500 dark:text-[#92a4c8]">Parte F</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="size-3 rounded-full bg-indigo-500"></div>
                            <span className="text-xs text-slate-500 dark:text-[#92a4c8]">Parte SB</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ajustes Financieros (Exchange Rate) */}
            <div className="bg-white dark:bg-[#1a2233] rounded-xl border border-slate-200 dark:border-[#242f47] p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                    <span className="text-blue-500">$</span>
                    Ajustes Financieros
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Fuente */}
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Fuente de Cotización</span>
                        <Select
                            value={data.tcFuente || "MEP"}
                            onValueChange={(val) => updateData({ tcFuente: val })}
                        >
                            <SelectTrigger className="w-full h-12 bg-white dark:bg-[#1a2233] border-slate-300 dark:border-[#334366] text-slate-900 dark:text-white rounded-lg">
                                <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#1a2233] border-slate-300 dark:border-[#334366] text-slate-900 dark:text-white">
                                <SelectItem value="MEP">Dólar MEP</SelectItem>
                                <SelectItem value="BNA">Dólar BNA (Vendedor)</SelectItem>
                                <SelectItem value="Blue">Dólar Blue (Promedio)</SelectItem>
                                <SelectItem value="Personalizado">Personalizado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Valor */}
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Valor de Referencia</span>
                        <div className="relative">
                            <CurrencyInput
                                value={data.tcValor}
                                onChange={(val) => updateData({ tcValor: val })}
                                className="w-full h-12 bg-white dark:bg-[#1a2233] border-slate-300 dark:border-[#334366] text-slate-900 dark:text-white rounded-lg pl-8 font-mono placeholder:text-slate-500 focus:border-blue-500"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Fecha CAC */}
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Fecha Base CAC</span>
                        <input
                            type="month"
                            value={data.fechaBaseCAC || ""}
                            onChange={(e) => updateData({ fechaBaseCAC: e.target.value })}
                            className="w-full h-12 bg-white dark:bg-[#1a2233] border border-slate-300 dark:border-[#334366] text-slate-900 dark:text-white rounded-lg px-3 [color-scheme:light] dark:[color-scheme:dark] focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="rounded-lg bg-blue-900/10 border border-blue-900/30 p-4 text-sm text-slate-300 flex gap-2 items-start">
                <Info className="text-blue-400 w-5 h-5 mt-0.5" />
                <div>
                    <p className="font-medium mb-1 text-white">Tip:</p>
                    <p className="leading-relaxed">
                        {data.modoA === "porcentaje"
                            ? "Defina el porcentaje para la parte F y seleccione la moneda. La parte SB se calculará automáticamente."
                            : "Ingrese el importe fijo para la parte F. La parte SB se calculará automáticamente como la diferencia con el precio total."
                        }
                    </p>
                </div>
            </div>

        </div>
    );
};
