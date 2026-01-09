import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { FileText, Database, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export function SetupInstructions() {
  const [copied, setCopied] = useState(false);

  const sqlScript = `-- La aplicación ahora utiliza la vista 'vista_buscador_propiedades'
-- Esta vista debe existir en tu base de datos de Supabase

-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS public.tablas (
  id text NOT NULL,
  natdelproyecto text NULL,
  proyecto text NULL,
  etapa text NULL,
  tipo text NULL,
  sectorid text NOT NULL,
  edificiotorre text NULL,
  piso text NULL,
  nrounidad text NULL,
  dormitorios text NULL,
  frente text NULL,
  manzana text NULL,
  destino text NULL,
  tipocochera text NULL,
  tamano text NULL,
  m2cubiertos double precision NULL,
  m2semicubiertos double precision NULL,
  m2exclusivos double precision NULL,
  m2patioterraza double precision NULL,
  patioterraza text NULL,
  m2comunes double precision NULL,
  m2calculo double precision NULL,
  m2totales double precision NULL,
  preciousd double precision NULL,
  usdm2 double precision NULL,
  estado text NULL,
  motivonodisp text NULL,
  obs text NULL,
  fechareserva text NULL,
  comercial text NULL,
  clienteinteresado text NULL,
  fechafirmaboleto text NULL,
  clientetitularboleto text NULL,
  fechaposesionporboletocompraventa text NULL,
  deptocomprador text NULL,
  CONSTRAINT tablas_pkey PRIMARY KEY (id)
);

-- Configurar permisos para permitir acceso desde la API
ALTER TABLE public.tablas ENABLE ROW LEVEL SECURITY;

-- Política para permitir acceso a todos los usuarios autenticados
CREATE POLICY "Permitir acceso a todos los usuarios autenticados" 
  ON public.tablas 
  FOR ALL 
  TO authenticated 
  USING (true);

-- Política para permitir acceso anónimo (solo lectura)
CREATE POLICY "Permitir lectura a usuarios anónimos" 
  ON public.tablas 
  FOR SELECT 
  TO anon 
  USING (true);

-- IMPORTANTE: Asegúrate de que la vista 'vista_buscador_propiedades' existe en tu base de datos
-- La aplicación consume datos de esta vista.
-- Si necesitas crear datos de prueba, consulta con el administrador de la base de datos.`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Configuración de la Base de Datos
        </CardTitle>
        <CardDescription>
          Sigue estas instrucciones para verificar la vista 'vista_buscador_propiedades' en tu proyecto de Supabase
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="instructions">
          <TabsList className="mb-4">
            <TabsTrigger value="instructions">Instrucciones</TabsTrigger>
            <TabsTrigger value="sql">Script SQL</TabsTrigger>
          </TabsList>

          <TabsContent value="instructions" className="space-y-4">
            <Alert>
              <AlertTitle>La vista 'vista_buscador_propiedades' debe existir en tu base de datos</AlertTitle>
              <AlertDescription>
                Esta aplicación consume datos de la vista 'vista_buscador_propiedades'. Verifica que exista en tu proyecto de Supabase.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Pasos para verificar la vista:</h3>

              <ol className="list-decimal pl-5 space-y-3">
                <li>
                  <p>Accede al panel de control de tu proyecto en Supabase:</p>
                  <Button variant="outline" className="mt-2 flex items-center gap-2" asChild>
                    <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir Supabase Dashboard
                    </a>
                  </Button>
                </li>

                <li>
                  <p>Selecciona tu proyecto <strong>ltkpcwvhhktrewzebibk</strong></p>
                </li>

                <li>
                  <p>En el menú lateral, ve a <strong>Editor SQL</strong></p>
                </li>

                <li>
                  <p>Revisa las vistas (Views) disponibles en la sección <strong>Database</strong></p>
                </li>

                <li>
                  <p>Verifica que la vista 'vista_buscador_propiedades' esté creada en la sección <strong>Database</strong> → <strong>Views</strong> del menú lateral</p>
                </li>

                <li>
                  <p>Regresa a la aplicación y actualiza la página para verificar la conexión</p>
                </li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="sql">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 h-8 flex items-center gap-1"
                onClick={copyToClipboard}
              >
                {copied ? 'Copiado!' : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </Button>

              <pre className={cn("rounded-md border bg-muted px-4 py-3 font-mono text-xs overflow-auto max-h-[500px]")}>
                {sqlScript}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <FileText className="h-4 w-4 mr-1" />
          También puedes encontrar este script en: <code className="ml-1">supabase/create_table.sql</code>
        </div>
      </CardFooter>
    </Card>
  );
}
