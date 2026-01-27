import { Analysis, Document } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, FileText } from 'lucide-react';
import { CreateAnalysisDialog } from './CreateAnalysisDialog';

interface AnalysisListProps {
    clientId: string;
    clientName: string;
    analyses: Analysis[];
    documents: Document[]; // All client docs, for selection in create dialog
    onSelectAnalysis: (analysisId: string) => void;
    onRefresh: () => void;
}

export function AnalysisList({ clientId, clientName, analyses, documents, onSelectAnalysis, onRefresh }: AnalysisListProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">Análisis Disponibles</h2>
                    <p className="text-sm text-muted-foreground">Gestiona los diferentes informes para {clientName}.</p>
                </div>
                <CreateAnalysisDialog
                    clientId={clientId}
                    clientName={clientName}
                    existingDocuments={documents}
                    onAnalysisCreated={onRefresh}
                />
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Historial</CardTitle>
                    <CardDescription>
                        Selecciona un análisis para ver detalles, documentos y simulaciones.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {analyses.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="bg-muted/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium">No hay análisis creados</h3>
                            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                                Comienza creando el primer análisis para este cliente.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Fecha Creación</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analyses.map((analysis) => (
                                    <TableRow key={analysis.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectAnalysis(analysis.id)}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-blue-500" />
                                                {analysis.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={analysis.status === 'Finalizado' ? 'default' : 'secondary'}>
                                                {analysis.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(analysis.created_at).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
