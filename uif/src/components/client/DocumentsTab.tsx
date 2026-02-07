import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { uifApi } from '@/lib/api-client';
import { Client, Document, DocType, DOC_TYPES, DOC_TYPE_LABELS, DocumentStatus, PJ_DOC_TYPES, PF_DOC_TYPES } from '@/types/database';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Eye, RefreshCw, Download, Loader2, AlertCircle, X, FolderUp, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DocumentReviewDialog } from './DocumentReviewDialog';

interface DocumentsTabProps {
  client: Client;
  analysisId?: string;
  documents: Document[];
  onDocumentsChange: () => void;
}

interface PendingFile {
  id: string;
  file: File;
  docType: DocType | '';
  analyze: boolean;
}

const STATUS_STYLES: Record<DocumentStatus, string> = {
  'Pendiente': 'status-pendiente',
  'Procesando': 'status-procesando',
  'ListoParaRevision': 'status-listo',
  'Validado': 'status-validado',
  'Error': 'status-error',
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  'Pendiente': 'Pendiente',
  'Procesando': 'Procesando...',
  'ListoParaRevision': 'Listo para Revisión',
  'Validado': 'Validado',
  'Error': 'Error',
};

export function DocumentsTab({ client, analysisId, documents, onDocumentsChange }: DocumentsTabProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [reviewingDoc, setReviewingDoc] = useState<Document | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Filter documents that can be analyzed (Pendiente or Error status)
  const analyzableDocuments = documents.filter(
    (doc) => doc.status === 'Pendiente' || doc.status === 'Error'
  );

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const toggleAllDocs = (checked: boolean) => {
    if (checked) {
      setSelectedDocIds(new Set(analyzableDocuments.map((d) => d.id)));
    } else {
      setSelectedDocIds(new Set());
    }
  };

  const handleAnalyzeSelected = async () => {
    if (selectedDocIds.size === 0) return;

    setAnalyzing(true);

    try {
      const docsToAnalyze = documents.filter((d) => selectedDocIds.has(d.id));

      for (const doc of docsToAnalyze) {
        // Get signed URL for the document from Storage
        const { data: signedUrlData } = await supabase.storage
          .from(doc.storage_bucket || 'documents')
          .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry

        if (signedUrlData?.signedUrl) {
          // Call API to start analysis
          await uifApi.documents.analyze(doc.id, signedUrlData.signedUrl);
        } else {
          console.warn('Could not generate signed URL for', doc.id);
        }
      }

      toast({
        title: 'Análisis iniciado',
        description: `${docsToAnalyze.length} documento(s) enviado(s) a procesar`,
      });

      setSelectedDocIds(new Set());
      onDocumentsChange();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo iniciar el análisis',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCancelProcessing = async (doc: Document) => {
    try {
      await uifApi.documents.update(doc.id, { status: 'Pendiente', error_message: null });

      toast({
        title: 'Procesamiento cancelado',
        description: 'El documento volvió a estado Pendiente',
      });

      onDocumentsChange();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cancelar',
        variant: 'destructive',
      });
    }
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: PendingFile[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      docType: '' as DocType | '',
      analyze: true, // Por defecto seleccionados para análisis
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      addFiles(files);
      if (!uploadDialogOpen) {
        setUploadDialogOpen(true);
      }
    }
  }, [addFiles, uploadDialogOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updatePendingFile = (id: string, updates: Partial<PendingFile>) => {
    setPendingFiles((prev) =>
      prev.map((pf) => (pf.id === id ? { ...pf, ...updates } : pf))
    );
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((pf) => pf.id !== id));
  };

  const toggleAnalyze = (id: string) => {
    setPendingFiles((prev) =>
      prev.map((pf) => (pf.id === id ? { ...pf, analyze: !pf.analyze } : pf))
    );
  };

  const toggleAllAnalyze = (checked: boolean) => {
    setPendingFiles((prev) =>
      prev.map((pf) => ({ ...pf, analyze: checked }))
    );
  };

  const uploadFiles = async (shouldAnalyze: boolean) => {
    const filesToUpload = pendingFiles.filter((pf) => pf.docType);

    if (filesToUpload.length === 0) {
      toast({
        title: 'Selecciona tipos de documento',
        description: 'Cada archivo debe tener un tipo de documento asignado',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    // Sanitize filename for Supabase Storage (remove special chars, spaces, etc.)
    const sanitizeFilename = (filename: string): string => {
      return filename
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/ñ/g, 'n')
        .replace(/Ñ/g, 'N')
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
        .replace(/_+/g, '_'); // Collapse multiple underscores
    };

    try {
      for (const pending of filesToUpload) {
        // 1. Upload to Storage (Mantenemos Supabase Storage directo para eficiencia)
        const timestamp = Date.now();
        const sanitizedName = sanitizeFilename(pending.file.name);
        const storagePath = `${client.id}/${timestamp}_${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, pending.file);

        if (uploadError) throw uploadError;

        // 2. Create document record via API (Replaces SQL INSERT)
        const shouldAnalyzeThis = shouldAnalyze && pending.analyze;

        // El estado inicial lo maneja el backend por defecto como 'Pendiente', 
        // pero podemos pasar 'Procesando' si vamos a analizarlo inmediatamente,
        // sin embargo el create DTO no acepta status por seguridad, se crea como Pendiente.
        // Si queremos analizarlo, debemos hacer update posterior o enviar a analizar.

        const docData = await uifApi.documents.create({
          client_id: client.id,
          analysis_id: analysisId,
          doc_type: pending.docType,
          storage_bucket: 'documents',
          storage_path: storagePath,
          original_filename: pending.file.name,
          mime_type: pending.file.type,
        });

        // 3. Call analyze via API only if we should analyze
        if (shouldAnalyzeThis) {
          // Get signed URL from storage
          const { data: signedUrlData } = await supabase.storage
            .from('documents')
            .createSignedUrl(storagePath, 3600); // 1 hour expiry

          if (signedUrlData?.signedUrl) {
            try {
              await uifApi.documents.analyze(docData.id, signedUrlData.signedUrl);
            } catch (error) {
              console.warn('Failed to start analysis for doc:', docData.id, error);
            }
          }
        }
      }

      const analyzedCount = shouldAnalyze
        ? filesToUpload.filter(f => f.analyze).length
        : 0;

      toast({
        title: 'Documentos guardados',
        description: analyzedCount > 0
          ? `${filesToUpload.length} archivo(s) subido(s), ${analyzedCount} en análisis`
          : `${filesToUpload.length} archivo(s) guardado(s)`,
      });

      setUploadDialogOpen(false);
      setPendingFiles([]);
      onDocumentsChange();
    } catch (error: unknown) {
      console.error(error);
      toast({
        title: 'Error al subir',
        description: error.message || 'No se pudo subir el documento',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveOnly = () => uploadFiles(false);
  const handleSaveAndAnalyze = () => uploadFiles(true);
  const handleClose = () => {
    setUploadDialogOpen(false);
    setPendingFiles([]);
  };

  const handleReprocess = async (doc: Document) => {
    try {
      // Generate signed URL for n8n to download the file from Storage
      const { data: signedUrlData } = await supabase.storage
        .from(doc.storage_bucket || 'documents')
        .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry

      if (signedUrlData?.signedUrl) {
        await uifApi.documents.analyze(doc.id, signedUrlData.signedUrl);

        toast({
          title: 'Reprocesando',
          description: 'El documento está siendo procesado nuevamente',
        });
        onDocumentsChange();
      } else {
        throw new Error('No se pudo generar URL firma');
      }

    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error.message || 'Error al reprocesar',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (doc: Document) => {
    const { data, error } = await supabase.storage
      .from(doc.storage_bucket)
      .createSignedUrl(doc.storage_path, 60);

    if (error || !data?.signedUrl) {
      toast({
        title: 'Error',
        description: 'No se pudo generar el enlace de descarga',
        variant: 'destructive',
      });
      return;
    }

    window.open(data.signedUrl, '_blank');
  };

  const allFilesHaveType = pendingFiles.every((pf) => pf.docType);
  const anySelectedForAnalysis = pendingFiles.some((pf) => pf.analyze);

  return (
    <div
      className="space-y-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="border-2 border-dashed border-primary rounded-xl p-12 bg-primary/5 flex flex-col items-center gap-4">
            <FolderUp className="w-16 h-16 text-primary animate-pulse" />
            <p className="text-xl font-medium text-primary">Suelta los archivos aquí</p>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {selectedDocIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedDocIds.size} seleccionado(s)
              </span>
              <Button
                onClick={handleAnalyzeSelected}
                disabled={analyzing}
                size="sm"
              >
                {analyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <RefreshCw className="mr-2 h-4 w-4" />
                Analizar seleccionados
              </Button>
            </>
          )}
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Subir Documentos
        </Button>
      </div>

      {/* Documents Table */}
      {documents.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-card cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          onClick={() => setUploadDialogOpen(true)}
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg">Sin documentos</h3>
          <p className="text-muted-foreground mt-1">
            Arrastra archivos aquí o haz clic para subir
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={analyzableDocuments.length > 0 && analyzableDocuments.every((d) => selectedDocIds.has(d.id))}
                    onCheckedChange={(checked) => toggleAllDocs(!!checked)}
                    disabled={analyzableDocuments.length === 0}
                  />
                </TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Procesado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const isAnalyzable = doc.status === 'Pendiente' || doc.status === 'Error';
                return (
                  <TableRow key={doc.id} className={selectedDocIds.has(doc.id) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedDocIds.has(doc.id)}
                        onCheckedChange={() => toggleDocSelection(doc.id)}
                        disabled={!isAnalyzable}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {DOC_TYPE_LABELS[doc.doc_type as DocType] || doc.doc_type}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {doc.original_filename || doc.storage_path.split('/').pop()}
                    </TableCell>
                    <TableCell>
                      <span className={cn('status-badge', STATUS_STYLES[doc.status as DocumentStatus])}>
                        {doc.status === 'Procesando' && (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        )}
                        {doc.status === 'Error' && (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {STATUS_LABELS[doc.status as DocumentStatus]}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(doc.created_at), "d MMM, HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {doc.processed_at
                        ? format(new Date(doc.processed_at), "d MMM, HH:mm", { locale: es })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {doc.status === 'Procesando' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelProcessing(doc)}
                            title="Cancelar procesamiento"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        {(doc.status === 'ListoParaRevision' || doc.status === 'Validado') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setReviewingDoc(doc)}
                            title="Revisar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {(doc.status === 'Error' || doc.status === 'ListoParaRevision') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReprocess(doc)}
                            title="Reprocesar"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(doc)}
                          title="Descargar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        if (!open && !uploading) {
          handleClose();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Subir Documentos</DialogTitle>
            <DialogDescription>
              Arrastra archivos o selecciona desde tu dispositivo
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Drop Zone - Centered */}
            <div className="flex items-center justify-center min-h-[200px]">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors w-full max-w-md",
                  isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Arrastra archivos aquí o <span className="text-primary font-medium">haz clic para seleccionar</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, PNG, WEBP
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Pending Files List */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Archivos a subir ({pendingFiles.length})
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={pendingFiles.every(pf => pf.analyze)}
                      onCheckedChange={(checked) => toggleAllAnalyze(!!checked)}
                    />
                    <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">
                      Seleccionar todos para análisis
                    </label>
                  </div>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {pendingFiles.map((pf) => (
                    <div
                      key={pf.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <Checkbox
                        checked={pf.analyze}
                        onCheckedChange={() => toggleAnalyze(pf.id)}
                        title="Seleccionar para análisis"
                      />

                      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pf.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(pf.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>

                      <Select
                        value={pf.docType}
                        onValueChange={(v) => updatePendingFile(pf.id, { docType: v as DocType })}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Tipo de documento" />
                        </SelectTrigger>
                        <SelectContent>
                          {(client.person_type === 'PJ' ? PJ_DOC_TYPES : PF_DOC_TYPES).map((type) => (
                            <SelectItem key={type} value={type}>
                              {DOC_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePendingFile(pf.id)}
                        disabled={uploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              Salir
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveOnly}
              disabled={pendingFiles.length === 0 || !allFilesHaveType || uploading}
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
            <Button
              onClick={handleSaveAndAnalyze}
              disabled={pendingFiles.length === 0 || !allFilesHaveType || !anySelectedForAnalysis || uploading}
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Check className="mr-2 h-4 w-4" />
              Guardar y Analizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      {reviewingDoc && (
        <DocumentReviewDialog
          document={reviewingDoc}
          client={client}
          onClose={() => setReviewingDoc(null)}
          onUpdate={onDocumentsChange}
        />
      )}
    </div>
  );
}
