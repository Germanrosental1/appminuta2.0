import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CustomFieldInput } from './CustomFieldInput';
import type { CustomField } from '@/types/database';

interface CustomFieldsSectionProps {
    fields: CustomField[];
    onAdd: () => void;
    onUpdate: (fieldId: string, updates: Partial<CustomField>) => void;
    onRemove: (fieldId: string) => void;
    dolarRate?: number; // Exchange rate for USD -> ARS
}

export function CustomFieldsSection({
    fields,
    onAdd,
    onUpdate,
    onRemove,
    dolarRate = 1475
}: Readonly<CustomFieldsSectionProps>) {
    if (fields.length === 0) {
        return (
            <div className="pt-3 border-t border-dashed">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onAdd}
                    className="w-full h-8 text-xs border-dashed text-muted-foreground hover:text-foreground"
                >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar campo manual
                </Button>
            </div>
        );
    }

    return (
        <div className="pt-3 border-t border-dashed space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Campos Adicionales
            </p>

            {fields.map((field) => (
                <CustomFieldInput
                    key={field.id}
                    field={field}
                    onUpdate={(updates) => onUpdate(field.id, updates)}
                    onRemove={() => onRemove(field.id)}
                    dolarRate={dolarRate}
                />
            ))}

            <Button
                variant="outline"
                size="sm"
                onClick={onAdd}
                className="w-full h-8 text-xs border-dashed text-muted-foreground hover:text-foreground"
            >
                <Plus className="h-3 w-3 mr-1" />
                Agregar campo
            </Button>
        </div>
    );
}

export default CustomFieldsSection;
