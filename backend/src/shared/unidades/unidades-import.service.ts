import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoggerService } from '../../logger/logger.service';
import * as ExcelJS from 'exceljs';
import axios from 'axios';
import {
    PrismaTransaction,
    NormalizedExcelRow,
    ResolvedSaleIds,
    UserInfo
} from '../../common/types';

@Injectable()
export class UnidadesImportService {
    private readonly log = new Logger(UnidadesImportService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLogger: LoggerService
    ) { }

    async importFromExcel(buffer: Buffer, user?: UserInfo) {
        const workbook = new ExcelJS.Workbook();
        // Cast to unknown first to avoid direct 'any', though essentially solving a type definition mismatch
        await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            throw new Error('El archivo Excel no contiene hojas de trabajo.');
        }

        const data: Record<string, unknown>[] = [];
        let headers: string[] = [];

        // Leer filas
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
                // Header row
                if (Array.isArray(row.values)) {
                    // ExcelJS values array is 1-based, index 0 is empty/undefined usually
                    const rowValues = row.values;
                    headers = rowValues.slice(1).map(val => {
                        if (val === null || val === undefined) return '';
                        if (typeof val === 'object') {
                            if ('text' in val) return String((val as any).text);
                            if ('result' in val) return String((val as any).result);
                            return JSON.stringify(val);
                        }
                        return String(val);
                    });
                }
            } else {
                // Data rows
                const rowData: Record<string, unknown> = {};

                if (Array.isArray(row.values)) {
                    const rowValues = row.values;

                    // Map values to headers
                    headers.forEach((header, index) => {
                        // ExcelJS arrays are 1-based
                        let cellValue = rowValues[index + 1];

                        // Manejar enlaces/fórmulas
                        if (cellValue && typeof cellValue === 'object') {
                            if ('text' in cellValue) {
                                cellValue = (cellValue).text;
                            } else if ('result' in cellValue) {
                                cellValue = (cellValue as ExcelJS.CellFormulaValue).result;
                            }
                        }

                        rowData[header] = cellValue;
                    });
                    data.push(rowData);
                }
            }
        });

        this.log.log(`Importing ${data.length} rows from Excel`);

        const results = {
            processed: 0,
            success: 0,
            errors: 0,
            created: 0,
            updated: 0,
            details: [] as Array<{ row: number; error: string }>
        };

        const cache = new Map<string, string>();

        // ⚡ P-002 FIX: Batch processing - procesar en lotes de 50 filas por transacción
        // Reduce overhead de transacciones de N a N/50
        const BATCH_SIZE = 50;
        const totalBatches = Math.ceil(data.length / BATCH_SIZE);

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const startIdx = batchIndex * BATCH_SIZE;
            const batch = data.slice(startIdx, startIdx + BATCH_SIZE);

            await this.processBatchTransaction(batch, startIdx, results, cache, batchIndex, totalBatches);
        }

        if (results.errors === 0) {
            await this.auditLogger.agregarLog({
                motivo: 'Importación Masiva',
                descripcion: `Se importaron ${results.success} unidades exitosamente.`,
                impacto: 'Alto',
                tablaafectada: 'unidades',
                usuarioID: user?.sub || user?.id,
                usuarioemail: user?.email
            });
        } else {
            await this.auditLogger.agregarLog({
                motivo: 'Importación Masiva con Errores',
                descripcion: `Se importaron ${results.success} unidades. Fallaron ${results.errors}.`,
                impacto: 'Medio',
                tablaafectada: 'unidades',
                usuarioID: user?.sub || user?.id,
                usuarioemail: user?.email
            });
        }

        this.log.log(`Import completed. Total: ${results.processed}, Success: ${results.success} (Created: ${results.created}, Updated: ${results.updated}), Errors: ${results.errors}`);
        if (results.errors > 0) {
            this.log.warn(`Error details (first 10): ${JSON.stringify(results.details.slice(0, 10))}`);
        }

        return results;
    }

    private async processBatchTransaction(
        batch: Record<string, unknown>[],
        startIdx: number,
        results: any,
        cache: Map<string, string>,
        batchIndex: number,
        totalBatches: number
    ) {
        try {
            await this.prisma.$transaction(async (tx) => {
                for (const [localIdx, row] of batch.entries()) {
                    const globalIdx = startIdx + localIdx;
                    results.processed++;
                    try {
                        const resultType = await this.processRow(tx, row, cache);
                        results.success++;
                        if (resultType === 'created') results.created++;
                        else if (resultType === 'updated') results.updated++;
                    } catch (rowError) {
                        results.errors++;
                        const errorMessage = rowError instanceof Error ? rowError.message : 'Unknown error';
                        this.log.error(`Error processing row ${globalIdx + 2}: ${errorMessage}`);
                        results.details.push({ row: globalIdx + 2, error: errorMessage });
                        // Continuar con la siguiente fila del batch
                    }
                }
            }, { timeout: 60000 }); // Timeout extendido para batch más grande
        } catch (batchError) {
            // Si falla el batch, marcar todas las filas restantes como error
            const errorMessage = batchError instanceof Error ? batchError.message : 'Unknown error';
            this.log.error(`Error in batch ${batchIndex + 1}/${totalBatches}: ${errorMessage}`);
            for (let i = 0; i < batch.length; i++) {
                const globalIdx = startIdx + i;
                // Avoid duplicating errors if they were already logged inside the transaction loop (though transaction failure usually rolls back)
                // In case of a full transaction failure (e.g. timeout), individual row errors might not have been pushed if inside the transaction scope.
                if (!results.details.some((d: any) => d.row === globalIdx + 2)) {
                    results.processed++;
                    results.errors++;
                    results.details.push({ row: globalIdx + 2, error: `Batch failed: ${errorMessage}` });
                }
            }
        }
    }

    async importFromUrl(url: string, user?: UserInfo) {
        this.log.log(`importFromUrl - URL received: ${url}`);

        // SECURITY: Validate URL to prevent SSRF
        try {
            this.validateExternalUrl(url);
            this.log.log('URL validated successfully');
        } catch (validationError) {
            this.log.error(`SSRF validation error: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
            throw validationError;
        }

        try {
            this.log.log('Downloading file...');
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            this.log.log(`File downloaded, size: ${response.data.length} bytes`);
            return this.importFromExcel(response.data, user);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.log.error(`Error downloading file from URL: ${errorMessage}`);
            throw new Error(`Error al descargar el archivo: ${errorMessage}`);
        }
    }

    /**
     * 🔒 SEGURIDAD: Valida que la URL sea externa y segura
     * Previene ataques SSRF (Server-Side Request Forgery)
     */
    private validateExternalUrl(url: string): void {
        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch {
            throw new Error('URL inválida');
        }

        // Solo permitir HTTP/HTTPS
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Solo se permiten URLs HTTP/HTTPS');
        }

        // Bloquear IPs internas y localhost
        const hostname = parsed.hostname.toLowerCase();
        const blockedPatterns = [
            'localhost',
            '127.',
            '0.0.0.0',
            '10.',
            '192.168.',
            '172.16.', '172.17.', '172.18.', '172.19.',
            '172.20.', '172.21.', '172.22.', '172.23.',
            '172.24.', '172.25.', '172.26.', '172.27.',
            '172.28.', '172.29.', '172.30.', '172.31.',
            '169.254.',
            '::1',
            '[::1]',
            'metadata.google',
            '169.254.169.254', // AWS/GCP metadata
        ];

        for (const pattern of blockedPatterns) {
            if (hostname === pattern || hostname.startsWith(pattern)) {
                throw new Error('URLs internas/locales no están permitidas');
            }
        }

        // Bloquear hosts que resuelven a direcciones internas
        // Nota: Para máxima seguridad, considerar resolver el DNS y validar la IP
    }

    private async processRow(tx: PrismaTransaction, row: Record<string, unknown>, cache: Map<string, string>): Promise<'created' | 'updated'> {
        // Normalize field names (handle case variations)
        const normalizedRow = this.normalizeRowFields(row);


        // 🔒 SEGURIDAD: No loguear datos completos de la fila para proteger información sensible
        // 1. Resolve Dependencies
        const proyectoId = await this.resolveProyecto(tx, normalizedRow, cache);

        const edificioId = await this.resolveEdificio(tx, normalizedRow, proyectoId, cache);

        // 2. Resolve Simple Catalogs
        const [etapaId, tipoId, estadoId, comercialId, patioId, tipoCocheraId, motivoNodispId] = await Promise.all([
            this.resolveCatalogo(tx, 'etapas', 'Nombre', normalizedRow.etapa, cache),
            this.resolveCatalogo(tx, 'tiposUnidad', 'Nombre', normalizedRow.tipo || 'Departamento', cache),
            this.resolveCatalogo(tx, 'estadoComercial', 'NombreEstado', normalizedRow.estado || 'Disponible', cache),
            this.resolveCatalogo(tx, 'comerciales', 'Nombre', normalizedRow.comercial, cache),
            this.resolveCatalogo(tx, 'tiposPatioTerraza', 'Nombre', normalizedRow.tipopatio || 'Patio', cache),
            this.resolveCatalogo(tx, 'tiposCochera', 'Nombre', normalizedRow.tipocochera, cache),
            this.resolveCatalogo(tx, 'motivosNoDisp', 'Nombre', normalizedRow.motivonodisponibilidad, cache)
        ]);

        // 3. Parse Dates
        const fechaReserva = this.parseDate(normalizedRow.fechareserva);
        const fechaFirmaBoleto = this.parseDate(normalizedRow.fechafirmaboleto);
        const fechaPisada = this.parseDate(normalizedRow.fechapisada);
        const fechaPosesion = this.parseDate(normalizedRow.fechaposesion);
        const fechaPosesionPorBoleto = this.parseDate(normalizedRow.fechaposesionporboleto);


        // Validation for PrecioM2
        if (normalizedRow.preciom2 === undefined || normalizedRow.preciom2 === null || String(normalizedRow.preciom2).trim() === '') {
            throw new Error('El campo PrecioM2 es obligatorio.');
        }

        // 4. Create/Find Unit
        // Normalizar SectorId: mayúsculas, sin espacios alrededor de guiones
        const rawSectorId = normalizedRow.sectorid || `${normalizedRow.proyecto}-${normalizedRow.edificiotorre || 'Torre Unica'}-${normalizedRow.numerounidad}`;
        const sectorId = this.normalizeSectorId(rawSectorId);

        let unidadId: string;
        let isNew = false;

        // Lookup using composite unique key (SectorId + ProyectoId)
        const existingUnidad = await tx.unidades.findUnique({
            where: {
                SectorId_ProyectoId: {
                    SectorId: sectorId,
                    ProyectoId: proyectoId
                }
            }
        });

        if (existingUnidad) {
            unidadId = existingUnidad.Id;
            // Update existing unit
            await tx.unidades.update({
                where: { Id: unidadId },
                data: {
                    EdificioId: edificioId,
                    ProyectoId: proyectoId, // Ensure consistency
                    EtapaId: etapaId,
                    TipoUnidadId: tipoId,
                    Piso: String(normalizedRow.piso || ''),
                    NroUnidad: String(normalizedRow.numerounidad || ''),
                    Dormitorio: Number(normalizedRow.dormitorios) || 0,
                    Frente: normalizedRow.frente,
                    Manzana: normalizedRow.manzana,
                    Destino: normalizedRow.destino
                }
            });
        } else {
            const createData: any = {
                SectorId: sectorId,
                ProyectoId: proyectoId,
                Piso: String(normalizedRow.piso || ''),
                NroUnidad: String(normalizedRow.numerounidad || ''),
                Dormitorio: Number(normalizedRow.dormitorios) || 0,
            };
            if (edificioId !== undefined) createData.EdificioId = edificioId;
            if (etapaId !== undefined) createData.EtapaId = etapaId;
            if (tipoId !== undefined) createData.TipoUnidadId = tipoId;
            if (normalizedRow.frente !== undefined) createData.Frente = normalizedRow.frente;
            if (normalizedRow.manzana !== undefined) createData.Manzana = normalizedRow.manzana;
            if (normalizedRow.destino !== undefined) createData.Destino = normalizedRow.destino;

            const newUnidad = await tx.unidades.create({ data: createData });
            unidadId = newUnidad.Id;
            isNew = true;
        }

        // 5. Resolve Cliente Interesado (single cliente)
        const clienteInteresadoId = await this.resolveCliente(tx, normalizedRow.clienteinteresado, cache);

        // 6. Resolve Unidad Comprador (lookup by sectorId pattern)
        const unidadCompradorId = await this.resolveUnidadComprador(tx, normalizedRow.deptartamentocomprador, proyectoId, cache);

        // 7. Upsert Related Data
        await this.upsertMetrics(tx, unidadId, normalizedRow, patioId);

        await this.upsertSalesDetails(tx, unidadId, normalizedRow, {
            estadoId,
            comercialId,
            tipoCocheraId,
            motivoNodispId,
            clienteInteresadoId,
            unidadCompradorId,
            fechaReserva,
            fechaFirmaBoleto,
            fechaPisada,
            fechaPosesion,
            fechaPosesionPorBoleto
        });

        // 8. Process Cliente Titular (comma-separated names -> Clientes + ClientesUnidadesTitulares)
        await this.processClientesTitulares(tx, unidadId, normalizedRow.clientetitular, cache);

        return isNew ? 'created' : 'updated';
    }


    private normalizeRowFields(row: Record<string, unknown>): NormalizedExcelRow {
        const normalized: Record<string, unknown> = {};

        // Field aliases mapping (Excel column -> internal field)
        const fieldAliases: Record<string, string> = {
            'edificio/torre': 'edificiotorre',
            'edificiotorre': 'edificiotorre',
            'sector': 'edificiotorre',
            'numerounidad': 'numerounidad',
            'nºcochera': 'numerounidad',
            'ncochera': 'numerounidad',
            'n°cochera': 'numerounidad',
            'm2cubiertos': 'm2cubierto',
            'm2cubierto': 'm2cubierto',
            'm2semicubiertos': 'm2semicubierto',
            'm2semicubierto': 'm2semicubierto',
            'm2calculo': 'm2calculo',
            'm2cálculo': 'm2calculo',
            'm2 calculo': 'm2calculo',
            'm2 cálculo': 'm2calculo',
            'motivonodisponibilidad': 'motivonodisponibilidad',
            'motivonodisp': 'motivonodisponibilidad',
            'clientetitularboleto': 'clientetitular',
            'clientetitular': 'clientetitular',
            'fechaposesiónporboletocompra-venta': 'fechaposesion',
            'fechaposesionporboletocompraventa': 'fechaposesion',
            'fechaposesion': 'fechaposesion',
            'dptocomprador': 'deptartamentocomprador',
            'deptartamentocomprador': 'deptartamentocomprador',
            'departamentocomprador': 'deptartamentocomprador',
            'tipopatioterraza': 'tipopatio',
            'tipopatio': 'tipopatio',
            'preciousd': 'preciousd',
            'precio': 'preciousd',
            'usdm2': 'usdm2',
            'usd/m2': 'usdm2',
            'preciom2': 'preciom2',
            'precio m2': 'preciom2',
            'precio/m2': 'preciom2',
            'naturaleza': 'naturaleza',
            'fechaposesionporboleto': 'fechaposesionporboleto',
            'fecha posesion por boleto': 'fechaposesionporboleto'
        };

        for (const key of Object.keys(row)) {
            // Normalize key: lowercase, remove spaces, newlines, and special chars
            const normalizedKey = key.toLowerCase()
                .replace(/\s+/g, '')
                .replace(/[áàäâ]/g, 'a')
                .replace(/[éèëê]/g, 'e')
                .replace(/[íìïî]/g, 'i')
                .replace(/[óòöô]/g, 'o')
                .replace(/[úùüû]/g, 'u')
                .replace(/ñ/g, 'n');

            // Apply alias if exists, otherwise use normalized key
            const finalKey = fieldAliases[normalizedKey] || normalizedKey;
            normalized[finalKey] = row[key];
        }
        return normalized as NormalizedExcelRow;
    }

    // Resolve or create a Cliente by nombreApellido
    private async resolveCliente(tx: PrismaTransaction, nombreApellido: string | undefined, cache: Map<string, string>): Promise<string | undefined> {
        if (!nombreApellido || String(nombreApellido).trim() === '') return undefined;

        const cleanName = String(nombreApellido).trim();
        const cacheKey = `clientes:${cleanName}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        // Try to find by nombreApellido
        const existing = await tx.clientes.findFirst({
            where: { NombreApellido: cleanName }
        });

        if (existing) {
            cache.set(cacheKey, existing.Id);
            return existing.Id;
        }

        // Create new cliente
        const created = await tx.clientes.create({
            data: { NombreApellido: cleanName }
        });
        cache.set(cacheKey, created.Id);
        return created.Id;
    }

    // Process comma-separated ClienteTitular field
    private async processClientesTitulares(tx: PrismaTransaction, unidadId: string, clienteTitularStr: string | undefined, cache: Map<string, string>): Promise<void> {
        if (!clienteTitularStr || String(clienteTitularStr).trim() === '') return;

        // Split by comma, trim each name
        const nombres = String(clienteTitularStr)
            .split(',')
            .map(n => n.trim())
            .filter(n => n.length > 0);

        if (nombres.length === 0) return;

        // Calculate percentage (100 / count)
        const porcentaje = 100 / nombres.length;

        // First, delete existing ClientesUnidadesTitulares for this unit
        await tx.clientesUnidadesTitulares.deleteMany({
            where: { IdUnidad: unidadId }
        });

        // Create/resolve each cliente and link to unit
        for (const nombre of nombres) {
            const clienteId = await this.resolveCliente(tx, nombre, cache);
            if (clienteId) {
                await tx.clientesUnidadesTitulares.create({
                    data: {
                        IdCliente: clienteId,
                        IdUnidad: unidadId,
                        Porcentaje: porcentaje
                    }
                });
            }
        }
    }

    // Resolve unidad comprador by looking up sectorid
    private async resolveUnidadComprador(tx: PrismaTransaction, sectorId: string | undefined, proyectoId: string, cache: Map<string, string>): Promise<string | undefined> {
        if (!sectorId || String(sectorId).trim() === '') return undefined;

        const cleanSectorId = this.normalizeSectorId(String(sectorId));
        const cacheKey = `unidad_comprador:${proyectoId}:${cleanSectorId}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        const existing = await tx.unidades.findUnique({
            where: {
                SectorId_ProyectoId: {
                    SectorId: cleanSectorId,
                    ProyectoId: proyectoId
                }
            }
        });

        if (existing) {
            cache.set(cacheKey, existing.Id);
            return existing.Id;
        }

        return undefined; // Unit doesn't exist yet
    }

    private async resolveProyecto(tx: PrismaTransaction, row: NormalizedExcelRow, cache: Map<string, string>): Promise<string> {
        const proyNombre = row.proyecto;
        if (!proyNombre) throw new Error('Nombre de proyecto es requerido');

        // Resolve Naturaleza if provided
        const naturalezaId = await this.resolveNaturaleza(tx, row.naturaleza, cache);

        const cacheKey = `proyectos:${proyNombre}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            // Even if cached, check if we need to update nature
            if (naturalezaId) {
                await tx.proyectos.update({
                    where: { Id: cached },
                    data: { Naturaleza: naturalezaId }
                });
            }
            return cached;
        }

        const existing = await tx.proyectos.findUnique({ where: { Nombre: proyNombre } });
        if (existing) {
            if (naturalezaId && existing.Naturaleza !== naturalezaId) {
                await tx.proyectos.update({
                    where: { Id: existing.Id },
                    data: { Naturaleza: naturalezaId }
                });
            }
            cache.set(cacheKey, existing.Id);
            return existing.Id;
        }

        // Get or create default naturaleza (only if not provided in row)
        let finalNaturalezaId = naturalezaId;
        if (!finalNaturalezaId) {
            const defaultNat = await tx.naturalezas.findFirst({ where: { Nombre: 'Residencial' } });
            if (defaultNat) finalNaturalezaId = defaultNat.Id;
        }

        const created = await tx.proyectos.create({
            data: {
                Nombre: proyNombre,
                TablaNombre: proyNombre.toLowerCase().replace(/ /g, '_'),
                Naturaleza: finalNaturalezaId,
                IdOrg: undefined
            }
        });
        cache.set(cacheKey, created.Id);
        return created.Id;
    }

    private async resolveNaturaleza(tx: PrismaTransaction, naturalezaName: string | undefined, cache: Map<string, string>): Promise<string | undefined> {
        if (!naturalezaName) return undefined;

        const natName = String(naturalezaName).trim();
        const natCacheKey = `naturaleza:${natName}`;
        const cachedNat = cache.get(natCacheKey);
        if (cachedNat) return cachedNat;

        let naturalezaId: string;
        const existingNat = await tx.naturalezas.findFirst({ where: { Nombre: natName } });
        if (existingNat) {
            naturalezaId = existingNat.Id;
        } else {
            const newNat = await tx.naturalezas.create({ data: { Nombre: natName } });
            naturalezaId = newNat.Id;
        }
        cache.set(natCacheKey, naturalezaId);
        return naturalezaId;
    }

    private async resolveEdificio(tx: PrismaTransaction, row: NormalizedExcelRow, proyectoId: string, cache: Map<string, string>): Promise<string> {
        const nombre = row.edificiotorre || 'Torre Unica';
        const cacheKey = `edificios:${proyectoId}:${nombre}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        const existing = await tx.edificios.findFirst({
            where: { NombreEdificio: nombre, ProyectoId: proyectoId }
        });
        if (existing) {
            cache.set(cacheKey, existing.Id);
            return existing.Id;
        }

        const created = await tx.edificios.create({
            data: { NombreEdificio: nombre, ProyectoId: proyectoId }
        });
        cache.set(cacheKey, created.Id);
        return created.Id;
    }

    private async resolveCatalogo(tx: PrismaTransaction, table: string, field: string, value: string | number | undefined, cache: Map<string, string>): Promise<string | undefined> {
        if (value === null || value === undefined || String(value).trim() === '') return undefined;
        const stringValue = String(value).trim();
        const cacheKey = `catalogo:${table}:${field}:${stringValue}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        const existing = await (tx as any)[table].findFirst({ where: { [field]: stringValue } });
        if (existing) {
            cache.set(cacheKey, existing.Id);
            return existing.Id;
        }
        const created = await (tx as any)[table].create({ data: { [field]: stringValue } });
        cache.set(cacheKey, created.Id);
        return created.id;
    }

    private parseDate(dateStr: string | undefined): Date | undefined {
        if (!dateStr || String(dateStr).trim() === '') return undefined;
        const str = String(dateStr).trim();

        // Try DD/MM/YYYY format
        const parts = str.split('/');
        if (parts.length === 3) {
            const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            if (!Number.isNaN(date.getTime())) return date;
        }

        // Try ISO format or other parseable formats
        const parsed = new Date(str);
        if (!Number.isNaN(parsed.getTime())) return parsed;

        return undefined;
    }

    private async upsertMetrics(tx: PrismaTransaction, unidadId: string, row: NormalizedExcelRow, patioId: string | undefined) {
        const data = {
            M2Cubierto: this.parseNumber(row.m2cubierto),
            M2Semicubierto: this.parseNumber(row.m2semicubierto),
            M2Exclusivo: this.parseNumber(row.m2exclusivos),
            M2PatioTerraza: this.parseNumber(row.m2patioterraza),
            M2Comun: this.parseNumber(row.m2comunes),
            M2Total: this.parseNumber(row.m2totales),
            M2Calculo: this.parseNumber(row.m2calculo),
            TipoPatioId: patioId,
            Tamano: row.tamano
        };

        const existing = await tx.unidadesMetricas.findUnique({ where: { UnidadId: unidadId } });
        if (existing) {
            await tx.unidadesMetricas.update({ where: { UnidadId: unidadId }, data });
        } else {
            await tx.unidadesMetricas.create({ data: { ...data, UnidadId: unidadId } });
        }
    }

    private async upsertSalesDetails(
        tx: PrismaTransaction,
        unidadId: string,
        row: NormalizedExcelRow,
        ids: ResolvedSaleIds
    ) {
        const data = {
            PrecioUsd: this.parseNumber(row.preciousd),
            UsdM2: this.parseNumber(row.usdm2),
            EstadoId: ids.estadoId,
            ComercialId: ids.comercialId,
            TipoCocheraId: ids.tipoCocheraId,
            MotivoNoDispId: ids.motivoNodispId,
            ClienteInteresado: ids.clienteInteresadoId,
            UnidadCompradorId: ids.unidadCompradorId,
            FechaReserva: ids.fechaReserva,
            FechaFirmaBoleto: ids.fechaFirmaBoleto,
            FechaPisada: ids.fechaPisada,
            FechaPosesion: ids.fechaPosesion,
            FechaPosesionPorBoleto: ids.fechaPosesionPorBoleto,
            PrecioM2: this.parseNumber(row.preciom2),
            Titular: row.titular,
            Obs: row.observaciones
        };

        const existing = await tx.detallesVenta.findUnique({ where: { UnidadId: unidadId } });
        if (existing) {
            await tx.detallesVenta.update({ where: { UnidadId: unidadId }, data });
        } else {
            await tx.detallesVenta.create({ data: { ...data, UnidadId: unidadId } });
        }
    }

    private parseNumber(value: string | number | null | undefined): number | null {
        if (value === null || value === undefined || String(value).trim() === '') return null;

        let strValue = String(value).trim();

        // Remove currency symbols and whitespace
        strValue = strValue.replace(/[$\s]/g, '');

        // Handle Argentine format: $ 12.000,00 -> 12000.00
        // If contains both . and , assume Argentine format (. = thousands, , = decimal)
        if (strValue.includes('.') && strValue.includes(',')) {
            strValue = strValue.replace(/\./g, '').replace(',', '.');
        } else if (strValue.includes(',') && !strValue.includes('.')) {
            // Only comma present - could be decimal separator
            // Check if it looks like a decimal (1-2 digits after comma)
            const parts = strValue.split(',');
            if (parts.length === 2 && parts[1].length <= 2) {
                strValue = strValue.replace(',', '.');
            } else {
                // Comma is thousands separator
                strValue = strValue.replace(/,/g, '');
            }
        }

        const num = Number(strValue);
        return Number.isNaN(num) ? null : num;
    }

    /**
     * Normaliza el SectorId a un formato estándar:
     * - Convierte a mayúsculas
     * - Elimina espacios alrededor de guiones (" - " -> "-")
     * - Elimina espacios múltiples
     * Ejemplo: "e1 - 202" -> "E1-202"
     */
    private normalizeSectorId(sectorId: string): string {
        if (!sectorId) return sectorId;
        return String(sectorId)
            .trim()
            .toUpperCase()
            .replace(/\s*-\s*/g, '-')  // Elimina espacios alrededor de guiones
            .replace(/\s+/g, '-');      // Reemplaza espacios múltiples con guión
    }
}

