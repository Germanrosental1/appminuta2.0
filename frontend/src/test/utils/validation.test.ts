import { describe, it, expect } from 'vitest';
import {
    unidadSeleccionadaSchema,
    step1Schema,
    step6Schema
} from '@/utils/validation';

describe('Validation Schemas', () => {

    describe('unidadSeleccionadaSchema', () => {
        it('should validate a correct unit', () => {
            const validUnit = {
                id: '123',
                tipo: 'Departamento',
                descripcion: 'Unit 101',
                proyecto: 'Tower A',
                etapa: 'Stage 1',
                sector: 'A',
                precioLista: 100000,
                precioNegociado: 95000,
                tipoDescuento: 'porcentaje',
                valorDescuento: 5,
                m2: 50
            };

            const result = unidadSeleccionadaSchema.safeParse(validUnit);
            expect(result.success).toBe(true);
        });

        it('should fail if precioNegociado is negative', () => {
            const invalidUnit = {
                id: '123',
                tipo: 'Departamento',
                descripcion: 'Unit 101',
                proyecto: 'Tower A',
                etapa: 'Stage 1',
                sector: 'A',
                precioLista: 100000,
                precioNegociado: -100, // Invalid
                tipoDescuento: 'porcentaje',
                valorDescuento: 0,
            };

            const result = unidadSeleccionadaSchema.safeParse(invalidUnit);
            expect(result.success).toBe(false);
        });
    });

    describe('step1Schema', () => {
        it('should require at least one unit in the new model', () => {
            const data = {
                fechaPosesion: '2024-01-01',
                unidades: [] // Empty
            };

            const result = step1Schema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should validate with valid units', () => {
            const data = {
                fechaPosesion: '2024-01-01',
                unidades: [{
                    id: '123',
                    tipo: 'Departamento',
                    descripcion: 'Unit 101',
                    proyecto: 'Tower A',
                    etapa: 'Stage 1',
                    sector: 'A',
                    precioLista: 100000,
                    precioNegociado: 95000,
                    tipoDescuento: 'ninguno',
                    valorDescuento: 0
                }]
            };

            const result = step1Schema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });

    describe('step6Schema (Financing)', () => {
        // Helper to generate a rule
        const createRule = (moneda: 'USD' | 'ARS', saldo: number) => ({
            id: 'rule1',
            moneda,
            saldoFinanciar: saldo,
            numCuotas: 12,
            periodicidad: 'Mensual',
            importeCuota: 1000,
            activa: true
        });

        it('should validate if financing covers 100% of the total in same currency', () => {
            const data = {
                totalFinanciarArs: 100000,
                totalFinanciarUsd: 0,
                monedaA: 'ARS',
                tcValor: 1000,
                reglasFinanciacionA: [createRule('ARS', 100000)], // Covers 100%
                reglasFinanciacionB: []
            };

            const result = step6Schema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should validate currency conversion (USD rule covering ARS debt)', () => {
            // 100 USD * 1000 TC = 100,000 ARS
            const data = {
                totalFinanciarArs: 100000,
                totalFinanciarUsd: 0,
                monedaA: 'ARS',
                tcValor: 1000,
                reglasFinanciacionA: [createRule('USD', 100)],
                reglasFinanciacionB: []
            };

            const result = step6Schema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should fail if financing does not cover the total', () => {
            const data = {
                totalFinanciarArs: 100000,
                totalFinanciarUsd: 0,
                monedaA: 'ARS',
                tcValor: 1000,
                reglasFinanciacionA: [createRule('ARS', 50000)], // Only covers 50%
                reglasFinanciacionB: []
            };

            const result = step6Schema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Debe cubrir el 100%');
            }
        });
    });
});
