import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MONOTRIBUTO_CATEGORIES, DEFAULT_ANALYSIS_SETTINGS } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { Save, RefreshCw, DollarSign, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Helper to format currency
const formatCurrency = (val: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

export default function SettingsPage() {
  const { toast } = useToast();

  // State for Monotributo Categories
  // In a real app, this would come from a database. 
  // We initialize with the constants but allow editing (persisted to localStorage for demo).
  const [categories, setCategories] = useState(MONOTRIBUTO_CATEGORIES);

  // State for Global Variables
  const [globalWeights, setGlobalWeights] = useState(DEFAULT_ANALYSIS_SETTINGS.weights);
  const [extraSettings, setExtraSettings] = useState({
    rem: 0,
    cac: 0
  });

  // Load from database on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore not found error if not initialized
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        if (data.monotributo_categories && Object.keys(data.monotributo_categories).length > 0) {
          setCategories(data.monotributo_categories);
        }
        if (data.analysis_weights && Object.keys(data.analysis_weights).length > 0) {
          setGlobalWeights(data.analysis_weights);
        }
        if (data.extra_settings && Object.keys(data.extra_settings).length > 0) {
          setExtraSettings(data.extra_settings);
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleCategoryChange = (key: string, value: string) => {
    const numValue = Number.parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
    setCategories(prev => ({ ...prev, [key]: numValue }));
  };

  const handleWeightChange = (key: keyof typeof globalWeights, value: string) => {
    const numValue = Number.parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
    // Limit to 0-100
    const clamped = Math.min(100, Math.max(0, numValue));
    setGlobalWeights(prev => ({ ...prev, [key]: clamped }));
  };

  const handleExtraChange = (key: 'rem' | 'cac', value: string) => {
    const numValue = Number.parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
    setExtraSettings(prev => ({ ...prev, [key]: numValue }));
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 1,
          monotributo_categories: categories,
          analysis_weights: globalWeights,
          extra_settings: extraSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Configuración guardada",
        description: "Los cambios se han guardado en la base de datos.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive"
      });
    }
  };

  const handleReset = async () => {
    if (confirm('¿Estás seguro de restablecer los valores predeterminados?')) {
      const defaults = {
        monotributo_categories: MONOTRIBUTO_CATEGORIES,
        analysis_weights: DEFAULT_ANALYSIS_SETTINGS.weights,
        extra_settings: { rem: 0, cac: 0 }
      };

      try {
        setCategories(defaults.monotributo_categories);
        setGlobalWeights(defaults.analysis_weights);
        setExtraSettings(defaults.extra_settings);

        const { error } = await supabase
          .from('system_settings')
          .upsert({
            id: 1,
            ...defaults,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        toast({
          title: "Valores restablecidos",
          description: "Se han vuelto a cargar los valores por defecto.",
        });
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "No se pudieron restablecer los valores.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
          <p className="text-muted-foreground">Administra las variables globales y categorías del sistema.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Restablecer
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Cambios
          </Button>
        </div>
      </div>

      <Tabs defaultValue="monotributo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monotributo">Monotributo</TabsTrigger>
          <TabsTrigger value="variables">Variables Globales</TabsTrigger>
        </TabsList>

        <TabsContent value="monotributo">
          <Card>
            <CardHeader>
              <CardTitle>Categorías de Monotributo</CardTitle>
              <CardDescription>
                Define los topes de facturación anual para cada categoría.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(categories).map(([cat, limit]) => (
                  <div key={cat} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {cat}
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`cat-${cat}`} className="text-sm font-medium">Categoría {cat}</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">$</span>
                        <Input
                          id={`cat-${cat}`}
                          value={limit}
                          onChange={(e) => handleCategoryChange(cat, e.target.value)}
                          className="h-8 pl-5 text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variables">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ponderaciones Predeterminadas</CardTitle>
                <CardDescription>
                  Define los porcentajes (%) que se aplicarán por defecto a los nuevos análisis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(globalWeights).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={`weight-${key}`} className="capitalize">
                      {key.replace(/_/g, ' ')}
                    </Label>
                    <div className="flex items-center gap-2 w-32">
                      <div className="relative flex-1">
                        <Input
                          id={`weight-${key}`}
                          value={value}
                          onChange={(e) => handleWeightChange(key as keyof typeof globalWeights, e.target.value)}
                          className="h-8 pr-6 text-right"
                        />
                        <Percent className="absolute right-2 top-2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Índices y Valores de Referencia</CardTitle>
                <CardDescription>
                  Variables económicas adicionales para cálculos o referencia.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rem">REM (Relevamiento de Expectativas de Mercado)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="rem"
                      value={extraSettings.rem}
                      onChange={(e) => handleExtraChange('rem', e.target.value)}
                      className="pl-8"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tasa de referencia promedio estimada.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cac">CAC (Costo de Adquisición de Clientes - Ref)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cac"
                      value={extraSettings.cac}
                      onChange={(e) => handleExtraChange('cac', e.target.value)}
                      className="pl-8"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor de referencia para costo construcción/adquisición.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
