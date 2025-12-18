import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
    id?: string;
    value: number | undefined | null;
    onChange: (value: number) => void;
    onBlur?: () => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    min?: number;
    max?: number;
    prefix?: string; // Ej: "$" o "USD"
    suffix?: string; // Ej: "ARS" o "%"
    decimals?: number; // Número de decimales (default: 2)
    error?: boolean;
}

/**
 * Componente de input para valores monetarios/numéricos
 * Muestra el valor formateado con separador de miles (punto) y decimales (coma)
 * Formato: 10.000,50 (formato argentino)
 */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
    id,
    value,
    onChange,
    onBlur,
    placeholder = "0,00",
    disabled = false,
    className,
    min,
    max,
    prefix,
    suffix,
    decimals = 2,
    error = false,
}) => {
    // Estado para el valor mostrado (formateado)
    const [displayValue, setDisplayValue] = useState<string>('');
    const [isFocused, setIsFocused] = useState(false);
    const lastExternalValueRef = React.useRef<number | undefined | null>(value);
    const formatTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Formatear número a string con formato argentino
    const formatNumber = useCallback((num: number | undefined | null): string => {
        if (num === undefined || num === null || Number.isNaN(num) || num === 0) return '';

        // Permitir decimales variables (no forzar siempre 2 decimales)
        return num.toLocaleString('es-AR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals,
        });
    }, [decimals]);

    // Parsear string formateado a número
    const parseFormattedNumber = (str: string): number => {
        if (!str || str.trim() === '') return 0;

        // Remover prefijo y sufijo si existen
        let cleanStr = str;
        if (prefix) cleanStr = cleanStr.replace(prefix, '');
        if (suffix) cleanStr = cleanStr.replace(suffix, '');

        // Limpiar: quitar puntos de miles y reemplazar coma por punto para decimales
        cleanStr = cleanStr.trim()
            .replaceAll('.', '')  // Quitar separadores de miles
            .replace(',', '.');   // Convertir coma decimal a punto

        const parsed = Number.parseFloat(cleanStr);
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    // Inicializar displayValue al montar el componente
    useEffect(() => {
        setDisplayValue(formatNumber(value));
        lastExternalValueRef.current = value;
    }, []); // Solo al montar

    // Sincronizar el valor externo con el display solo cuando no está enfocado
    useEffect(() => {
        if (!isFocused && value !== lastExternalValueRef.current) {
            setDisplayValue(formatNumber(value));
            lastExternalValueRef.current = value;
        }
    }, [value, formatNumber, isFocused]);

    // Manejar cambio de input - fluido con formateo automático rápido
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // Permitir solo números, puntos, comas y guiones
        const validChars = /^[\d.,-]*$/;
        if (!validChars.test(inputValue)) return;

        // Limpiar timeout anterior
        if (formatTimeoutRef.current) {
            clearTimeout(formatTimeoutRef.current);
        }

        // Mostrar exactamente lo que el usuario escribe
        setDisplayValue(inputValue);

        // Si el campo está vacío, notificar 0
        if (inputValue.trim() === '') {
            lastExternalValueRef.current = 0;
            onChange(0);
            return;
        }

        // Parsear el valor ingresado
        const numericValue = parseFormattedNumber(inputValue);

        // Validar min/max
        let finalValue = numericValue;
        if (min !== undefined && numericValue < min) finalValue = min;
        if (max !== undefined && numericValue > max) finalValue = max;

        // Actualizar la referencia del último valor externo
        lastExternalValueRef.current = finalValue;

        // Notificar el cambio
        onChange(finalValue);

        // Formatear después de 200ms de inactividad
        formatTimeoutRef.current = setTimeout(() => {
            setDisplayValue(formatNumber(finalValue));
        }, 500);
    };

    // Manejar focus
    const handleFocus = () => {
        setIsFocused(true);
    };

    // Manejar blur - formatear solo al salir del campo
    const handleBlur = () => {
        // Limpiar timeout si existe
        if (formatTimeoutRef.current) {
            clearTimeout(formatTimeoutRef.current);
        }

        setIsFocused(false);

        // Formatear el valor
        const numericValue = parseFormattedNumber(displayValue);
        setDisplayValue(formatNumber(numericValue));

        // Llamar al onBlur externo si existe
        onBlur?.();
    };

    // Cleanup del timeout al desmontar
    useEffect(() => {
        return () => {
            if (formatTimeoutRef.current) {
                clearTimeout(formatTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="relative">
            {prefix && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {prefix}
                </span>
            )}
            <Input
                id={id}
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                    prefix && "pl-8",
                    suffix && "pr-12",
                    error && "border-destructive",
                    className
                )}
                onWheel={(e) => e.currentTarget.blur()} // Evitar cambios con la rueda del mouse
            />
            {suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {suffix}
                </span>
            )}
        </div>
    );
};

/**
 * Función auxiliar para formatear valores de moneda en displays (no inputs)
 * Uso: formatCurrency(10000.5) => "10.000,50"
 */
export const formatCurrency = (
    value: number | undefined | null,
    decimals: number = 2
): string => {
    if (value === undefined || value === null || Number.isNaN(value)) return "0,00";

    return value.toLocaleString('es-AR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
};

/**
 * Función auxiliar para formatear valores con prefijo de moneda
 * Uso: formatCurrencyWithSymbol(10000.5, "USD") => "USD 10.000,50"
 */
export const formatCurrencyWithSymbol = (
    value: number | undefined | null,
    symbol: string = "$",
    decimals: number = 2
): string => {
    return `${symbol} ${formatCurrency(value, decimals)}`;
};
