/**
 * Common TypeScript type definitions for the backend application
 */

import { Prisma } from '@prisma/client';

/**
 * Type for Prisma transaction client
 */
export type PrismaTransaction = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Normalized Excel row data structure for unit imports
 */
export interface NormalizedExcelRow {
  proyecto?: string;
  edificiotorre?: string;
  numerounidad?: string;
  piso?: string;
  dormitorios?: number;
  etapa?: string;
  tipo?: string;
  estado?: string;
  comercial?: string;
  m2cubierto?: number;
  m2semicubierto?: number;
  m2exclusivos?: number;
  m2patioterraza?: number;
  m2comunes?: number;
  m2totales?: number;
  m2calculo?: number;
  tipopatio?: string;
  tipocochera?: string;
  preciousd?: number;
  usdm2?: number;
  preciom2?: number;
  fechareserva?: string;
  fechafirmaboleto?: string;
  fechapisada?: string;
  fechaposesion?: string;
  fechaposesionporboleto?: string;
  clienteinteresado?: string;
  clientetitular?: string;
  deptartamentocomprador?: string;
  motivonodisponibilidad?: string;
  frente?: string;
  manzana?: string;
  destino?: string;
  tamano?: string;
  titular?: string;
  observaciones?: string;
  sectorid?: string;
  naturaleza?: string;
}

/**
 * Result of an Excel import operation
 */
export interface ImportResult {
  processed: number;
  success: number;
  errors: number;
  created: number;
  updated: number;
  details: ImportErrorDetail[];
}

/**
 * Detail about a single import error
 */
export interface ImportErrorDetail {
  row: number;
  error: string;
}

/**
 * Resolved IDs for unit sale details
 */
export interface ResolvedSaleIds {
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
  fechaPosesionPorBoleto: Date | null;
}

/**
 * Resolved IDs for unit entity references
 */
export interface ResolvedEntityIds {
  tipoId: string | null;
  edificioId: string | null;
  etapaId: string | null;
}

/**
 * User information for audit logs
 */
export interface UserInfo {
  sub?: string;
  id?: string;
  email?: string;
}

/**
 * Prisma where clause type
 */
export type PrismaWhereClause = Record<string, unknown>;

/**
 * Update data type
 */
export type UpdateData = Record<string, unknown>;

/**
 * Sanitizable value types
 */
export type SanitizableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | SanitizableObject
  | SanitizableValue[];

export interface SanitizableObject {
  [key: string]: SanitizableValue;
}

/**
 * Log message payload
 */
export type LogMessage = string | Record<string, unknown>;

/**
 * Error with code property
 */
export interface ErrorWithCode extends Error {
  code?: string;
}

/**
 * Price adjustment mode
 */
export type PriceAdjustmentMode =
  | 'PERCENTAGE_TOTAL'
  | 'PERCENTAGE_M2'
  | 'FIXED_TOTAL'
  | 'FIXED_M2';

/**
 * Result of price adjustment calculation
 */
export interface PriceAdjustmentResult {
  newPrecioUsd: number;
  newUsdM2: number;
}
