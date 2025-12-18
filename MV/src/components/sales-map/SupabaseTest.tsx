import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export function SupabaseTest() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [tablasCount, setTablasCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);

      // Intentar verificar directamente la vista 'vista_buscador_final'
      const { count, error: countError } = await supabase
        .from('vista_buscador_final')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        // Si hay un error específico de que la tabla no existe
        if (countError.code === 'PGRST205') {
          setIsConnected(true); // La conexión funciona, pero la tabla no existe
          setTables([]);
          setTablasCount(0);
          throw new Error('La vista "vista_buscador_final" no existe en la base de datos');
        } else {
          throw countError;
        }
      }

      // Si llegamos aquí, la conexión funciona y la tabla existe
      setIsConnected(true);
      setTables(['vista_buscador_final']); // Sabemos que al menos esta vista existe
      setTablasCount(count);

      // Intentar obtener una lista de proyectos para mostrar más información
      const { data: proyectosData, error: proyectosError } = await supabase
        .from('vista_buscador_final')
        .select('proyecto')
        .limit(10);

      if (!proyectosError && proyectosData) {
        const proyectosUnicos = [...new Set(proyectosData.map(p => p.proyecto).filter(Boolean))];
        if (proyectosUnicos.length > 0) {
          setTables(prev => [...prev, ...proyectosUnicos.map(p => `Proyecto: ${p}`)]);
        }
      }
    } catch (err: any) {
      console.error('Error testing Supabase connection:', err);
      setIsConnected(false);
      setError(err.message || 'Error al conectar con Supabase');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Diagnóstico de Conexión Supabase</CardTitle>
        <CardDescription>
          Verifica la conexión con Supabase y la disponibilidad de datos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Verificando conexión...</span>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              <div className="flex items-center justify-between border p-4 rounded-md">
                <span className="font-medium">Estado de conexión:</span>
                {isConnected === null ? (
                  <span>Verificando...</span>
                ) : isConnected ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle2 className="h-5 w-5 mr-1" />
                    <span>Conectado</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <XCircle className="h-5 w-5 mr-1" />
                    <span>Error de conexión</span>
                  </div>
                )}
              </div>

              {isConnected && (
                <>
                  <div className="border p-4 rounded-md">
                    <h3 className="font-medium mb-2">Vistas/Tablas disponibles:</h3>
                    {tables.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {tables.map(table => (
                          <li key={table} className={table === 'vista_buscador_final' ? 'font-semibold' : ''}>
                            {table} {table === 'vista_buscador_final' && '✓'}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No se encontraron tablas</p>
                    )}
                  </div>

                  <div className="border p-4 rounded-md">
                    <h3 className="font-medium mb-2">Vista 'vista_buscador_final' (Mapas de Ventas):</h3>
                    {tables.includes('vista_buscador_final') ? (
                      <p>
                        {tablasCount !== null ? (
                          <>
                            <span className="font-semibold">{tablasCount}</span> registros encontrados
                          </>
                        ) : (
                          'Verificando registros...'
                        )}
                      </p>
                    ) : (
                      <p className="text-red-600">
                        ⚠️ La vista 'vista_buscador_final' no existe en la base de datos
                      </p>
                    )}
                  </div>
                </>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={testConnection}
          disabled={loading}
          className="w-full"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Probar conexión nuevamente
        </Button>
      </CardFooter>
    </Card>
  );
}
