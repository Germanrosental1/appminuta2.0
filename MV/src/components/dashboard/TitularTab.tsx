import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Unit } from "@/types/supabase-types";
import { containerVariants } from "./constants";
import { formatNumber, formatCurrency } from "./metrics";

interface TitularTabProps {
    loading: boolean;
    units: Unit[];
    selectedProyectosFilter: string[];
    selectedTiposFilter: string[];
    selectedEstadosFilter: string[];
    selectedTitulares: string[];
}

export function TitularTab({
    loading,
    units,
    selectedProyectosFilter,
    selectedTiposFilter,
    selectedEstadosFilter,
    selectedTitulares
}: TitularTabProps) {
    const navigate = useNavigate();
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

    // Apply filters
    let filteredUnits = units.filter(u => u.clienteTitularBoleto && u.clienteTitularBoleto.trim() !== '');

    if (selectedProyectosFilter.length > 0) {
        filteredUnits = filteredUnits.filter(u => selectedProyectosFilter.includes(u.proyecto));
    }

    if (selectedTiposFilter.length > 0) {
        filteredUnits = filteredUnits.filter(u => selectedTiposFilter.includes(u.tipo));
    }

    if (selectedEstadosFilter.length > 0) {
        filteredUnits = filteredUnits.filter(u => selectedEstadosFilter.includes(u.estado));
    }

    if (selectedTitulares.length > 0) {
        filteredUnits = filteredUnits.filter(u => selectedTitulares.includes(u.clienteTitularBoleto));
    }

    return (
        <>
            <motion.div
                className="space-y-4"
                variants={containerVariants}
            >
                <h3 className="text-lg font-medium mb-4">Listado de Unidades con Titular</h3>

                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ) : filteredUnits.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground">
                        No hay unidades que coincidan con los filtros seleccionados
                    </Card>
                ) : (
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left p-3 font-medium">Proyecto</th>
                                        <th className="text-left p-3 font-medium">Titular</th>
                                        <th className="text-left p-3 font-medium">Estado</th>
                                        <th className="text-left p-3 font-medium">Motivo</th>
                                        <th className="text-left p-3 font-medium">Tipología</th>
                                        <th className="text-left p-3 font-medium">Sector ID</th>
                                        <th className="text-center p-3 font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUnits.map((unit, index) => (
                                        <tr
                                            key={unit.id}
                                            className={`border-b hover:bg-muted/30 ${index % 2 === 0 ? 'bg-white dark:bg-background' : 'bg-muted/10'}`}
                                        >
                                            <td className="p-3 cursor-pointer" onClick={() => navigate(`/units/${unit.id}`)}>{unit.proyecto || '-'}</td>
                                            <td className="p-3 font-medium cursor-pointer" onClick={() => navigate(`/units/${unit.id}`)}>{unit.clienteTitularBoleto || '-'}</td>
                                            <td className="p-3 cursor-pointer" onClick={() => navigate(`/units/${unit.id}`)}>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${unit.estado === 'Disponible' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    unit.estado === 'Reservado' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        unit.estado === 'Vendido' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                            'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                                    }`}>
                                                    {unit.estado || '-'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-muted-foreground cursor-pointer" onClick={() => navigate(`/units/${unit.id}`)}>{unit.motivoNoDisponibilidad || '-'}</td>
                                            <td className="p-3 cursor-pointer" onClick={() => navigate(`/units/${unit.id}`)}>{unit.tipo || '-'}</td>
                                            <td className="p-3 font-mono text-xs cursor-pointer" onClick={() => navigate(`/units/${unit.id}`)}>{unit.sectorId || '-'}</td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedUnit(unit);
                                                    }}
                                                    className="p-2 hover:bg-muted rounded-full transition-colors"
                                                    title="Ver detalles"
                                                >
                                                    <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3 bg-muted/30 border-t text-sm text-muted-foreground">
                            Mostrando {filteredUnits.length} unidades
                        </div>
                    </Card>
                )}
            </motion.div>

            {/* Unit Details Dialog */}
            <Dialog open={!!selectedUnit} onOpenChange={(open) => !open && setSelectedUnit(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            {selectedUnit?.tipo} - {selectedUnit?.numeroUnidad || selectedUnit?.sectorId}
                            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${selectedUnit?.estado === 'Disponible' ? 'bg-green-100 text-green-700' :
                                selectedUnit?.estado === 'Reservado' ? 'bg-yellow-100 text-yellow-700' :
                                    selectedUnit?.estado === 'Vendido' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                }`}>
                                {selectedUnit?.estado || '-'}
                            </span>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedUnit && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Columna Izquierda - Información */}
                            <div className="space-y-4">
                                {/* Información General */}
                                <div className="p-4 bg-muted/30 rounded-lg">
                                    <h4 className="font-semibold text-sm border-b pb-2 mb-3">Información General</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-xs text-muted-foreground">Proyecto</span>
                                            <p className="font-medium text-sm">{selectedUnit.proyecto || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Edificio</span>
                                            <p className="font-medium text-sm">{selectedUnit.edificioTorre || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Etapa</span>
                                            <p className="font-medium text-sm">{selectedUnit.etapa || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Piso</span>
                                            <p className="font-medium text-sm">{selectedUnit.piso || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Nº Unidad</span>
                                            <p className="font-medium text-sm">{selectedUnit.numeroUnidad || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Dormitorios</span>
                                            <p className="font-medium text-sm">{selectedUnit.dormitorios || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Sector ID</span>
                                            <p className="font-mono text-xs">{selectedUnit.sectorId || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Frente</span>
                                            <p className="font-medium text-sm">{selectedUnit.frente || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Superficies */}
                                <div className="p-4 bg-muted/30 rounded-lg">
                                    <h4 className="font-semibold text-sm border-b pb-2 mb-3">Superficies (m²)</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-xs text-muted-foreground">Para Cálculo</span>
                                            <p className="font-medium text-sm">{formatNumber(selectedUnit.m2ParaCalculo || 0)}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Exclusivos</span>
                                            <p className="font-medium text-sm">{formatNumber(selectedUnit.m2Exclusivos || 0)}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Patio/Terraza</span>
                                            <p className="font-medium text-sm">{formatNumber(selectedUnit.m2PatioTerraza || 0)}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Comunes</span>
                                            <p className="font-medium text-sm">{formatNumber(selectedUnit.m2Comunes || 0)}</p>
                                        </div>
                                        <div className="bg-primary/10 p-2 rounded">
                                            <span className="text-xs text-muted-foreground">Totales</span>
                                            <p className="font-bold text-lg">{formatNumber(selectedUnit.m2Totales || 0)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Otros */}
                                <div className="p-4 bg-muted/30 rounded-lg">
                                    <h4 className="font-semibold text-sm border-b pb-2 mb-3">Otros Datos</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-xs text-muted-foreground">Destino</span>
                                            <p className="font-medium text-sm">{selectedUnit.destino || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Patio/Terraza</span>
                                            <p className="font-medium text-sm">{selectedUnit.patioTerraza || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-xs text-muted-foreground">Observaciones</span>
                                            <p className="font-medium text-sm">{selectedUnit.observaciones || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Columna Derecha - Estado Comercial */}
                            <div className="space-y-4">
                                {/* Precios */}
                                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                    <h4 className="font-semibold text-sm border-b pb-2 mb-3">Precios</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 text-center p-3 bg-white dark:bg-background rounded">
                                            <span className="text-xs text-muted-foreground">Precio Total</span>
                                            <p className="font-bold text-2xl text-blue-600">{formatCurrency(selectedUnit.precioUSD || 0)}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">USD por m²</span>
                                            <p className="font-bold text-lg">{formatCurrency(selectedUnit.usdM2 || 0)}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">m² Totales</span>
                                            <p className="font-bold text-lg">{formatNumber(selectedUnit.m2Totales || 0)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Estado Comercial */}
                                <div className="p-4 bg-muted/30 rounded-lg">
                                    <h4 className="font-semibold text-sm border-b pb-2 mb-3">Estado Comercial</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-xs text-muted-foreground">Estado</span>
                                            <p>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${selectedUnit.estado === 'Disponible' ? 'bg-green-100 text-green-700' :
                                                    selectedUnit.estado === 'Reservado' ? 'bg-yellow-100 text-yellow-700' :
                                                        selectedUnit.estado === 'Vendido' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {selectedUnit.estado || '-'}
                                                </span>
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Motivo</span>
                                            <p className="font-medium text-sm">{selectedUnit.motivoNoDisponibilidad || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Fecha Reserva</span>
                                            <p className="font-medium text-sm">{selectedUnit.fechaReserva || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Comercial</span>
                                            <p className="font-medium text-sm">{selectedUnit.comercial || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Clientes */}
                                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                    <h4 className="font-semibold text-sm border-b pb-2 mb-3">Clientes</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-xs text-muted-foreground">Titular del Boleto</span>
                                            <p className="font-semibold text-sm">{selectedUnit.clienteTitularBoleto || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Cliente Interesado</span>
                                            <p className="font-medium text-sm">{selectedUnit.clienteInteresado || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
