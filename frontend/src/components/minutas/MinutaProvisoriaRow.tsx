import React, { memo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import type { MinutaProvisoria } from '@/services/minutas';

interface MinutaProvisoriaRowProps {
    minuta: MinutaProvisoria;
    onChangeEstado: (id: string, estado: 'revisada' | 'aprobada' | 'rechazada') => void;
}

const getEstadoBadge = (estado: string) => {
    switch (estado) {
        case 'pendiente':
            return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
        case 'revisada':
            return <Badge variant="outline" className="bg-blue-100 text-blue-800">Revisada</Badge>;
        case 'aprobada':
            return <Badge variant="outline" className="bg-green-100 text-green-800">Aprobada</Badge>;
        case 'rechazada':
            return <Badge variant="outline" className="bg-red-100 text-red-800">Rechazada</Badge>;
        default:
            return <Badge variant="outline">{estado}</Badge>;
    }
};

export const MinutaProvisoriaRow = memo(({ minuta, onChangeEstado }: MinutaProvisoriaRowProps) => {
    return (
        <TableRow>
            <TableCell>{minuta.Proyecto}</TableCell>
            <TableCell>{minuta.Dato?.unidadDescripcion || minuta.UnidadId}</TableCell>
            <TableCell>{minuta.UsuarioId}</TableCell>
            <TableCell>
                {new Date(minuta.FechaCreacion).toLocaleDateString('es-AR')}
            </TableCell>
            <TableCell>{getEstadoBadge(minuta.Estado)}</TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <a href={`/admin/minutas/${minuta.Id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                        </a>
                    </Button>

                    {minuta.Estado === 'pendiente' && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onChangeEstado(minuta.Id || '', 'revisada')}
                            >
                                <Clock className="h-4 w-4 mr-1" />
                                Revisar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600"
                                onClick={() => onChangeEstado(minuta.Id || '', 'aprobada')}
                            >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprobar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600"
                                onClick={() => onChangeEstado(minuta.Id || '', 'rechazada')}
                            >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rechazar
                            </Button>
                        </>
                    )}

                    {minuta.Estado === 'revisada' && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600"
                                onClick={() => onChangeEstado(minuta.Id || '', 'aprobada')}
                            >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprobar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600"
                                onClick={() => onChangeEstado(minuta.Id || '', 'rechazada')}
                            >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rechazar
                            </Button>
                        </>
                    )}

                    {minuta.Estado === 'aprobada' && (
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                        >
                            <a href={`/admin/minutas/${minuta.Id}/definitiva`}>
                                <FileText className="h-4 w-4 mr-1" />
                                Crear Definitiva
                            </a>
                        </Button>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
});

MinutaProvisoriaRow.displayName = 'MinutaProvisoriaRow';
