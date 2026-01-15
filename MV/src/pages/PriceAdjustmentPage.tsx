import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
// Separator removed - not used
import { backendAPI } from "@/services/backendAPI";
import {
    Building2,
    Percent,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Project {
    id: string;
    nombre: string;
}

export default function PriceAdjustmentPage() {
    const { toast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [percentage, setPercentage] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Cargar proyectos
    useEffect(() => {
        const loadProjects = async () => {
            try {
                setLoading(true);
                const data = await backendAPI.getMyProjects();
                setProjects(data);
            } catch (error) {
                console.error("Error loading projects:", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "No se pudieron cargar los proyectos",
                });
            } finally {
                setLoading(false);
            }
        };
        loadProjects();
    }, []);

    const handleProjectToggle = (projectId: string) => {
        setSelectedProjects(prev =>
            prev.includes(projectId)
                ? prev.filter(id => id !== projectId)
                : [...prev, projectId]
        );
    };

    const handleSelectAll = () => {
        if (selectedProjects.length === projects.length) {
            setSelectedProjects([]);
        } else {
            setSelectedProjects(projects.map(p => p.id));
        }
    };

    const percentageValue = Number.parseFloat(percentage) || 0;
    const isValidPercentage = percentageValue !== 0 && !Number.isNaN(percentageValue);
    const canApply = selectedProjects.length > 0 && isValidPercentage;

    const handleApplyAdjustment = async () => {
        if (!canApply) return;

        setApplying(true);
        try {
            const result = await backendAPI.adjustPrices(selectedProjects, percentageValue);

            toast({
                title: "Ajuste aplicado exitosamente",
                description: `Se ajustaron los precios de ${result.unidadesAjustadas} unidades un ${percentageValue > 0 ? '+' : ''}${percentageValue}%`,
            });

            setShowConfirmation(false);
            setSelectedProjects([]);
            setPercentage("");
        } catch (error) {
            console.error("Error applying adjustment:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo aplicar el ajuste de precios",
            });
        } finally {
            setApplying(false);
        }
    };

    const selectedProjectNames = projects
        .filter(p => selectedProjects.includes(p.id))
        .map(p => p.nombre);

    return (
        <div className="container mx-auto py-6 max-w-4xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    Ajuste Masivo de Precios
                </h1>
                <p className="text-muted-foreground mt-1">
                    Ajusta los precios de todas las unidades de uno o más proyectos
                </p>
            </div>

            <div className="grid gap-6">
                {/* Selector de Proyectos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Seleccionar Proyectos
                        </CardTitle>
                        <CardDescription>
                            Selecciona los proyectos a los que deseas ajustar los precios
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No hay proyectos disponibles
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSelectAll}
                                    >
                                        {selectedProjects.length === projects.length
                                            ? "Deseleccionar todos"
                                            : "Seleccionar todos"}
                                    </Button>
                                    <Badge variant="secondary">
                                        {selectedProjects.length} de {projects.length} seleccionados
                                    </Badge>
                                </div>

                                <ScrollArea className="h-[200px] rounded-md border p-4">
                                    <div className="space-y-3">
                                        {projects.map((project) => (
                                            <div
                                                key={project.id}
                                                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <Checkbox
                                                    id={project.id}
                                                    checked={selectedProjects.includes(project.id)}
                                                    onCheckedChange={() => handleProjectToggle(project.id)}
                                                />
                                                <Label
                                                    htmlFor={project.id}
                                                    className="flex-1 cursor-pointer font-medium"
                                                >
                                                    {project.nombre}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Porcentaje de Ajuste */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Percent className="h-5 w-5" />
                            Porcentaje de Ajuste
                        </CardTitle>
                        <CardDescription>
                            Ingresa el porcentaje de ajuste (positivo para aumentar, negativo para disminuir)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 max-w-xs">
                                <Input
                                    type="number"
                                    placeholder="Ej: 15"
                                    value={percentage}
                                    onChange={(e) => setPercentage(e.target.value)}
                                    className="pr-8 text-lg"
                                />
                                <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>

                            {percentageValue !== 0 && (
                                <Badge
                                    variant={percentageValue > 0 ? "default" : "destructive"}
                                    className="text-sm px-3 py-1"
                                >
                                    {percentageValue > 0 ? "+" : ""}{percentageValue}%
                                </Badge>
                            )}
                        </div>

                        <div className="mt-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                <span>
                                    {percentageValue > 0
                                        ? `Los precios aumentarán un ${percentageValue}%`
                                        : percentageValue < 0
                                            ? `Los precios disminuirán un ${Math.abs(percentageValue)}%`
                                            : "Ingresa un porcentaje para ver el efecto"}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Confirmación */}
                {showConfirmation && canApply && (
                    <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertTitle className="text-orange-800 dark:text-orange-200">
                            Confirmar Ajuste de Precios
                        </AlertTitle>
                        <AlertDescription className="text-orange-700 dark:text-orange-300">
                            <p className="mb-3">
                                Estás a punto de {percentageValue > 0 ? "aumentar" : "disminuir"} los precios
                                un <strong>{Math.abs(percentageValue)}%</strong> en los siguientes proyectos:
                            </p>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {selectedProjectNames.map(name => (
                                    <Badge key={name} variant="outline" className="border-orange-400">
                                        {name}
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="destructive"
                                    onClick={handleApplyAdjustment}
                                    disabled={applying}
                                >
                                    {applying ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Aplicando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            Confirmar y Aplicar
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowConfirmation(false)}
                                    disabled={applying}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Botón de Aplicar */}
                {!showConfirmation && (
                    <div className="flex justify-end">
                        <Button
                            size="lg"
                            disabled={!canApply}
                            onClick={() => setShowConfirmation(true)}
                            className="gap-2"
                        >
                            <TrendingUp className="h-4 w-4" />
                            Ajustar Precios
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
