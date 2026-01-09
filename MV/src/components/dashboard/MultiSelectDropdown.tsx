import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MultiSelectDropdownProps {
    label: string;
    items: string[];
    selected: string[];
    setSelected: React.Dispatch<React.SetStateAction<string[]>>;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function MultiSelectDropdown({
    label,
    items,
    selected,
    setSelected,
    open,
    setOpen
}: MultiSelectDropdownProps) {
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-between text-xs">
                    {selected.length === 0 ? label : `${selected.length} ${label.toLowerCase()}`}
                    <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="p-2 border-b">
                    <div
                        className="w-full text-left text-xs p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => setSelected([...items])}
                    >
                        Seleccionar todos
                    </div>
                </div>
                <div className="max-h-[250px] overflow-y-auto p-2">
                    {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2">Sin opciones</p>
                    ) : (
                        items.map(item => (
                            <div
                                key={item}
                                className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                                onClick={() => {
                                    setSelected(prev =>
                                        prev.includes(item)
                                            ? prev.filter(t => t !== item)
                                            : [...prev, item]
                                    );
                                }}
                            >
                                <div className={`w-4 h-4 border rounded flex items-center justify-center ${selected.includes(item) ? 'bg-primary border-primary' : 'border-input'}`}>
                                    {selected.includes(item) && <Check className="w-3 h-3 text-primary-foreground" />}
                                </div>
                                <span className="text-sm truncate">{item}</span>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-2 border-t">
                    <div
                        className="w-full text-left text-xs p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => setSelected([])}
                    >
                        Deseleccionar todos
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
