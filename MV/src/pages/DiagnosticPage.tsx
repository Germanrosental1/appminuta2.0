import { useState, useEffect } from 'react';
import { SupabaseTest } from '@/components/sales-map/SupabaseTest';
import { SetupInstructions } from '@/components/sales-map/SetupInstructions';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

export default function DiagnosticPage() {
  const [tablasExists, setTablasExists] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTableExists = async () => {
      try {
        setLoading(true);
        const { count, error } = await supabase
          .from('vista_buscador_final')
          .select('*', { count: 'exact', head: true });

        if (error && error.code === 'PGRST205') {
          // La tabla no existe
          setTablasExists(false);
        } else if (!error) {
          // La tabla existe
          setTablasExists(true);
        }
      } catch (err) {
        console.error('Error checking if table exists:', err);
        setTablasExists(false);
      } finally {
        setLoading(false);
      }
    };

    checkTableExists();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Diagnóstico del Sistema</h1>

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Verificando configuración...</span>
        </div>
      ) : tablasExists === false ? (
        <div className="space-y-8">
          <SupabaseTest />
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Configuración Necesaria</h2>
            <SetupInstructions />
          </div>
        </div>
      ) : (
        <Tabs defaultValue="connection">
          <TabsList className="mb-4">
            <TabsTrigger value="connection">Diagnóstico de Conexión</TabsTrigger>
            <TabsTrigger value="setup">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="connection">
            <SupabaseTest />
          </TabsContent>

          <TabsContent value="setup">
            <SetupInstructions />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
