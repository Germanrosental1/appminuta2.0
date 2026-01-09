
import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { backendAPI } from "@/services/backendAPI";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Types matching backend DTO structure
interface WizardData {
    // Step 1: Ubicación
    projectId: string; // Internal for fetching contexts
    edificioTorre: string;
    etapa: string;
    piso: string;
    numeroUnidad: string;
    sectorId: string; // Generated or manual? We will generate it or ask for it.
    manzana?: string;
    destino?: string;
    frente?: string;

    // Step 2: Características
    tipo: string;
    dormitorios: number;
    tamano: string; // Using string to allow various formats if needed, or number
    m2Exclusivos: number;
    m2Totales: number;
    m2PatioTerraza: number;
    m2Comunes: number;

    // Step 3: Venta
    precioUSD: number;
    usdM2: number;
    estado: string;
    clienteInteresado?: string;
    comercial?: string;
    observaciones?: string;
    fechaReserva?: string;
}

const steps = [
    { id: 1, title: "Ubicación", description: "Proyecto y posición de la unidad" },
    { id: 2, title: "Características", description: "Tipología y superficies" },
    { id: 3, title: "Comercial", description: "Precios y estado de venta" }
];

export const UnitCreationWizard = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Catalogs
    const [projects, setProjects] = useState<any[]>([]);
    const [buildings, setBuildings] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [unitTypes, setUnitTypes] = useState<any[]>([]);
    const [commercialStates, setCommercialStates] = useState<any[]>([]);
    const [commercials, setCommercials] = useState<any[]>([]);

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<WizardData>({
        defaultValues: {
            dormitorios: 0,
            m2Exclusivos: 0,
            m2Totales: 0,
        }
    });

    const selectedProjectId = watch("projectId");
    const selectedTipo = watch("tipo");

    // Load initial catalogs
    useEffect(() => {
        const loadCatalogs = async () => {
            try {
                const [projs, types, stgs, states, comms] = await Promise.all([
                    backendAPI.getMyProjects(),
                    backendAPI.getUnitTypes(),
                    backendAPI.getStages(),
                    backendAPI.getCommercialStates(),
                    backendAPI.getCommercials()
                ]);
                setProjects(projs || []);
                setUnitTypes(types || []);
                setStages(stgs || []);
                setCommercialStates(states || []);
                setCommercials(comms || []);
            } catch (err) {
                console.error("Error loading catalogs", err);
                toast.error("Error cargando listas desplegables");
            }
        };
        loadCatalogs();
    }, []);

    // Load buildings when project changes
    useEffect(() => {
        if (selectedProjectId) {
            const loadBuildings = async () => {
                try {
                    const blds = await backendAPI.getBuildings(selectedProjectId);
                    setBuildings(blds || []);
                    setValue("edificioTorre", ""); // Reset building validation
                    setValue("etapa", ""); // Reset dependent fields if logic implies
                } catch (err) {
                    console.error("Error loading buildings", err);
                }
            };
            loadBuildings();
        }
    }, [selectedProjectId, setValue]);

    // Handle Submit
    const onSubmit = async (data: WizardData) => {
        setLoading(true);
        try {
            // Construct payload matching the service expectations
            // Logic for sectorId: Auto-generate if not provided?
            // Using a composite key logic: PROJ-BLD-UNIT
            const sectorId = data.sectorId || `${data.edificioTorre}-${data.piso}-${data.numeroUnidad}-${Date.now().toString().slice(-4)}`;

            const payload = {
                sectorid: sectorId,
                proyecto_id: data.projectId,

                tipounidad_id: data.tipo,   // Service creates if not exists
                edificio_id: data.edificioTorre, // Service creates if not exists, using proyecto_id
                etapa_id: data.etapa || "1",  // Service creates if not exists

                piso: data.piso,
                nrounidad: data.numeroUnidad,
                dormitorios: Number(data.dormitorios),
                manzana: data.manzana,
                destino: data.destino,
                frente: data.frente,

                m2exclusivos: Number(data.m2Exclusivos),
                m2totales: Number(data.m2Totales),
                m2comunes: Number(data.m2Comunes || 0),
                m2patioterraza: Number(data.m2PatioTerraza || 0),
                tamano: data.tamano,

                preciousd: Number(data.precioUSD || 0),
                usdm2: Number(data.usdM2 || 0),
                estadocomercial: data.estado,
                comercial: data.comercial,
                clienteinteresado: data.clienteInteresado, // backend expects string and casts to BigInt if needed/valid? NO, service casts string to BigInt.
                // Wait, input is text. Service casts.
                obs: data.observaciones,
                fechareserva: data.fechaReserva ? new Date(data.fechaReserva) : undefined
            };

            await backendAPI.createUnitComplete(payload);
            toast.success("Unidad creada exitosamente");
            navigate("/units");
        } catch (error: any) {
            console.error("Error creating unit:", error);
            toast.error(error.message || "Error al crear la unidad");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));
    const isLastStep = currentStep === steps.length;

    // Creatable Combobox implementation
    // Generic helper for comboboxes
    const CreatableCombobox = ({ value, onChange, options, placeholder, labelField = "nombre", valueField = "id", disabled = false }: { value: string, onChange: (val: string) => void, options: any[], placeholder: string, labelField?: string, valueField?: string, disabled?: boolean }) => {
        const [open, setOpen] = useState(false);
        const [search, setSearch] = useState("");

        // Filter options based on search
        const filteredOptions = options.filter(opt =>
            (opt[labelField] || "").toLowerCase().includes(search.toLowerCase())
        );

        const exactMatch = filteredOptions.some(opt => opt[labelField]?.toLowerCase() === search.toLowerCase());

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between" disabled={disabled}>
                        {value ? (options.find(opt => (opt[valueField] || opt[labelField]) === value)?.[labelField] || value) : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                    <Command>
                        <CommandInput placeholder={`Buscar ${placeholder.toLowerCase()}...`} onValueChange={setSearch} />
                        <CommandList>
                            <CommandEmpty>
                                {!exactMatch && search && (
                                    <div onClick={() => { onChange(search); setOpen(false); }} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 rounded-sm">
                                        <Plus className="h-4 w-4" /> Crear "{search}"
                                    </div>
                                )}
                                {(!search) && <span className="p-2 text-sm text-gray-500">Escriba para buscar o crear</span>}
                            </CommandEmpty>
                            <CommandGroup>
                                {filteredOptions.map((opt) => (
                                    <CommandItem
                                        key={opt.id || opt[labelField]}
                                        value={opt[labelField]}
                                        onSelect={() => {
                                            onChange(opt[valueField] || opt[labelField]);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", value === (opt[valueField] || opt[labelField]) ? "opacity-100" : "opacity-0")} />
                                        {opt[labelField]}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-3xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Nueva Unidad</h1>
                <p className="text-muted-foreground">Complete los datos paso a paso para dar de alta una unidad.</p>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-4 mb-8">
                {steps.map((step) => (
                    <div key={step.id} className={cn("flex items-center", step.id !== steps.length && "flex-1")}>
                        <div className={cn("flex flex-col items-center gap-2", currentStep >= step.id ? "text-primary" : "text-muted-foreground")}>
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold transition-colors", currentStep >= step.id ? "border-primary bg-primary text-primary-foreground" : "border-gray-300")}>
                                {currentStep > step.id ? <Check size={20} /> : step.id}
                            </div>
                            <span className="text-sm font-medium">{step.title}</span>
                        </div>
                        {step.id !== steps.length && (
                            <div className={cn("h-[2px] w-full mx-4 mb-6", currentStep > step.id ? "bg-primary" : "bg-gray-200")} />
                        )}
                    </div>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{steps[currentStep - 1].title}</CardTitle>
                    <CardDescription>{steps[currentStep - 1].description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ x: 10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -10, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* STEP 1: UBICACION */}
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Proyecto</Label>
                                            <Controller
                                                name="projectId"
                                                control={control}
                                                rules={{ required: true }}
                                                render={({ field }) => (
                                                    <CreatableCombobox
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={projects}
                                                        placeholder="Seleccionar Proyecto"
                                                        labelField="nombre"
                                                        valueField="id"
                                                    />
                                                )}
                                            />
                                            {errors.projectId && <span className="text-xs text-red-500">Requerido</span>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sector ID (Opcional - Autogenerado)</Label>
                                            <Input {...register("sectorId")} placeholder="Ej: ARB-T1-105" />
                                            <p className="text-xs text-muted-foreground">Dejar vacío para autogenerar.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Edificio / Torre</Label>
                                            <Controller
                                                name="edificioTorre"
                                                control={control}
                                                rules={{ required: true }}
                                                render={({ field }) => (
                                                    <CreatableCombobox
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={buildings}
                                                        placeholder={selectedProjectId ? "Seleccionar o Crear" : "Seleccione primero un proyecto"}
                                                        labelField="nombreedificio"
                                                        valueField="id"
                                                        disabled={!selectedProjectId}
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Piso</Label>
                                            <Input {...register("piso", { required: true })} placeholder="1, PB" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Unidad</Label>
                                            <Input {...register("numeroUnidad", { required: true })} placeholder="01, A" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Etapa</Label>
                                            <Controller
                                                name="etapa"
                                                control={control}
                                                rules={{ required: true }}
                                                render={({ field }) => (
                                                    <CreatableCombobox
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={stages}
                                                        placeholder="Seleccionar o Crear"
                                                        labelField="nombre"
                                                        valueField="nombre" // Backend resolves by name for FindOrCreate
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Manzana</Label>
                                            <Input {...register("manzana")} placeholder="Mz 10" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Destino</Label>
                                            <Input {...register("destino")} placeholder="Vivenda" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Frente / Orientación</Label>
                                            <Input {...register("frente")} placeholder="Norte" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: CARACTERISTICAS */}
                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Tipo de Unidad</Label>
                                        <Controller
                                            name="tipo"
                                            control={control}
                                            rules={{ required: true }}
                                            render={({ field }) => (
                                                <CreatableCombobox
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={unitTypes}
                                                    placeholder="Seleccionar o Crear Tipo"
                                                    labelField="nombre"
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Dormitorios</Label>
                                            <Input type="number" {...register("dormitorios")} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Tamaño (Texto)</Label>
                                            <Input {...register("tamano")} placeholder="Ej: Grande" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>m² Totales</Label>
                                            <Input type="number" step="0.01" {...register("m2Totales", { required: true })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>m² Exclusivos</Label>
                                            <Input type="number" step="0.01" {...register("m2Exclusivos")} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>m² Comunes</Label>
                                            <Input type="number" step="0.01" {...register("m2Comunes")} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>m² Patio/Terraza</Label>
                                            <Input type="number" step="0.01" {...register("m2PatioTerraza")} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: COMERCIAL */}
                            {currentStep === 3 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Precio List (USD)</Label>
                                            <Input type="number" step="0.01" {...register("precioUSD")} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>USD / m²</Label>
                                            <Input type="number" step="0.01" {...register("usdM2")} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Estado Comercial</Label>
                                        <Controller
                                            name="estado"
                                            control={control}
                                            rules={{ required: true }}
                                            render={({ field }) => (
                                                <CreatableCombobox
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={commercialStates}
                                                    placeholder="Seleccionar Estado"
                                                    labelField="nombreestado"
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Cliente Interesado (DNI/ID)</Label>
                                            <Input {...register("clienteInteresado")} placeholder="DNI Numérico" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Comercial Asignado</Label>
                                            <Controller
                                                name="comercial"
                                                control={control}
                                                render={({ field }) => (
                                                    <CreatableCombobox
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={commercials}
                                                        placeholder="Seleccionar Comercial"
                                                        labelField="nombre"
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Observaciones</Label>
                                        <Input {...register("observaciones")} placeholder="Notas adicionales..." />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={prevStep} disabled={currentStep === 1 || loading}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
                    </Button>

                    {isLastStep ? (
                        <Button onClick={handleSubmit(onSubmit)} disabled={loading}>
                            {loading ? "Guardando..." : "Guardar Unidad"} <Check className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={nextStep}>
                            Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};
