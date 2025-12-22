import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class UnidadesImportService {
    constructor(private readonly prisma: PrismaService) { }

    async importFromExcel(buffer: Buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer', raw: false });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data: any[] = XLSX.utils.sheet_to_json(sheet, { raw: false });

        const results = {
            processed: 0,
            success: 0,
            errors: 0,
            details: []
        };

        const cache = new Map<string, string>();

        for (const [index, row] of data.entries()) {
            results.processed++;
            try {
                await this.prisma.$transaction(async (tx) => {
                    await this.processRow(tx, row, cache);
                }, { timeout: 20000 });

                results.success++;
            } catch (error) {
                results.errors++;
                console.error(`Error processing row ${index + 2}:`, error);
                results.details.push({ row: index + 2, error: error.message || 'Unknown error' });
            }
        }

        return results;
    }

    private async processRow(tx: any, row: any, cache: Map<string, string>) {
        // 1. Resolve Dependencies
        const naturalezaId = await this.resolveNaturaleza(tx, row['natdelproyecto'], cache);
        const proyectoId = await this.resolveProyecto(tx, row, naturalezaId, cache);
        const edificioId = await this.resolveEdificio(tx, row, proyectoId, cache);

        // 2. Resolve Simple Catalogs
        const [etapaId, tipoId, estadoId, comercialId, patioId] = await Promise.all([
            this.resolveCatalogo(tx, 'etapas', 'nombre', row['etapa'], cache),
            this.resolveCatalogo(tx, 'tiposunidad', 'nombre', row['tipo'] || 'Departamento', cache),
            this.resolveCatalogo(tx, 'estadocomercial', 'nombreestado', row['estado'] || 'Disponible', cache),
            this.resolveCatalogo(tx, 'comerciales', 'nombre', row['comercial'], cache),
            this.resolveCatalogo(tx, 'tipospatioterraza', 'nombre', row['patioterraza'] || 'Patio', cache)
        ]);

        // 3. Parse Dates
        const fechaPosesion = this.parseDate(row['fechaposesionporboletocompraventa']);

        // 4. Create/Find Unit
        const sectorId = row['sectorid'] || `${row['proyecto'] || row['proyecto_id']}-${row['edificiotorre'] || 'Torre Unica'}-${row['nrounidad']}`;

        let unidadId: string;
        const existingUnidad = await tx.unidades.findUnique({ where: { sectorid: sectorId } });

        if (existingUnidad) {
            unidadId = existingUnidad.id;
        } else {
            const newUnidad = await tx.unidades.create({
                data: {
                    sectorid: sectorId,
                    edificio_id: edificioId,
                    etapa_id: etapaId,
                    tipounidad_id: tipoId,
                    piso: String(row['piso'] || ''),
                    nrounidad: String(row['nrounidad'] || ''),
                    dormitorios: Number(row['dormitorios']) || 0,
                    frente: row['frente'],
                    manzana: row['manzana'],
                    destino: row['destino']
                }
            });
            unidadId = newUnidad.id;
        }

        // 5. Upsert Related Data
        await this.upsertMetrics(tx, unidadId, row, patioId);
        await this.upsertSalesDetails(tx, unidadId, row, estadoId, comercialId, fechaPosesion);
    }

    private async resolveNaturaleza(tx: any, nombre: string, cache: Map<string, string>): Promise<string | undefined> {
        if (!nombre) return undefined;
        const cacheKey = `naturalezas:${nombre}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        const existing = await tx.naturalezas.findFirst({ where: { nombre } });
        if (existing) {
            cache.set(cacheKey, existing.id);
            return existing.id;
        }
        const created = await tx.naturalezas.create({ data: { nombre } });
        cache.set(cacheKey, created.id);
        return created.id;
    }

    private async resolveProyecto(tx: any, row: any, naturalezaId: string | undefined, cache: Map<string, string>): Promise<string> {
        const proyNombre = row['proyecto'] || row['proyecto_id'];
        if (!proyNombre) throw new Error('Nombre de proyecto es requerido');
        const cacheKey = `proyectos:${proyNombre}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        const existing = await tx.proyectos.findUnique({ where: { nombre: proyNombre } });
        if (existing) {
            cache.set(cacheKey, existing.id);
            return existing.id;
        }

        let finalNaturalezaId = naturalezaId;
        if (!finalNaturalezaId) {
            const defaultNat = await tx.naturalezas.findFirst({ where: { nombre: 'Residencial' } });
            if (defaultNat) finalNaturalezaId = defaultNat.id;
        }

        const created = await tx.proyectos.create({
            data: {
                nombre: proyNombre,
                tabla_nombre: proyNombre.toLowerCase().replaceAll(' ', '_'),
                naturaleza: finalNaturalezaId
            }
        });
        cache.set(cacheKey, created.id);
        return created.id;
    }

    private async resolveEdificio(tx: any, row: any, proyectoId: string, cache: Map<string, string>): Promise<string> {
        const nombre = row['edificiotorre'] || 'Torre Unica';
        const cacheKey = `edificios:${proyectoId}:${nombre}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        const existing = await tx.edificios.findFirst({
            where: { nombreedificio: nombre, proyecto_id: proyectoId }
        });
        if (existing) {
            cache.set(cacheKey, existing.id);
            return existing.id;
        }

        const created = await tx.edificios.create({
            data: { nombreedificio: nombre, proyecto_id: proyectoId }
        });
        cache.set(cacheKey, created.id);
        return created.id;
    }

    private async resolveCatalogo(tx: any, table: string, field: string, value: string | number, cache: Map<string, string>): Promise<string | null> {
        if (value === null || value === undefined) return null;
        const stringValue = String(value);
        const cacheKey = `catalogo:${table}:${field}:${stringValue}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        const existing = await tx[table].findFirst({ where: { [field]: stringValue } });
        if (existing) {
            cache.set(cacheKey, existing.id);
            return existing.id;
        }
        const created = await tx[table].create({ data: { [field]: stringValue } });
        cache.set(cacheKey, created.id);
        return created.id;
    }

    private parseDate(dateStr: string | undefined): Date | null {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length !== 3) return null;
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }

    private async upsertMetrics(tx: any, unidadId: string, row: any, patioId: string | null) {
        const data = {
            m2exclusivos: row['m2exclusivos'],
            m2patioterraza: row['m2patioterraza'],
            m2comunes: row['m2comunes'],
            m2totales: row['m2totales'],
            tipopatio_id: patioId,
            tamano: row['tamano']
        };

        const existing = await tx.unidadesmetricas.findUnique({ where: { unidad_id: unidadId } });
        if (existing) {
            await tx.unidadesmetricas.update({ where: { unidad_id: unidadId }, data });
        } else {
            await tx.unidadesmetricas.create({ data: { ...data, unidad_id: unidadId } });
        }
    }

    private async upsertSalesDetails(tx: any, unidadId: string, row: any, estadoId: string | null, comercialId: string | null, fechaPosesion: Date | null) {
        const data = {
            preciousd: row['preciousd'],
            usdm2: row['usdm2'],
            estado_id: estadoId,
            comercial_id: comercialId,
            fechaposesion: fechaPosesion,
            obs: row['obs']
        };

        const existing = await tx.detallesventa.findUnique({ where: { unidad_id: unidadId } });
        if (existing) {
            await tx.detallesventa.update({ where: { unidad_id: unidadId }, data });
        } else {
            await tx.detallesventa.create({ data: { ...data, unidad_id: unidadId } });
        }
    }
}
