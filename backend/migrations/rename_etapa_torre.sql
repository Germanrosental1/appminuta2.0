-- Renombrar columna "etapa / torre" a "etapa_torre" para compatibilidad con Prisma
ALTER TABLE public.gastosgenerales 
RENAME COLUMN "etapa / torre" TO etapa_torre;
