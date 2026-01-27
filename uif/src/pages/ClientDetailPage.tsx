import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { uifApi } from '@/lib/api-client';
import { Client, Document, Analysis } from '@/types/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { DocumentsTab } from '@/components/client/DocumentsTab';
import { AnalysisTab } from '@/components/client/AnalysisTab';
import { AnalysisList } from '@/components/client/AnalysisList';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Selection State
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('analisis'); // Default to analysis when entered

  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!id) return;

      // 1. Fetch Client
      const clientData = await uifApi.clients.get(id);
      setClient(clientData);

      // 2. Fetch Analyses
      try {
        const analysesData = await uifApi.analyses.list(id);
        setAnalyses(analysesData || []);
      } catch (error) {
        console.warn('Could not fetch analyses', error);
      }

      // 3. Fetch Documents (All)
      try {
        const docsData = await uifApi.documents.list(id);
        setDocuments(docsData || []);
      } catch (error) {
        console.warn('Could not fetch documents', error);
      }

    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información del cliente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAnalysis = async (updates: Partial<Analysis>) => {
    if (!selectedAnalysisId) return false;

    try {
      await uifApi.analyses.update(selectedAnalysisId, updates);

      // Update local state
      setAnalyses(prev => prev.map(a => a.id === selectedAnalysisId ? { ...a, ...updates } : a));
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
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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
              window.history.back(); // Or use navigate('/')
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

      {!selectedAnalysisId ? (
        // LIST VIEW
        <AnalysisList
          clientId={client.id}
          clientName={client.name}
          analyses={analyses}
          documents={documents}
          onSelectAnalysis={handleAnalysisSelect}
          onRefresh={fetchData}
        />
      ) : (
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
                client={client} // Keep client for context if needed
                analysisId={activeAnalysis.id} // Pass Analysis ID for uploading
                documents={filteredDocuments}
                onDocumentsChange={fetchData}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">Análisis no encontrado</div>
        )
      )}
    </div>
  );
}
