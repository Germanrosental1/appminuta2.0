import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface FilterSelectProps {
    label: string;
    value: string;
    options: string[] | Array<{ id: number; descripcion: string }>;
    onChange: (value: string) => void;
    loading?: boolean;
    error?: string;
    placeholder?: string;
    required?: boolean;
    id: string;
    isUnidadSelect?: boolean;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
    label,
    value,
    options,
    onChange,
    loading = false,
    error,
    placeholder,
    required = true,
    id,
    isUnidadSelect = false
}) => {
    const renderOptions = () => {
        if (options.length === 0) {
            return (
                <div className="p-2 text-center text-sm text-muted-foreground">
                    No hay opciones disponibles
                </div>
            );
        }

        if (isUnidadSelect) {
            return (options as Array<{ id: number; descripcion: string }>).map((item) => (
                <SelectItem key={item.id} value={item.id.toString()}>
                    {item.descripcion}
                </SelectItem>
            ));
        }

        return (options as string[]).map((option) => (
            <SelectItem key={option} value={option}>
                {option}
            </SelectItem>
        ));
    };

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>
                {label} {required && <span className="text-destructive">*</span>}
            </Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger id={id} className={error ? 'border-destructive' : ''}>
                    {loading ? (
                        <div className="flex items-center">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            <span>Cargando...</span>
                        </div>
                    ) : (
                        <SelectValue placeholder={placeholder || `Seleccione ${label.toLowerCase()}`} />
                    )}
                </SelectTrigger>
                <SelectContent>
                    {renderOptions()}
                </SelectContent>
            </Select>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
};
