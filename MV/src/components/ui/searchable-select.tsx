
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface SearchableSelectProps {
    value: string;
    onChange: (val: string) => void;
    options: Record<string, unknown>[];
    placeholder: string;
    labelField?: string;
    valueField?: string;
    disabled?: boolean;
}

export const SearchableSelect = ({
    value,
    onChange,
    options,
    placeholder,
    labelField = "nombre",
    valueField = "id",
    disabled = false
}: SearchableSelectProps) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    // Helper to safely get string value
    const getStringValue = (val: unknown): string => {
        if (typeof val === 'string' || typeof val === 'number') return String(val);
        return '';
    };

    // Filter options based on search
    const filteredOptions = options.filter(opt =>
        getStringValue(opt[labelField]).toLowerCase().includes(search.toLowerCase())
    );

    const exactMatch = filteredOptions.some(opt => getStringValue(opt[labelField]).toLowerCase() === search.toLowerCase());

    const getDisplayLabel = (opt: Record<string, unknown> | undefined) => {
        if (!opt) return "";
        return getStringValue(opt[labelField]);
    };

    const selectedOption = options.find(opt => getStringValue(opt[valueField] || opt[labelField]) === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={disabled}
                >
                    {value ? (getDisplayLabel(selectedOption) || value) : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder={`Buscar ${placeholder.toLowerCase()}...`} onValueChange={setSearch} />
                    <CommandList>
                        <CommandEmpty>
                            {!exactMatch && search && (
                                <button
                                    type="button"
                                    onClick={() => { onChange(search); setOpen(false); }}
                                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 rounded-sm w-full text-left"
                                >
                                    <Plus className="h-4 w-4" /> Crear "{search}"
                                </button>
                            )}
                            {(!search) && <span className="p-2 text-sm text-gray-500">Escriba para buscar o crear</span>}
                        </CommandEmpty>
                        <CommandGroup>
                            {filteredOptions.map((opt) => {
                                const optValue = getStringValue(opt[valueField] || opt[labelField]);
                                const optLabel = String(opt[labelField] || ""); // Safe fallback for label display
                                return (
                                    <CommandItem
                                        key={optValue}
                                        value={optLabel}
                                        onSelect={() => {
                                            onChange(optValue);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", value === optValue ? "opacity-100" : "opacity-0")} />
                                        {optLabel}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
