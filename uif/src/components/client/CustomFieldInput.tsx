import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { CustomField } from '@/types/database';
import { cn } from '@/lib/utils';

interface CustomFieldInputProps {
    field: CustomField;
    onUpdate: (updates: Partial<CustomField>) => void;
    onRemove: () => void;
    dolarRate?: number; // Exchange rate for USD -> ARS conversion
}

// Format number with commas as thousand separators
const formatWithCommas = (num: number | string): string => {
    const n = typeof num === 'string' ? Number.parseFloat(num.replace(/,/g, '')) : num;
    if (Number.isNaN(n) || n === 0) return '0';
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

// Parse string with commas back to number
const parseFromCommas = (str: string): number => {
    const clean = str.replace(/,/g, '').replace(/[^0-9.-]/g, '');
    return Number.parseFloat(clean) || 0;
};

// Format as ARS currency
const formatARS = (value: number): string => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
    }).format(value);
};

// Format as USD currency
const formatUSD = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
};

export function CustomFieldInput({ field, onUpdate, onRemove, dolarRate = 1475 }: Readonly<CustomFieldInputProps>) {
    const currency = field.currency || 'ARS';
    const isUSD = currency === 'USD';

    // Calculate ARS equivalent if in USD
    const arsValue = isUSD ? field.value * dolarRate : field.value;

    return (
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
            {/* Label input */}
            <Input
                type="text"
                placeholder="Nombre del campo..."
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                className="flex-1 h-8 text-sm bg-background"
            />

            {/* Currency toggle */}
            <div className="flex items-center bg-muted/50 p-0.5 rounded border">
                <button
                    type="button"
                    onClick={() => onUpdate({ currency: 'ARS' })}
                    className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded transition-all",
                        !isUSD
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    ARS
                </button>
                <button
                    type="button"
                    onClick={() => onUpdate({ currency: 'USD' })}
                    className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded transition-all",
                        isUSD
                            ? "bg-green-600 shadow-sm text-white"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    USD
                </button>
            </div>

            {/* Value input */}
            <div className="relative w-32">
                <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={formatWithCommas(field.value)}
                    onChange={(e) => onUpdate({ value: parseFromCommas(e.target.value) })}
                    className={cn("h-8 text-sm font-mono bg-background pr-2", isUSD && "border-green-600/50")}
                />
            </div>

            {/* Currency display */}
            <div className="text-right min-w-[100px]">
                <span className={cn("text-xs font-mono", isUSD ? "text-green-600" : "text-muted-foreground")}>
                    {isUSD ? formatUSD(field.value) : formatARS(field.value)}
                </span>
                {isUSD && (
                    <div className="text-[10px] text-muted-foreground font-mono">
                        ≈ {formatARS(arsValue)}
                    </div>
                )}
            </div>

            {/* Remove button */}
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

export default CustomFieldInput;
