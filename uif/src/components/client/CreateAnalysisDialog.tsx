import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { Client, Document, DEFAULT_FINANCIAL_DATA, DEFAULT_ANALYSIS_SETTINGS, DOC_TYPE_LABELS } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus } from 'lucide-react';

interface CreateAnalysisDialogProps {
    clientId: string;
    clientName: string;
    existingDocuments: Document[];
    onAnalysisCreated: () => void;
}

export function CreateAnalysisDialog({ clientId, clientName, existingDocuments, onAnalysisCreated }: CreateAnalysisDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleCreate = async () => {
        if (!name.trim()) {
            toast({
                title: "Nombre requerido",
                description: "Por favor ingresa un nombre para el análisis.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            // 1. Fetch system default settings
            const { data: systemSettings } = await supabase
                .from('system_settings')
                .select('*')
                .single();

            // Prepare settings: Default code constant merged with DB defaults if available
            const initialSettings = { ...DEFAULT_ANALYSIS_SETTINGS };

            if (systemSettings?.analysis_weights) {
                initialSettings.weights = {
                    ...initialSettings.weights,
                    ...systemSettings.analysis_weights
                };
            }

            // 2. Create Analysis
            const { data: analysisData, error: analysisError } = await supabase
                .from('analyses')
                .insert({
                    client_id: clientId,
                    name: name.trim(),
                    status: 'En Proceso',
                    financial_data: DEFAULT_FINANCIAL_DATA,
                    analysis_settings: initialSettings
                })
                .select()
                .single();

            if (analysisError) throw analysisError;

            // 3. Import selected documents
            if (selectedDocs.length > 0 && analysisData) {
                const docsToImport = existingDocuments.filter(d => selectedDocs.includes(d.id));

                const newDocs = docsToImport.map(d => ({
                    client_id: clientId,
                    analysis_id: analysisData.id,
                    doc_type: d.doc_type,
                    storage_bucket: d.storage_bucket,
                    storage_path: d.storage_path, // Point to same file
                    original_filename: d.original_filename,
                    mime_type: d.mime_type,
                    status: d.status, // Keep original status if we trust it
                    extracted_data: d.extracted_data,
                    reviewed_data: d.reviewed_data
                }));

                const { error: docsError } = await supabase
                    .from('documents')
                    .insert(newDocs);

                if (docsError) throw docsError;
            }

            toast({
                title: "Análisis creado",
                description: `Se ha creado el análisis "${name}" correctamente.`
            });

            setOpen(false);
            setName('');
            setSelectedDocs([]);
            onAnalysisCreated();

        } catch (error: unknown) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "No se pudo crear el análisis.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleDoc = (docId: string) => {
        setSelectedDocs(prev =>
            prev.includes(docId)
                ? prev.filter(id => id !== docId)
                : [...prev, docId]
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Análisis
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Análisis</DialogTitle>
                    <DialogDescription>
                        Comienza un nuevo proceso de análisis para {clientName}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre del Análisis</Label>
                        <Input
                            id="name"
                            placeholder="Ej: Análisis 2025"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Importar Documentos (Opcional)</Label>
                        <div className="border rounded-md p-2">
                            <ScrollArea className="h-[200px]">
                                {existingDocuments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No hay documentos previos disponibles.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {existingDocuments.map((doc) => (
                                            <div key={doc.id} className="flex items-start space-x-2 p-2 hover:bg-muted/50 rounded">
                                                <Checkbox
                                                    id={`doc-${doc.id}`}
                                                    checked={selectedDocs.includes(doc.id)}
                                                    onCheckedChange={() => toggleDoc(doc.id)}
                                                />
                                                <div className="grid gap-1.5 leading-none">
                                                    <Label
                                                        htmlFor={`doc-${doc.id}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                    >
                                                        {DOC_TYPE_LABELS[doc.doc_type]}
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        {doc.original_filename} - {new Date(doc.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Los documentos seleccionados se copiarán al nuevo análisis.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreate} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Crear Análisis
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
