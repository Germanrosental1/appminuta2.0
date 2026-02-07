import { Test, TestingModule } from '@nestjs/testing';
import { UnidadesImportService } from './unidades-import.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoggerService } from '../../logger/logger.service';
import axios from 'axios';

// Mock ExcelJS
const mockWorksheet = {
    eachRow: jest.fn(),
};
const mockWorkbook = {
    xlsx: { load: jest.fn().mockResolvedValue({}) },
    worksheets: [mockWorksheet],
};
jest.mock('exceljs', () => {
    return {
        Workbook: jest.fn(() => mockWorkbook),
    };
});

jest.mock('axios');

describe('UnidadesImportService', () => {
    let service: UnidadesImportService;

    const mockPrismaService = {
        $transaction: jest.fn(),
        unidades: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        proyectos: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        edificios: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        naturalezas: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        etapas: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        tiposUnidad: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        estadoComercial: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        comerciales: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        tiposPatioTerraza: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        tiposCochera: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        motivosNoDisp: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        clientes: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        unidadesMetricas: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        detallesVenta: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        clientesUnidadesTitulares: {
            deleteMany: jest.fn(),
            create: jest.fn(),
        },
    };

    const mockLoggerService = {
        agregarLog: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UnidadesImportService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: LoggerService,
                    useValue: mockLoggerService,
                },
            ],
        }).compile();

        service = module.get<UnidadesImportService>(UnidadesImportService);
    });

    afterEach(() => {
        jest.clearAllMocks();
        // Reset mockWorksheet behavior
        mockWorksheet.eachRow.mockReset();
    });

    describe('importFromExcel', () => {
        const mockBuffer = Buffer.from('mock-excel-data');
        const mockUser = { sub: 'user-123', email: 'test@example.com' };

        it('should handle empty Excel file', async () => {
            // Mock empty iteration
            mockWorksheet.eachRow.mockImplementation((cb) => { });

            const result = await service.importFromExcel(mockBuffer, mockUser);

            expect(result.processed).toBe(0);
            expect(result.success).toBe(0);
            expect(result.errors).toBe(0);
        });

        it('should validate required field PrecioM2', async () => {
            // Mock headers and data
            mockWorksheet.eachRow.mockImplementation((callback) => {
                // Header
                callback({ values: [null, 'proyecto', 'numerounidad', 'preciom2'] }, 1);
                // Data row (missing preciom2)
                callback({ values: [null, 'Test Project', '101', null] }, 2);
            });

            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                return callback(mockPrismaService);
            });
            // Mock successful dependency resolution to allow flow to reach validation
            mockPrismaService.proyectos.findUnique.mockResolvedValue({ Id: 'proj-1' });
            mockPrismaService.proyectos.create.mockResolvedValue({ Id: 'proj-1' });

            mockPrismaService.naturalezas.findFirst.mockResolvedValue({ Id: 'nat-1' });
            mockPrismaService.naturalezas.create.mockResolvedValue({ Id: 'nat-1' });

            mockPrismaService.edificios.findFirst.mockResolvedValue({ Id: 'edif-1' });
            mockPrismaService.edificios.create.mockResolvedValue({ Id: 'edif-1' });

            mockPrismaService.etapas.findFirst.mockResolvedValue({ Id: 'etapa-1' });
            mockPrismaService.tiposUnidad.findFirst.mockResolvedValue({ Id: 'tipo-1' });
            mockPrismaService.estadoComercial.findFirst.mockResolvedValue({ Id: 'estado-1' });
            mockPrismaService.comerciales.findFirst.mockResolvedValue({ Id: 'comercial-1' });
            mockPrismaService.tiposPatioTerraza.findFirst.mockResolvedValue({ Id: 'patio-1' });
            mockPrismaService.tiposCochera.findFirst.mockResolvedValue({ Id: 'cochera-1' });
            mockPrismaService.motivosNoDisp.findFirst.mockResolvedValue({ Id: 'motivo-1' });

            const result = await service.importFromExcel(mockBuffer, mockUser);

            expect(result.errors).toBe(1);
            expect(result.details[0].error).toContain('PrecioM2');
        });
    });

    describe('importFromUrl', () => {
        const mockUser = { sub: 'user-123', email: 'test@example.com' };

        describe('SSRF Prevention', () => {
            it('should reject localhost URLs', async () => {
                await expect(
                    service.importFromUrl('http://localhost:3000/file.xlsx', mockUser),
                ).rejects.toThrow('URLs internas/locales no están permitidas');
            });

            it('should reject 127.0.0.1 URLs', async () => {
                await expect(
                    service.importFromUrl('http://127.0.0.1/file.xlsx', mockUser),
                ).rejects.toThrow('URLs internas/locales no están permitidas');
            });

            it('should reject 10.x.x.x private IP addresses', async () => {
                await expect(
                    service.importFromUrl('http://10.0.0.1/file.xlsx', mockUser),
                ).rejects.toThrow('URLs internas/locales no están permitidas');
            });

            it('should reject 192.168.x.x private IP addresses', async () => {
                await expect(
                    service.importFromUrl('http://192.168.1.1/file.xlsx', mockUser),
                ).rejects.toThrow('URLs internas/locales no están permitidas');
            });

            it('should reject 172.16-31.x.x private IP addresses', async () => {
                await expect(
                    service.importFromUrl('http://172.16.0.1/file.xlsx', mockUser),
                ).rejects.toThrow('URLs internas/locales no están permitidas');
            });

            it('should reject AWS metadata endpoint', async () => {
                await expect(
                    service.importFromUrl('http://169.254.169.254/latest/meta-data/', mockUser),
                ).rejects.toThrow('URLs internas/locales no están permitidas');
            });

            it('should reject IPv6 localhost', async () => {
                await expect(
                    service.importFromUrl('http://[::1]/file.xlsx', mockUser),
                ).rejects.toThrow('URLs internas/locales no están permitidas');
            });

            it('should only allow HTTP and HTTPS protocols', async () => {
                await expect(
                    service.importFromUrl('file:///etc/passwd', mockUser),
                ).rejects.toThrow('Solo se permiten URLs HTTP/HTTPS');

                await expect(
                    service.importFromUrl('ftp://example.com/file.xlsx', mockUser),
                ).rejects.toThrow('Solo se permiten URLs HTTP/HTTPS');
            });

            it('should reject invalid URLs', async () => {
                await expect(service.importFromUrl('not-a-url', mockUser)).rejects.toThrow(
                    'URL inválida',
                );
            });

            it('should accept valid external URLs', async () => {
                const validUrl = 'https://example.com/file.xlsx';
                (axios.get as jest.Mock).mockResolvedValue({ data: Buffer.from('data') });

                // Mock mockWorksheet iteration
                mockWorksheet.eachRow.mockImplementation((cb) => { });

                await expect(service.importFromUrl(validUrl, mockUser)).resolves.toBeDefined();
            });
        });

        it('should handle download errors', async () => {
            const validUrl = 'https://example.com/file.xlsx';
            (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

            await expect(service.importFromUrl(validUrl, mockUser)).rejects.toThrow(
                'Error al descargar el archivo',
            );
        });
    });
});
