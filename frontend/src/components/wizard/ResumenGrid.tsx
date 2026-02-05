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
            <div className="flex flex-col bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Building2 size={20} />
                    </div>
                    <h3 className="font-bold text-base text-card-foreground">Proyecto & Unidades</h3>
                </div>
                <div className="flex flex-col gap-2 text-sm flex-1 justify-center">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Unidades</span>
                        <span className="text-foreground font-medium">
                            {data.unidades.length > 0
                                ? `${data.unidades.length} seleccionada(s)`
                                : data.unidadDescripcion || 'Ninguna'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Proyecto</span>
                        <span className="text-foreground font-medium">{data.proyecto || 'Sin seleccionar'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Posesión</span>
                        <span className="text-foreground font-medium">{data.fechaPosesion || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Acuerdo Comercial */}
            <div className="flex flex-col bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <DollarSign size={20} />
                    </div>
                    <h3 className="font-bold text-base text-card-foreground">Acuerdo Comercial</h3>
                </div>
                <div className="flex flex-col gap-2 text-sm flex-1 justify-center">
                    <div className="flex justify-between items-end">
                        <span className="text-muted-foreground">Valor Total</span>
                        <span className="text-foreground font-bold text-lg">
                            USD {precioTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Descuento</span>
                        <span className="text-emerald-500 font-medium">
                            {data.tipoDescuento === 'porcentaje' ? `${data.valorDescuento}%` :
                                data.tipoDescuento === 'importe' ? `USD ${data.valorDescuento.toLocaleString()}` :
                                    '0%'} Aplicado
                        </span>
                    </div>
                </div>
            </div>

            {/* Datos del Cliente */}
            <div className="flex flex-col bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                        <User size={20} />
                    </div>
                    <h3 className="font-bold text-base text-card-foreground">Datos del Cliente</h3>
                </div>
                <div className="flex flex-col gap-3 text-sm flex-1 justify-center">
                    {data.clienteInteresado ? (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">
                                    {data.clienteInteresado.nombreApellido.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <span className="text-foreground font-medium">{data.clienteInteresado.nombreApellido}</span>
                                    <span className="text-muted-foreground text-xs text-secondary">Propietario Principal</span>
                                </div>
                            </div>
                            {data.clienteInteresado.telefono && (
                                <div className="flex items-center gap-3 pl-1 mt-1">
                                    <Phone size={16} className="text-muted-foreground" />
                                    <span className="text-foreground">{data.clienteInteresado.telefono}</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <span className="text-muted-foreground italic">No se ingresaron datos</span>
                    )}
                </div>
            </div>

            {/* Reglas de Financiación */}
            <div className="flex flex-col bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/50 transition-colors lg:col-span-2">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                        <Gavel size={20} />
                    </div>
                    <h3 className="font-bold text-base text-card-foreground">Reglas de Financiación</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center flex-1">
                    <div className="flex items-center justify-center sm:justify-start gap-4">
                        <div className="relative size-20 shrink-0">
                            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="16" fill="none" className="stroke-muted" strokeWidth="3" />
                                <circle
                                    cx="18" cy="18" r="16" fill="none"
                                    className="stroke-indigo-500"
                                    strokeWidth="3"
                                    strokeDasharray={`${data.porcentajePagadoFechaPosesion}, 100`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-foreground">{data.porcentajePagadoFechaPosesion}%</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-foreground font-medium text-sm">Financiado</span>
                            <span className="text-muted-foreground text-xs">A fecha de posesión</span>
                            <span className="text-muted-foreground text-[10px] mt-1 flex items-center gap-1">
                                <Zap size={10} /> Regla Activa
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center gap-3 w-full border-l border-border pl-0 sm:pl-6 border-t sm:border-t-0 pt-4 sm:pt-0">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-muted-foreground text-xs font-medium">Estado de Deuda Estimado</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex ring-1 ring-border">
                            <div className="h-full bg-emerald-500" style={{ width: `${100 - data.porcentajePagadoFechaPosesion}%` }}></div>
                            <div className="h-full bg-indigo-500" style={{ width: `${data.porcentajePagadoFechaPosesion}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium px-1">
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
            <div className="flex flex-col bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                        <PieChart size={20} />
                    </div>
                    <h3 className="font-bold text-base text-card-foreground">Estructura de Pago</h3>
                </div>
                <div className="flex flex-col gap-3 text-sm h-full justify-center">
                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border border-border">
                        <span className="text-muted-foreground">Fondo {data.monedaA}</span>
                        <span className="text-foreground font-bold">{data.porcA}%</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border border-border">
                        <span className="text-muted-foreground">Saldo B {data.monedaB}</span>
                        <span className="text-foreground font-bold">{porcB}%</span>
                    </div>
                </div>
            </div>

            {/* Cargos & Extras */}
            <div className="flex flex-col bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/50 transition-colors lg:col-span-2">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                    <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
                        <Receipt size={20} />
                    </div>
                    <h3 className="font-bold text-base text-card-foreground">Cargos & Extras</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm flex-1">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Certificación</span>
                        <span className="text-foreground font-medium">${data.certificacionFirmas.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Sellado</span>
                        <span className="text-foreground font-medium">${data.selladoMonto.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Alhajamiento</span>
                        <span className="text-foreground font-medium">${data.alhajamiemtoMonto.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Planos</span>
                        <span className="text-foreground font-medium">${data.planosUnidadMonto.toLocaleString()}</span>
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Totales Estimados</span>
                    <div className="text-right">
                        <span className="text-foreground font-bold text-sm">ARS {data.totalCargosArs.toLocaleString()} / USD {data.totalCargosUsd.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Forma de Pago */}
            <div className="flex flex-col bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                        <CreditCard size={20} />
                    </div>
                    <h3 className="font-bold text-base text-card-foreground">Forma de Pago</h3>
                </div>
                <div className="flex flex-col gap-2 text-sm flex-1 justify-center">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Modalidad</span>
                        <span className="text-foreground font-medium capitalize">{data.tipoPago}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo Cambio</span>
                        <span className="text-foreground font-medium">${data.tcValor.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Anticipos</span>
                        <span className="text-foreground font-medium">${(data.anticipoArsA + data.anticipoArsB).toLocaleString()} ARS</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Ajuste</span>
                        <span className="text-foreground font-medium">{data.fechaBaseCAC}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
