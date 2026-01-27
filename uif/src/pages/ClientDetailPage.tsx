import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { uifApi } from '@/lib/api-client';
import { Analysis } from '@/types/database';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, BarChart3 } from 'lucide-react';
import { DocumentsTab } from '@/components/client/DocumentsTab';
import { AnalysisTab } from '@/components/client/AnalysisTab';
import { AnalysisList } from '@/components/client/AnalysisList';

// Skeleton para la página de detalle del cliente
const ClientDetailSkeleton = () => (
  <div className="space-y-6 animate-in">
    {/* Header skeleton */}
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-4">
        <Skeleton className="h-9 w-9 rounded" />
        <div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
      </div>
    </div>

    {/* Analysis list skeleton */}
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Selection State
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('analisis');

  // ⚡ PERFORMANCE: useQuery con cache automático
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => uifApi.clients.get(id),
    enabled: !!id,
  });

  const { data: analyses = [], isLoading: analysesLoading } = useQuery({
    queryKey: ['analyses', id],
    queryFn: () => uifApi.analyses.list(id),
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => uifApi.documents.list(id),
    enabled: !!id,
  });

  const loading = clientLoading;

  // Refetch function para componentes hijos
  const refetchData = () => {
    queryClient.invalidateQueries({ queryKey: ['client', id] });
    queryClient.invalidateQueries({ queryKey: ['analyses', id] });
    queryClient.invalidateQueries({ queryKey: ['documents', id] });
  };

  const updateAnalysis = async (updates: Partial<Analysis>) => {
    if (!selectedAnalysisId) return false;

    try {
      await uifApi.analyses.update(selectedAnalysisId, updates);
      // ⚡ PERFORMANCE: Invalidar cache para refetch
      queryClient.invalidateQueries({ queryKey: ['analyses', id] });
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios del análisis',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleAnalysisSelect = (analysisId: string) => {
    setSelectedAnalysisId(analysisId);
    setActiveTab('analisis');
  };

  const activeAnalysis = analyses.find(a => a.id === selectedAnalysisId);
  const filteredDocuments = selectedAnalysisId
    ? documents.filter(d => d.analysis_id === selectedAnalysisId)
    : [];

  if (loading && !client) {
    return <ClientDetailSkeleton />;
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Button asChild className="mt-4">
          <Link to="/">Volver a Clientes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            if (selectedAnalysisId) {
              setSelectedAnalysisId(null);
            } else {
              // Navigate back to home
              globalThis.history.back(); // Or use navigate('/')
            }
          }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{client.name}</h1>
              <Badge variant={client.status === 'Activo' ? 'default' : 'secondary'}>
                {client.status}
              </Badge>
              <Badge variant="outline">
                {client.person_type === 'PF' ? 'Física' : 'Jurídica'}
              </Badge>
            </div>
            {client.cuit && (
              <p className="text-muted-foreground font-mono text-sm mt-1">
                CUIT: {client.cuit}
              </p>
            )}
          </div>
        </div>

        {selectedAnalysisId && activeAnalysis && (
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-md">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{activeAnalysis.name}</span>
          </div>
        )}
      </div>

      {selectedAnalysisId ? (
        // DETAIL VIEW (TABS)
        activeAnalysis ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="analisis" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Análisis
              </TabsTrigger>
              <TabsTrigger value="documentos" className="gap-2">
                <FileText className="h-4 w-4" />
                Documentos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analisis" className="mt-6">
              <AnalysisTab
                client={client}
                analysis={activeAnalysis} // Pass specific analysis
                documents={filteredDocuments}
                onUpdate={updateAnalysis}
              />
            </TabsContent>

            <TabsContent value="documentos" className="mt-6">
              <DocumentsTab
                client={client}
                analysisId={activeAnalysis.id}
                documents={filteredDocuments}
                onDocumentsChange={refetchData}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">Análisis no encontrado</div>
        )
      ) : (
        // LIST VIEW
        <AnalysisList
          clientId={client.id}
          clientName={client.name}
          analyses={analyses}
          documents={documents}
          isLoading={analysesLoading}
          onSelectAnalysis={handleAnalysisSelect}
          onRefresh={refetchData}
        />
      )}
    </div>
  );
}
