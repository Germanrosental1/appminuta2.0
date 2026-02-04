import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Document } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Eye, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Skeleton para la tabla de documentos
const DocumentsTableSkeleton = () => (
    <div className="space-y-6 animate-in">
        <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-96" />
        </div>
        <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Archivo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Skeleton className="h-8 w-8 rounded" />
                                    <Skeleton className="h-8 w-8 rounded" />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </div>
);

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<(Document & { clients: { name: string } | null })[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const { data, error } = await supabase
                .from('documents')
                .select(`
          *,
          clients (
            name
          )
        `)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            setDocuments(data || []);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los documentos',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const downloadDocument = async (doc: Document) => {
        try {
            const { data, error } = await supabase.storage
                .from(doc.storage_bucket)
                .download(doc.storage_path);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const a = globalThis.document.createElement('a');
            a.href = url;
            a.download = doc.original_filename || 'documento';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo descargar el documento',
                variant: 'destructive',
            });
        }
    };

    const getStatusColor = (status: string): "secondary" | "default" | "warning" | "success" | "destructive" | "outline" => {
        switch (status) {
            case 'Pendiente': return 'secondary';
            case 'Procesando': return 'default'; // Blue/Info
            case 'ListoParaRevision': return 'warning';
            case 'Validado': return 'success';
            case 'Error': return 'destructive';
            default: return 'secondary';
        }
    };

    if (loading) {
        return <DocumentsTableSkeleton />;
    }

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold">Documentos Recientes</h1>
                <p className="text-muted-foreground">
                    Vista general de todos los documentos cargados en el sistema
                </p>
            </div>

            {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-card/50 border-dashed">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-lg">No hay documentos</h3>
                    <p className="text-muted-foreground mt-1">
                        Los documentos cargados a los clientes aparecerán aquí
                    </p>
                </div>
            ) : (
                <div className="rounded-lg border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Archivo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow
                                    key={doc.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => navigate(`/clientes/${doc.client_id}?tab=documentos`)}
                                >
                                    <TableCell className="text-muted-foreground">
                                        {format(new Date(doc.created_at), "d MMM, HH:mm", { locale: es })}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <Link
                                            to={`/clientes/${doc.client_id}`}
                                            className="hover:underline flex items-center gap-1 group"
                                        >
                                            {doc.clients?.name || 'Cliente Desconocido'}
                                            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{doc.doc_type}</Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={doc.original_filename || ''}>
                                        {doc.original_filename}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusColor(doc.status)}>
                                            {doc.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => downloadDocument(doc)}
                                                title="Descargar"
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                asChild
                                                title="Ver Cliente"
                                            >
                                                <Link to={`/clientes/${doc.client_id}?tab=documentos`}>
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
