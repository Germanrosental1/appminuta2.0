import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import * as XLSX from 'xlsx';
import axios from 'axios';

@Injectable()
export class UnidadesImportService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: LoggerService
    ) { }

    async importFromExcel(buffer: Buffer, user?: any) {
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
                }, { timeout: 30000 });

                results.success++;
            } catch (error) {
                results.errors++;
                console.error(`Error processing row ${index + 2}:`, error);
                results.details.push({ row: index + 2, error: error.message || 'Unknown error' });
            }
        }

        if (results.errors === 0) {
            await this.logger.agregarLog({
                motivo: 'Importación Masiva',
                descripcion: `Se importaron ${results.success} unidades exitosamente.`,
                impacto: 'Alto',
                tablaafectada: 'unidades',
                usuarioID: user?.sub || user?.id,
                usuarioemail: user?.email
            });
        } else {
            await this.logger.agregarLog({
                motivo: 'Importación Masiva con Errores',
                descripcion: `Se importaron ${results.success} unidades. Fallaron ${results.errors}.`,
                impacto: 'Medio',
                tablaafectada: 'unidades',
                usuarioID: user?.sub || user?.id,
                usuarioemail: user?.email
            });
        }

        return results;
    }

    async importFromUrl(url: string, user?: any) {
        console.log('📥 importFromUrl - URL recibida:', url);

        // 🔒 SEGURIDAD: Validar URL para prevenir SSRF
        try {
            this.validateExternalUrl(url);
            console.log('✅ URL validada correctamente');
        } catch (validationError) {
            console.error('❌ Error de validación SSRF:', validationError.message);
            throw validationError;
        }

        try {
            console.log('📡 Descargando archivo...');
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            console.log('✅ Archivo descargado, tamaño:', response.data.length, 'bytes');
            return this.importFromExcel(response.data, user);
        } catch (error) {
            console.error('❌ Error downloading file from URL:', error.message);
            console.error('Stack:', error.stack);
            throw new Error(`Error al descargar el archivo: ${error.message}`);
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

    private async processRow(tx: any, row: any, cache: Map<string, string>) {
        // Normalize field names (handle case variations)
        const normalizedRow = this.normalizeRowFields(row);

        console.log('\n========== PROCESANDO FILA ==========');
        console.log('📋 Row original:', JSON.stringify(row, null, 2));
        console.log('📋 Row normalizado:', JSON.stringify(normalizedRow, null, 2));

        // 1. Resolve Dependencies
        const proyectoId = await this.resolveProyecto(tx, normalizedRow, cache);
        console.log('🏗️  Proyecto ID:', proyectoId);

        const edificioId = await this.resolveEdificio(tx, normalizedRow, proyectoId, cache);
        console.log('🏢 Edificio ID:', edificioId);

        // 2. Resolve Simple Catalogs
        const [etapaId, tipoId, estadoId, comercialId, patioId, tipoCocheraId, motivoNodispId] = await Promise.all([
            this.resolveCatalogo(tx, 'etapas', 'nombre', normalizedRow.etapa, cache),
            this.resolveCatalogo(tx, 'tiposunidad', 'nombre', normalizedRow.tipo || 'Departamento', cache),
            this.resolveCatalogo(tx, 'estadocomercial', 'nombreestado', normalizedRow.estado || 'Disponible', cache),
            this.resolveCatalogo(tx, 'comerciales', 'nombre', normalizedRow.comercial, cache),
            this.resolveCatalogo(tx, 'tipospatioterraza', 'nombre', normalizedRow.tipopatio || 'Patio', cache),
            this.resolveCatalogo(tx, 'tiposcochera', 'nombre', normalizedRow.tipocochera, cache),
            this.resolveCatalogo(tx, 'motivosnodisp', 'nombre', normalizedRow.motivonodisponibilidad, cache)
        ]);
        console.log('📁 Catálogos - Etapa:', etapaId, '| Tipo:', tipoId, '| Estado:', estadoId, '| Comercial:', comercialId);
        console.log('📁 Catálogos - Patio:', patioId, '| TipoCochera:', tipoCocheraId, '| MotivoNoDisp:', motivoNodispId);

        // 3. Parse Dates
        const fechaReserva = this.parseDate(normalizedRow.fechareserva);
        const fechaFirmaBoleto = this.parseDate(normalizedRow.fechafirmaboleto);
        const fechaPisada = this.parseDate(normalizedRow.fechapisada);
        const fechaPosesion = this.parseDate(normalizedRow.fechaposesion);
        console.log('📅 Fechas - Reserva:', fechaReserva, '| FirmaBoleto:', fechaFirmaBoleto, '| Pisada:', fechaPisada, '| Posesion:', fechaPosesion);

        // 4. Create/Find Unit
        const sectorId = normalizedRow.sectorid || `${normalizedRow.proyecto}-${normalizedRow.edificiotorre || 'Torre Unica'}-${normalizedRow.numerounidad}`;
        console.log('🔑 SectorID:', sectorId);

        let unidadId: string;
        const existingUnidad = await tx.unidades.findUnique({ where: { sectorid: sectorId } });

        if (existingUnidad) {
            unidadId = existingUnidad.id;
            console.log('♻️  Unidad existente encontrada, actualizando:', unidadId);
            // Update existing unit
            await tx.unidades.update({
                where: { id: unidadId },
                data: {
                    edificio_id: edificioId,
                    etapa_id: etapaId,
                    tipounidad_id: tipoId,
                    piso: String(normalizedRow.piso || ''),
                    nrounidad: String(normalizedRow.numerounidad || ''),
                    dormitorios: Number(normalizedRow.dormitorios) || 0,
                    frente: normalizedRow.frente,
                    manzana: normalizedRow.manzana,
                    destino: normalizedRow.destino
                }
            });
        } else {
            const newUnidad = await tx.unidades.create({
                data: {
                    sectorid: sectorId,
                    edificio_id: edificioId,
                    etapa_id: etapaId,
                    tipounidad_id: tipoId,
                    piso: String(normalizedRow.piso || ''),
                    nrounidad: String(normalizedRow.numerounidad || ''),
                    dormitorios: Number(normalizedRow.dormitorios) || 0,
                    frente: normalizedRow.frente,
                    manzana: normalizedRow.manzana,
                    destino: normalizedRow.destino
                }
            });
            unidadId = newUnidad.id;
            console.log('✨ Nueva unidad creada:', unidadId);
        }

        // 5. Resolve Cliente Interesado (single cliente)
        const clienteInteresadoId = await this.resolveCliente(tx, normalizedRow.clienteinteresado, cache);
        console.log('👤 Cliente Interesado ID:', clienteInteresadoId);

        // 6. Resolve Unidad Comprador (lookup by sectorId pattern)
        const unidadCompradorId = await this.resolveUnidadComprador(tx, normalizedRow.deptartamentocomprador, cache);
        console.log('🏠 Unidad Comprador ID:', unidadCompradorId);

        // 7. Upsert Related Data
        console.log('📊 Guardando métricas...');
        await this.upsertMetrics(tx, unidadId, normalizedRow, patioId);

        console.log('💰 Guardando detalles de venta...');
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
            fechaPosesion
        });

        // 8. Process Cliente Titular (comma-separated names -> Clientes + ClientesUnidadesTitulares)
        console.log('👥 Procesando clientes titulares:', normalizedRow.clientetitular);
        await this.processClientesTitulares(tx, unidadId, normalizedRow.clientetitular, cache);

        console.log('✅ Fila procesada exitosamente');
        console.log('=====================================\n');
    }

    // Normalize field names to lowercase for consistent access
    private normalizeRowFields(row: any): Record<string, any> {
        const normalized: Record<string, any> = {};

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
            'usd/m2': 'usdm2'
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
        return normalized;
    }

    // Resolve or create a Cliente by nombreApellido
    private async resolveCliente(tx: any, nombreApellido: string | undefined, cache: Map<string, string>): Promise<string | null> {
        if (!nombreApellido || String(nombreApellido).trim() === '') return null;

        const cleanName = String(nombreApellido).trim();
        const cacheKey = `clientes:${cleanName}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        // Try to find by nombreApellido
        const existing = await tx.Clientes.findFirst({
            where: { nombreApellido: cleanName }
        });

        if (existing) {
            cache.set(cacheKey, existing.id);
            return existing.id;
        }

        // Create new cliente
        const created = await tx.Clientes.create({
            data: { nombreApellido: cleanName }
        });
        cache.set(cacheKey, created.id);
        return created.id;
    }

    // Process comma-separated ClienteTitular field
    private async processClientesTitulares(tx: any, unidadId: string, clienteTitularStr: string | undefined, cache: Map<string, string>): Promise<void> {
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
        await tx.ClientesUnidadesTitulares.deleteMany({
            where: { idUnidad: unidadId }
        });

        // Create/resolve each cliente and link to unit
        for (const nombre of nombres) {
            const clienteId = await this.resolveCliente(tx, nombre, cache);
            if (clienteId) {
                await tx.ClientesUnidadesTitulares.create({
                    data: {
                        idCliente: clienteId,
                        idUnidad: unidadId,
                        porcentaje: porcentaje
                    }
                });
            }
        }
    }

    // Resolve unidad comprador by looking up sectorid
    private async resolveUnidadComprador(tx: any, sectorId: string | undefined, cache: Map<string, string>): Promise<string | null> {
        if (!sectorId || String(sectorId).trim() === '') return null;

        const cleanSectorId = String(sectorId).trim();
        const cacheKey = `unidad_comprador:${cleanSectorId}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        const existing = await tx.unidades.findUnique({
            where: { sectorid: cleanSectorId }
        });

        if (existing) {
            cache.set(cacheKey, existing.id);
            return existing.id;
        }

        return null; // Unit doesn't exist yet
    }

    private async resolveProyecto(tx: any, row: any, cache: Map<string, string>): Promise<string> {
        const proyNombre = row.proyecto;
        if (!proyNombre) throw new Error('Nombre de proyecto es requerido');
        const cacheKey = `proyectos:${proyNombre}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        const existing = await tx.proyectos.findUnique({ where: { nombre: proyNombre } });
        if (existing) {
            cache.set(cacheKey, existing.id);
            return existing.id;
        }

        // Get or create default naturaleza
        let naturalezaId: string | undefined;
        const defaultNat = await tx.naturalezas.findFirst({ where: { nombre: 'Residencial' } });
        if (defaultNat) naturalezaId = defaultNat.id;

        const created = await tx.proyectos.create({
            data: {
                nombre: proyNombre,
                tabla_nombre: proyNombre.toLowerCase().replaceAll(' ', '_'),
                naturaleza: naturalezaId,
                id_org: null // Explicitly null to avoid FK constraint error
            }
        });
        cache.set(cacheKey, created.id);
        return created.id;
    }

    private async resolveEdificio(tx: any, row: any, proyectoId: string, cache: Map<string, string>): Promise<string> {
        const nombre = row.edificiotorre || 'Torre Unica';
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
        if (value === null || value === undefined || String(value).trim() === '') return null;
        const stringValue = String(value).trim();
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
        if (!dateStr || String(dateStr).trim() === '') return null;
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

        return null;
    }

    private async upsertMetrics(tx: any, unidadId: string, row: any, patioId: string | null) {
        const data = {
            m2cubiertos: this.parseNumber(row.m2cubierto),
            m2semicubiertos: this.parseNumber(row.m2semicubierto),
            m2exclusivos: this.parseNumber(row.m2exclusivos),
            m2patioterraza: this.parseNumber(row.m2patioterraza),
            m2comunes: this.parseNumber(row.m2comunes),
            m2totales: this.parseNumber(row.m2totales),
            m2calculo: this.parseNumber(row.m2totales), // Default to m2totales
            tipopatio_id: patioId,
            tamano: row.tamano
        };

        const existing = await tx.unidadesmetricas.findUnique({ where: { unidad_id: unidadId } });
        if (existing) {
            await tx.unidadesmetricas.update({ where: { unidad_id: unidadId }, data });
        } else {
            await tx.unidadesmetricas.create({ data: { ...data, unidad_id: unidadId } });
        }
    }

    private async upsertSalesDetails(
        tx: any,
        unidadId: string,
        row: any,
        ids: {
            estadoId: string | null;
            comercialId: string | null;
            tipoCocheraId: string | null;
            motivoNodispId: string | null;
            clienteInteresadoId: string | null;
            unidadCompradorId: string | null;
            fechaReserva: Date | null;
            fechaFirmaBoleto: Date | null;
            fechaPisada: Date | null;
            fechaPosesion: Date | null;
        }
    ) {
        const data = {
            preciousd: this.parseNumber(row.preciousd),
            usdm2: this.parseNumber(row.usdm2),
            estado_id: ids.estadoId,
            comercial_id: ids.comercialId,
            tipocochera_id: ids.tipoCocheraId,
            motivonodisp_id: ids.motivoNodispId,
            clienteInteresado: ids.clienteInteresadoId,
            unidadcomprador_id: ids.unidadCompradorId,
            fechareserva: ids.fechaReserva,
            fechafirmaboleto: ids.fechaFirmaBoleto,
            fechapisada: ids.fechaPisada,
            fechaposesion: ids.fechaPosesion,
            titular: row.titular,
            obs: row.observaciones
        };

        const existing = await tx.detallesventa.findUnique({ where: { unidad_id: unidadId } });
        if (existing) {
            await tx.detallesventa.update({ where: { unidad_id: unidadId }, data });
        } else {
            await tx.detallesventa.create({ data: { ...data, unidad_id: unidadId } });
        }
    }

    private parseNumber(value: any): number | null {
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
}
