import React, { memo } from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, XCircle, Eye, Edit } from 'lucide-react';
import { TableRowStagger } from '@/components/animated/StaggerList';
import type { MinutaDefinitiva } from '@/services/minutas';

interface MinutaDefinitivaRowProps {
    minuta: MinutaDefinitiva;
    readOnly: boolean;
    onVer: (id: string) => void;
    onChangeEstado: (id: string, estado: 'pendiente' | 'aprobada' | 'firmada' | 'cancelada' | 'en_edicion') => void;
    onCancel: (id: string) => void;
}

const getEstadoBadge = (estado: string) => {
    switch (estado) {
        case 'pendiente':
            return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Pendiente</Badge>;
        case 'aprobada':
            return <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">Aprobada</Badge>;
        case 'firmada':
            return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Firmada</Badge>;
        case 'cancelada':
            return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">Cancelada</Badge>;
        case 'en_edicion':
            return <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">En Edición</Badge>;
        default:
            return <Badge variant="outline">{estado}</Badge>;
    }
};

export const MinutaDefinitivaRow = memo(({ minuta, readOnly, onVer, onChangeEstado, onCancel }: MinutaDefinitivaRowProps) => {
    const unidadDescripcion = typeof minuta.Dato?.unidadDescripcion === 'string'
        ? minuta.Dato.unidadDescripcion
        : (typeof (minuta.Dato as any)?.unidadCodigo === 'string' ? (minuta.Dato as any).unidadCodigo : 'Sin unidad');

    return (
        <TableRowStagger>
            <TableCell>{minuta.Proyectos?.nombre || minuta.ProyectoNombre || 'Sin proyecto'}</TableCell>
            <TableCell>{unidadDescripcion}</TableCell>
            <TableCell>{minuta.users?.email || minuta.CreadoPor || 'Sin asignar'}</TableCell>
            <TableCell>
                {new Date(minuta.FechaCreacion || minuta.CreatedAt).toLocaleDateString('es-AR')}
            </TableCell>
            <TableCell>{getEstadoBadge(minuta.Estado)}</TableCell>
            <TableCell className="text-right">
                <div className="flex flex-col items-end gap-1">
                    <div className="flex justify-end gap-2 flex-wrap">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                    onClick={() => onVer(minuta.Id)}
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Ver</p>
                            </TooltipContent>
                        </Tooltip>

                        {!readOnly && minuta.Estado === 'pendiente' && (
                            <>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                                            onClick={() => onChangeEstado(minuta.Id, 'aprobada')}
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Aprobar</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                                            onClick={() => onChangeEstado(minuta.Id, 'en_edicion')}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Editar</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                                            onClick={() => onCancel(minuta.Id)}
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Cancelar</p>
                                    </TooltipContent>
                                </Tooltip>
                            </>
                        )}
                    </div>

                    {minuta.Estado === 'aprobada' && (
                        <span className="text-xs text-muted-foreground italic">
                            Pendiente de firma
                        </span>
                    )}

                    {(minuta.Estado === 'firmada' || minuta.Estado === 'cancelada') && (
                        <span className="text-xs text-muted-foreground italic">
                            Estado final
                        </span>
                    )}
                </div>
            </TableCell>
        </TableRowStagger>
    );
});

MinutaDefinitivaRow.displayName = 'MinutaDefinitivaRow';
