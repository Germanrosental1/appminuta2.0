import React, { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface FilterSelectProps {
    label: string;
    value: string;
    options: string[] | Array<{ id: string; descripcion: string }>;
    onChange: (value: string) => void;
    loading?: boolean;
    error?: string;
    placeholder?: string;
    required?: boolean;
    id: string;
    isUnidadSelect?: boolean;
    searchable?: boolean; // New prop for searchable dropdowns
    triggerClassName?: string;
    contentClassName?: string;
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
    isUnidadSelect = false,
    searchable = false,
    triggerClassName,
    contentClassName
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    // ⚡ OPTIMIZACIÓN: Debounce search to reduce re-renders
    const debouncedSearch = useDebounce(searchTerm, 300);

    // Filter options based on debounced search term
    const filteredOptions = useMemo(() => {
        if (!searchable || !debouncedSearch) return options;

        if (isUnidadSelect) {
            return (options as Array<{ id: string; descripcion: string }>).filter((item) =>
                item.descripcion.toLowerCase().includes(debouncedSearch.toLowerCase())
            );
        }

        return (options as string[]).filter((option) =>
            option.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    }, [options, debouncedSearch, searchable, isUnidadSelect]);

    const renderOptions = () => {
        if (filteredOptions.length === 0) {
            return (
                <div className="p-2 text-center text-sm text-muted-foreground">
                    {debouncedSearch ? 'No se encontraron resultados' : 'No hay opciones disponibles'}
                </div>
            );
        }

        if (isUnidadSelect) {
            return (filteredOptions as Array<{ id: string; descripcion: string }>).map((item) => (
                <SelectItem key={item.id} value={item.id}>
                    {item.descripcion}
                </SelectItem>
            ));
        }

        return (filteredOptions as string[]).map((option) => (
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
                <SelectTrigger id={id} className={`${error ? 'border-destructive' : ''} ${triggerClassName || ''}`}>
                    {loading ? (
                        <div className="flex items-center">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            <span>Cargando...</span>
                        </div>
                    ) : (
                        <SelectValue placeholder={placeholder || `Seleccione ${label.toLowerCase()}`} />
                    )}
                </SelectTrigger>
                <SelectContent className={contentClassName}>
                    {searchable && options.length > 5 && (
                        <div className="p-2 border-b border-border sticky top-0 bg-popover z-10">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={`Buscar ${label.toLowerCase()}...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    )}
                    {renderOptions()}
                </SelectContent>
            </Select>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
};
