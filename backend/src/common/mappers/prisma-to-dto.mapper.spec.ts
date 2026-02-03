import { PrismaToDtoMapper } from './prisma-to-dto.mapper';

describe('PrismaToDtoMapper', () => {
  describe('toCamelCase', () => {
    it('should convert simple PascalCase object to camelCase', () => {
      const input = {
        Id: '123',
        Nombre: 'Test',
        Estado: 'Activo',
      };

      const result = PrismaToDtoMapper.toCamelCase(input);

      expect(result).toEqual({
        id: '123',
        nombre: 'Test',
        estado: 'Activo',
      });
    });

    it('should handle nested objects recursively', () => {
      const input = {
        Id: '123',
        Nombre: 'Proyecto Test',
        Edificios: {
          Id: '456',
          NombreEdificio: 'Torre A',
          Proyectos: {
            Id: '789',
            Nombre: 'Edificio Vista Mar',
          },
        },
      };

      const result = PrismaToDtoMapper.toCamelCase(input);

      expect(result).toEqual({
        id: '123',
        nombre: 'Proyecto Test',
        edificios: {
          id: '456',
          nombreEdificio: 'Torre A',
          proyectos: {
            id: '789',
            nombre: 'Edificio Vista Mar',
          },
        },
      });
    });

    it('should handle arrays of objects', () => {
      const input = {
        Proyectos: [
          { Id: '1', Nombre: 'Proyecto 1' },
          { Id: '2', Nombre: 'Proyecto 2' },
        ],
      };

      const result = PrismaToDtoMapper.toCamelCase(input);

      expect(result).toEqual({
        proyectos: [
          { id: '1', nombre: 'Proyecto 1' },
          { id: '2', nombre: 'Proyecto 2' },
        ],
      });
    });

    it('should preserve null and undefined values', () => {
      const input = {
        Id: '123',
        Nombre: null,
        Descripcion: undefined,
      };

      const result = PrismaToDtoMapper.toCamelCase(input);

      expect(result).toEqual({
        id: '123',
        nombre: null,
        descripcion: undefined,
      });
    });

    it('should preserve Date objects', () => {
      const date = new Date('2026-02-02T10:00:00Z');
      const input = {
        Id: '123',
        CreatedAt: date,
      };

      const result = PrismaToDtoMapper.toCamelCase(input);

      expect(result).toEqual({
        id: '123',
        createdAt: date,
      });
      expect((result as any).createdAt).toBeInstanceOf(Date);
    });

    it('should handle BigInt values', () => {
      const input = {
        Id: '123',
        Dni: BigInt(12345678),
      };

      const result = PrismaToDtoMapper.toCamelCase(input);

      expect(result).toEqual({
        id: '123',
        dni: BigInt(12345678),
      });
    });

    it('should handle special cases (Id, CreatedAt, UpdatedAt)', () => {
      const input = {
        Id: '123',
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
        DeletedAt: null,
      };

      const result = PrismaToDtoMapper.toCamelCase(input);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('deletedAt');
    });

    it('should handle empty objects', () => {
      const input = {};
      const result = PrismaToDtoMapper.toCamelCase(input);
      expect(result).toEqual({});
    });

    it('should handle primitives directly', () => {
      expect(PrismaToDtoMapper.toCamelCase('test')).toBe('test');
      expect(PrismaToDtoMapper.toCamelCase(123)).toBe(123);
      expect(PrismaToDtoMapper.toCamelCase(true)).toBe(true);
      expect(PrismaToDtoMapper.toCamelCase(null)).toBe(null);
    });
  });

  describe('toCamelCaseArray', () => {
    it('should transform array of objects', () => {
      const input = [
        { Id: '1', Nombre: 'Proyecto 1', Estado: 'Activo' },
        { Id: '2', Nombre: 'Proyecto 2', Estado: 'Inactivo' },
      ];

      const result = PrismaToDtoMapper.toCamelCaseArray(input);

      expect(result).toEqual([
        { id: '1', nombre: 'Proyecto 1', estado: 'Activo' },
        { id: '2', nombre: 'Proyecto 2', estado: 'Inactivo' },
      ]);
    });

    it('should handle empty array', () => {
      const result = PrismaToDtoMapper.toCamelCaseArray([]);
      expect(result).toEqual([]);
    });

    it('should throw error for non-array input', () => {
      expect(() => {
        PrismaToDtoMapper.toCamelCaseArray({} as any);
      }).toThrow('toCamelCaseArray expects an array');
    });
  });

  describe('toPascalCase', () => {
    it('should convert camelCase object to PascalCase', () => {
      const input = {
        id: '123',
        nombre: 'Test',
        estado: 'Activo',
      };

      const result = PrismaToDtoMapper.toPascalCase(input);

      expect(result).toEqual({
        Id: '123',
        Nombre: 'Test',
        Estado: 'Activo',
      });
    });

    it('should handle nested objects', () => {
      const input = {
        id: '123',
        nombre: 'Proyecto Test',
        edificios: {
          id: '456',
          nombreEdificio: 'Torre A',
        },
      };

      const result = PrismaToDtoMapper.toPascalCase(input);

      expect(result).toEqual({
        Id: '123',
        Nombre: 'Proyecto Test',
        Edificios: {
          Id: '456',
          NombreEdificio: 'Torre A',
        },
      });
    });

    it('should handle special cases (id, createdAt)', () => {
      const input = {
        id: '123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = PrismaToDtoMapper.toPascalCase(input);

      expect(result).toHaveProperty('Id');
      expect(result).toHaveProperty('CreatedAt');
      expect(result).toHaveProperty('UpdatedAt');
    });
  });

  describe('toCamelCaseShallow', () => {
    it('should only transform first level keys', () => {
      const input = {
        Id: '123',
        Nombre: 'Test',
        Edificios: {
          Id: '456',
          NombreEdificio: 'Torre A',
        },
      };

      const result = PrismaToDtoMapper.toCamelCaseShallow(input);

      expect(result).toEqual({
        id: '123',
        nombre: 'Test',
        edificios: {
          Id: '456', // No transformado (shallow)
          NombreEdificio: 'Torre A',
        },
      });
    });
  });

  describe('Real-world Prisma response scenarios', () => {
    it('should handle Proyecto with relations', () => {
      const prismaProyecto = {
        Id: '550e8400-e29b-41d4-a716-446655440000',
        Nombre: 'Edificio Vista Mar',
        Descripcion: 'Proyecto residencial de lujo',
        Activo: true,
        CreatedAt: new Date('2026-01-01'),
        UpdatedAt: new Date('2026-02-02'),
        Edificios: [
          {
            Id: 'edificio-1',
            NombreEdificio: 'Torre Norte',
            ProyectoId: '550e8400-e29b-41d4-a716-446655440000',
          },
        ],
      };

      const result = PrismaToDtoMapper.toCamelCase(prismaProyecto);

      expect(result).toMatchObject({
        id: '550e8400-e29b-41d4-a716-446655440000',
        nombre: 'Edificio Vista Mar',
        descripcion: 'Proyecto residencial de lujo',
        activo: true,
        edificios: [
          {
            id: 'edificio-1',
            nombreEdificio: 'Torre Norte',
            proyectoId: '550e8400-e29b-41d4-a716-446655440000',
          },
        ],
      });
    });

    it('should handle Unidad with nested DetallesVenta', () => {
      const prismaUnidad = {
        Id: 'unidad-1',
        SectorId: 'A-301',
        Piso: '3',
        NroUnidad: '301',
        TiposUnidad: {
          Id: 'tipo-1',
          Nombre: 'Departamento',
        },
        DetallesVenta_DetallesVenta_UnidadIdToUnidades: {
          PrecioUsd: 150000,
          UsdM2: 2500,
          EstadoComercial: {
            Id: 'estado-1',
            NombreEstado: 'Disponible',
          },
        },
      };

      const result = PrismaToDtoMapper.toCamelCase(prismaUnidad);

      expect(result).toMatchObject({
        id: 'unidad-1',
        sectorId: 'A-301',
        piso: '3',
        nroUnidad: '301',
        tiposUnidad: {
          id: 'tipo-1',
          nombre: 'Departamento',
        },
        detallesVenta_DetallesVenta_UnidadIdToUnidades: {
          precioUsd: 150000,
          usdM2: 2500,
          estadoComercial: {
            id: 'estado-1',
            nombreEstado: 'Disponible',
          },
        },
      });
    });
  });
});
