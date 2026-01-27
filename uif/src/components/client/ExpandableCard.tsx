import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
    }).format(value);
};

// Expandable Card for detailed income categories
interface ExpandableCardProps {
    title: string;
    weight: number;
    onWeightChange: (value: number) => void;
    subtotal: number;
    children: React.ReactNode;
    className?: string;
    sourceDocuments?: { id: string, filename: string, formattedValue?: string }[];
}

export default function ExpandableCard({ title, weight, onWeightChange, subtotal, children, className, sourceDocuments }: ExpandableCardProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Card className={`analysis-card card-income flex flex-col cursor-pointer hover:border-primary/50 transition-all hover:shadow-md ${className || ''}`}>
                    <CardHeader className="py-4 px-4 flex-row items-center justify-between gap-2 pb-2">
                        <CardTitle className="text-lg font-bold text-foreground/90">{title}</CardTitle>
                        <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-md">
                            <span className="text-xs font-medium text-muted-foreground">Ponderación:</span>
                            <span className="text-xs font-bold">{weight}%</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-end">
                        <div className="pt-2 text-right">
                            <span className="text-xs font-medium text-muted-foreground block mb-0.5">Subtotal Computable</span>
                            <span className="text-2xl font-bold font-mono text-primary tracking-tight">{formatCurrency(subtotal)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-3 text-center border-t pt-2 w-full">Click para ver y editar detalles</p>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between mr-8">
                        <span className="text-xl">Detalle de {title}</span>
                        <div className="flex items-center gap-2 bg-secondary/30 p-2 rounded-lg border">
                            <span className="text-sm font-medium text-muted-foreground">Ponderación:</span>
                            <div className="flex items-center gap-1">
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={weight}
                                    autoFocus={false}
                                    onChange={(e) => {
                                        const val = Number(e.target.value.replace(/[^0-9]/g, ''));
                                        onWeightChange(Math.min(100, Math.max(0, val)));
                                    }}
                                    className="w-12 h-7 text-sm text-center p-0 bg-background"
                                />
                                <span className="text-sm text-foreground">%</span>
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {/* Source Documents List - Desglose */}
                {sourceDocuments && sourceDocuments.length > 0 && (
                    <div className="bg-secondary/10 rounded-lg p-3 text-sm border mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Desglose por Documento ({sourceDocuments.length})</p>
                        </div>
                        <div className="space-y-2">
                            {sourceDocuments.map(doc => (
                                <div key={doc.id} className="flex justify-between items-center text-sm p-2 bg-background rounded-md border shadow-sm">
                                    <span className="truncate max-w-[300px] text-muted-foreground flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div>
                                        {doc.filename}
                                    </span>
                                    {doc.formattedValue && (
                                        <span className="font-mono font-medium">{doc.formattedValue}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="py-4 space-y-4">
                    {children}
                </div>
                <div className="flex justify-end pt-4 border-t bg-secondary/10 p-4 -mx-6 -mb-6 mt-4 rounded-b-lg">
                    <div className="text-right">
                        <span className="text-sm font-medium text-muted-foreground mr-3">Total Computable:</span>
                        <span className="text-2xl font-bold font-mono text-primary">{formatCurrency(subtotal)}</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
