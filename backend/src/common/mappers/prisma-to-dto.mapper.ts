/**
 * Mapper centralizado para transformar objetos Prisma (PascalCase)
 * a DTOs de API (camelCase)
 *
 * ESTRATEGIA:
 * - Transformación recursiva para objetos anidados
 * - Preserva tipos especiales (Date, BigInt, null, undefined)
 * - Maneja arrays
 * - Type-safe con generics de TypeScript
 *
 * USO:
 * ```typescript
 * const proyectos = await prisma.proyectos.findMany();
 * return PrismaToDtoMapper.toCamelCaseArray<ProyectoResponseDto>(proyectos);
 * ```
 */
export class PrismaToDtoMapper {
  /**
   * Convierte un objeto de PascalCase a camelCase recursivamente
   *
   * @param obj - Objeto Prisma en PascalCase
   * @returns Objeto transformado a camelCase
   */
  static toCamelCase<T>(obj: any): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Manejar arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.toCamelCase(item)) as any;
    }

    // Preservar Date, BigInt y otros tipos especiales
    if (
      obj instanceof Date ||
      typeof obj === 'string' ||
      typeof obj === 'number' ||
      typeof obj === 'boolean' ||
      typeof obj === 'bigint'
    ) {
      return obj as any;
    }

    // Solo procesar objetos planos
    if (typeof obj !== 'object') {
      return obj;
    }

    // Transformar objeto
    const result: any = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Convertir clave a camelCase
        const camelKey = this.toCamelCaseString(key);
        // Recursivamente transformar el valor
        result[camelKey] = this.toCamelCase(obj[key]);
      }
    }

    return result as T;
  }

  /**
   * Helper para transformar arrays (findMany)
   *
   * @param arr - Array de objetos Prisma
   * @returns Array transformado a camelCase
   */
  static toCamelCaseArray<T>(arr: any[]): T[] {
    if (!Array.isArray(arr)) {
      throw new TypeError('toCamelCaseArray expects an array');
    }
    return arr.map((item) => this.toCamelCase<T>(item));
  }

  /**
   * Convierte string de PascalCase a camelCase
   *
   * @param str - String en PascalCase
   * @returns String en camelCase
   *
   * @example
   * toCamelCaseString('NombreProyecto') // 'nombreProyecto'
   * toCamelCaseString('Id') // 'id'
   * toCamelCaseString('CreatedAt') // 'createdAt'
   */
  private static toCamelCaseString(str: string): string {
    if (!str || str.length === 0) {
      return str;
    }

    // Casos especiales que deben transformarse completamente
    const specialCases: Record<string, string> = {
      Id: 'id',
      ID: 'id',
      UUID: 'uuid',
      URL: 'url',
      JSON: 'json',
      CreatedAt: 'createdAt',
      UpdatedAt: 'updatedAt',
      DeletedAt: 'deletedAt',
    };

    if (specialCases[str]) {
      return specialCases[str];
    }

    // Conversión estándar: PascalCase → camelCase
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Conversión inversa: camelCase → PascalCase
   * Útil para DTOs de entrada (CreateDto, UpdateDto)
   *
   * @param obj - Objeto en camelCase
   * @returns Objeto transformado a PascalCase
   */
  static toPascalCase<T>(obj: any): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.toPascalCase(item)) as any;
    }

    if (
      obj instanceof Date ||
      typeof obj === 'string' ||
      typeof obj === 'number' ||
      typeof obj === 'boolean' ||
      typeof obj === 'bigint'
    ) {
      return obj as any;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    const result: any = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const pascalKey = this.toPascalCaseString(key);
        result[pascalKey] = this.toPascalCase(obj[key]);
      }
    }

    return result as T;
  }

  /**
   * Convierte string de camelCase a PascalCase
   */
  private static toPascalCaseString(str: string): string {
    if (!str || str.length === 0) {
      return str;
    }

    // Casos especiales inversos
    const specialCases: Record<string, string> = {
      id: 'Id',
      uuid: 'UUID',
      url: 'URL',
      json: 'JSON',
      createdAt: 'CreatedAt',
      updatedAt: 'UpdatedAt',
      deletedAt: 'DeletedAt',
    };

    if (specialCases[str]) {
      return specialCases[str];
    }

    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Transforma solo las claves del primer nivel (shallow)
   * Útil cuando no quieres transformar relaciones anidadas
   */
  static toCamelCaseShallow<T>(obj: any): T {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj;
    }

    const result: any = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = this.toCamelCaseString(key);
        result[camelKey] = obj[key]; // No transformar recursivamente
      }
    }

    return result as T;
  }
}
