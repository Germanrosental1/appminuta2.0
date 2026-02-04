import React from 'react';
import { WizardData } from '@/types/wizard';
import {
    Building2,
    DollarSign,
    User,
    Gavel,
    PieChart,
    Receipt,
    CreditCard,
    Phone,
    CheckCircle2,
    Calendar,
    Zap
} from 'lucide-react';

interface ResumenGridProps {
    data: WizardData;
}

export const ResumenGrid: React.FC<ResumenGridProps> = ({ data }) => {
    const precioTotal = data.unidades.reduce((sum, u) => sum + (u.precioNegociado || 0), 0) || data.precioNegociado || 0;
    const porcB = 100 - data.porcA;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {/* Proyecto & Unidades */}
            <div className="flex flex-col bg-[#1E293B] rounded-xl border border-slate-700/60 p-5 shadow-sm hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700/50">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                        <Building2 size={20} />
                    </div>
                    <h3 className="font-bold text-base text-white">Proyecto & Unidades</h3>
                </div>
                <div className="flex flex-col gap-2 text-sm flex-1 justify-center">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Unidades</span>
                        <span className="text-white font-medium">
                            {data.unidades.length > 0
                                ? `${data.unidades.length} seleccionada(s)`
                                : data.unidadDescripcion || 'Ninguna'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Proyecto</span>
                        <span className="text-white font-medium">{data.proyecto || 'Sin seleccionar'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Posesión</span>
                        <span className="text-white font-medium">{data.fechaPosesion || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Acuerdo Comercial */}
            <div className="flex flex-col bg-[#1E293B] rounded-xl border border-slate-700/60 p-5 shadow-sm hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700/50">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <DollarSign size={20} />
                    </div>
                    <h3 className="font-bold text-base text-white">Acuerdo Comercial</h3>
                </div>
                <div className="flex flex-col gap-2 text-sm flex-1 justify-center">
                    <div className="flex justify-between items-end">
                        <span className="text-slate-400">Valor Total</span>
                        <span className="text-white font-bold text-lg">
                            USD {precioTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Descuento</span>
                        <span className="text-emerald-400 font-medium">
                            {data.tipoDescuento === 'porcentaje' ? `${data.valorDescuento}%` :
                                data.tipoDescuento === 'importe' ? `USD ${data.valorDescuento.toLocaleString()}` :
                                    '0%'} Aplicado
                        </span>
                    </div>
                </div>
            </div>

            {/* Datos del Cliente */}
            <div className="flex flex-col bg-[#1E293B] rounded-xl border border-slate-700/60 p-5 shadow-sm hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700/50">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                        <User size={20} />
                    </div>
                    <h3 className="font-bold text-base text-white">Datos del Cliente</h3>
                </div>
                <div className="flex flex-col gap-3 text-sm flex-1 justify-center">
                    {data.clienteInteresado ? (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
                                    {data.clienteInteresado.nombreApellido.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <span className="text-white font-medium">{data.clienteInteresado.nombreApellido}</span>
                                    <span className="text-slate-400 text-xs text-secondary">Propietario Principal</span>
                                </div>
                            </div>
                            {data.clienteInteresado.telefono && (
                                <div className="flex items-center gap-3 pl-1 mt-1">
                                    <Phone size={16} className="text-slate-500" />
                                    <span className="text-slate-300">{data.clienteInteresado.telefono}</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <span className="text-slate-500 italic">No se ingresaron datos</span>
                    )}
                </div>
            </div>

            {/* Reglas de Financiación */}
            <div className="flex flex-col bg-[#1E293B] rounded-xl border border-slate-700/60 p-5 shadow-sm hover:border-slate-600 transition-colors lg:col-span-2">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-700/50">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Gavel size={20} />
                    </div>
                    <h3 className="font-bold text-base text-white">Reglas de Financiación</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center flex-1">
                    <div className="flex items-center justify-center sm:justify-start gap-4">
                        <div className="relative size-20 shrink-0">
                            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-700/50" strokeWidth="3" />
                                <circle
                                    cx="18" cy="18" r="16" fill="none"
                                    className="stroke-indigo-400"
                                    strokeWidth="3"
                                    strokeDasharray={`${data.porcentajePagadoFechaPosesion}, 100`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-white">{data.porcentajePagadoFechaPosesion}%</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-medium text-sm">Financiado</span>
                            <span className="text-slate-400 text-xs">A fecha de posesión</span>
                            <span className="text-slate-500 text-[10px] mt-1 flex items-center gap-1">
                                <Zap size={10} /> Regla Activa
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center gap-3 w-full border-l border-slate-700/50 pl-0 sm:pl-6 border-t sm:border-t-0 pt-4 sm:pt-0">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-slate-400 text-xs font-medium">Estado de Deuda Estimado</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex ring-1 ring-slate-700/50">
                            <div className="h-full bg-emerald-500" style={{ width: `${100 - data.porcentajePagadoFechaPosesion}%` }}></div>
                            <div className="h-full bg-indigo-500" style={{ width: `${data.porcentajePagadoFechaPosesion}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
                            <div className="flex items-center gap-1.5">
                                <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"></div>
                                {100 - data.porcentajePagadoFechaPosesion}% Pagado
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="size-2 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.4)]"></div>
                                {data.porcentajePagadoFechaPosesion}% Pendiente
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Estructura de Pago */}
            <div className="flex flex-col bg-[#1E293B] rounded-xl border border-slate-700/60 p-5 shadow-sm hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700/50">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                        <PieChart size={20} />
                    </div>
                    <h3 className="font-bold text-base text-white">Estructura de Pago</h3>
                </div>
                <div className="flex flex-col gap-3 text-sm h-full justify-center">
                    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-slate-700/50">
                        <span className="text-slate-400">Fondo {data.monedaA}</span>
                        <span className="text-white font-bold">{data.porcA}%</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-slate-700/50">
                        <span className="text-slate-400">Saldo B {data.monedaB}</span>
                        <span className="text-white font-bold">{porcB}%</span>
                    </div>
                </div>
            </div>

            {/* Cargos & Extras */}
            <div className="flex flex-col bg-[#1E293B] rounded-xl border border-slate-700/60 p-5 shadow-sm hover:border-slate-600 transition-colors lg:col-span-2">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700/50">
                    <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                        <Receipt size={20} />
                    </div>
                    <h3 className="font-bold text-base text-white">Cargos & Extras</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm flex-1">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Certificación</span>
                        <span className="text-white font-medium">${data.certificacionFirmas.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Sellado</span>
                        <span className="text-white font-medium">${data.selladoMonto.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Alhajamiento</span>
                        <span className="text-white font-medium">${data.alhajamiemtoMonto.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Planos</span>
                        <span className="text-white font-medium">${data.planosUnidadMonto.toLocaleString()}</span>
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center">
                    <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Totales Estimados</span>
                    <div className="text-right">
                        <span className="text-white font-bold text-sm">ARS {data.totalCargosArs.toLocaleString()} / USD {data.totalCargosUsd.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Forma de Pago */}
            <div className="flex flex-col bg-[#1E293B] rounded-xl border border-slate-700/60 p-5 shadow-sm hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700/50">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                        <CreditCard size={20} />
                    </div>
                    <h3 className="font-bold text-base text-white">Forma de Pago</h3>
                </div>
                <div className="flex flex-col gap-2 text-sm flex-1 justify-center">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Modalidad</span>
                        <span className="text-white font-medium capitalize">{data.tipoPago}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Tipo Cambio</span>
                        <span className="text-white font-medium">${data.tcValor.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Anticipos</span>
                        <span className="text-white font-medium">${(data.anticipoArsA + data.anticipoArsB).toLocaleString()} ARS</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Base Ajuste</span>
                        <span className="text-white font-medium">{data.fechaBaseCAC}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
