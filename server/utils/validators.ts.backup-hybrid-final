import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  CLIENT_TYPES,
  TAX_PERIODICITIES,
  TAX_RULES,
  validateTaxAssignmentInput,
  type ClientType,
  type TaxPeriodicity,
} from '@shared/tax-rules';

const CLIENT_TYPE_VALUES = [...CLIENT_TYPES] as [ClientType, ...ClientType[]];
const PERIODICITY_VALUES = [...TAX_PERIODICITIES] as [TaxPeriodicity, ...TaxPeriodicity[]];

const normalizeOptionalString = (maxLength?: number) =>
  z.preprocess(
    (value) => {
      if (value === null) {
        return null;
      }
      if (typeof value !== 'string') {
        return value;
      }
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    },
    (maxLength ? z.string().max(maxLength) : z.string()).or(z.null()).optional(),
  );

const clientTypeSchema = z
  .string()
  .min(1)
  .transform((value) => value.trim().toUpperCase())
  .refine((value): value is ClientType => CLIENT_TYPES.includes(value as ClientType), {
    message: `Tipo de cliente inválido. Valores permitidos: ${CLIENT_TYPES.join(', ')}`,
  });

const periodicitySchema = z
  .string()
  .min(1)
  .transform((value) => value.trim().toUpperCase())
  .refine((value): value is TaxPeriodicity => TAX_PERIODICITIES.includes(value as TaxPeriodicity), {
    message: `Periodicidad inválida. Valores permitidos: ${TAX_PERIODICITIES.join(', ')}`,
  });

const dateStringSchema = z
  .string()
  .min(1, { message: 'La fecha es obligatoria' })
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Fecha inválida' });

export const registerSchema = z.object({
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres').trim(),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  roleId: z.string().optional(),
});

export const userCreateSchema = z.object({
  username: z.string().min(3).trim(),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.string().optional(),
});

export const smtpConfigSchema = z.object({
  host: z.string().min(1).max(200),
  port: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .refine((n) => Number.isFinite(n) && n > 0 && n <= 65535, { message: 'Puerto SMTP inválido' }),
  user: z.string().min(1),
  pass: z.string().min(1),
});

export const smtpAccountSchema = z.object({
  nombre: z.string().min(1),
  host: z.string().min(1).max(200),
  port: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .refine((n) => Number.isFinite(n) && n > 0 && n <= 65535),
  user: z.string().min(1),
  password: z.string().min(1),
  isPredeterminada: z.boolean().optional(),
  activa: z.boolean().optional(),
});

export const githubConfigSchema = z.object({
  repoUrl: z.string().min(1).max(500),
});

const clientBaseSchema = z.object({
  razonSocial: z.string().trim().min(1, 'La razón social es obligatoria'),
  nifCif: z.string().trim().min(1, 'El NIF/CIF es obligatorio'),
  tipo: clientTypeSchema,
  email: normalizeOptionalString().refine(
    (value) => !value || z.string().email().safeParse(value).success,
    'Email inválido',
  ),
  telefono: normalizeOptionalString(50),
  direccion: normalizeOptionalString(255),
  responsableAsignado: normalizeOptionalString(),
  isActive: z.boolean().optional(),
  fechaAlta: normalizeOptionalString(),
  fechaBaja: normalizeOptionalString(),
  notes: normalizeOptionalString(),
});

export const clientCreateSchema = clientBaseSchema.extend({
  responsableAsignado: normalizeOptionalString(),
});

export const clientUpdateSchema = clientBaseSchema.partial();

const taxAssignmentShape = z.object({
  taxModelCode: z.string().trim().min(1, 'El código de modelo es obligatorio'),
  periodicity: periodicitySchema,
  startDate: dateStringSchema,
  endDate: normalizeOptionalString(),
  activeFlag: z.boolean().optional(),
  notes: normalizeOptionalString(),
});

const validateTaxAssignmentDates = (data: {
  startDate?: string;
  endDate?: string | null;
}, ctx: z.RefinementCtx) => {
  if (data.endDate) {
    const start = data.startDate ? Date.parse(data.startDate) : NaN;
    const end = Date.parse(data.endDate);
    if (Number.isNaN(end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'Fecha de baja inválida',
      });
    } else if (!Number.isNaN(start) && end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'La fecha de baja debe ser posterior a la fecha de alta',
      });
    }
  }
};

export const taxAssignmentCreateSchema = taxAssignmentShape.superRefine((data, ctx) =>
  validateTaxAssignmentDates({ startDate: data.startDate, endDate: data.endDate ?? undefined }, ctx)
);

export const taxAssignmentUpdateSchema = taxAssignmentShape
  .partial()
  .superRefine((data, ctx) =>
    validateTaxAssignmentDates(
      { startDate: data.startDate, endDate: data.endDate ?? undefined },
      ctx
    )
  );

export const taskCreateSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  fechaVencimiento: z.string().optional(),
  asignadoA: z.string().optional(),
  clienteId: z.string().optional(),
  visibilidad: z.string().optional(),
});

export function validateTaxAssignmentAgainstRules(
  clientType: ClientType,
  payload: { taxModelCode: string; periodicity: TaxPeriodicity }
) {
  validateTaxAssignmentInput({
    clientType,
    taxModelCode: payload.taxModelCode,
    periodicity: payload.periodicity,
  });

  // Reglas estrictas opcionales por entorno
  const enforce303Monthly = String(process.env.ENFORCE_303_MONTHLY || '').toLowerCase() === 'true';
  if (enforce303Monthly && payload.taxModelCode === '303' && payload.periodicity !== 'MENSUAL') {
    throw new Error('El modelo 303 debe configurarse como MENSUAL (política vigente)');
  }
}

export function validateZod(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ errors });
    }
    req.body = result.data as any;
    return next();
  };
}

export {
  CLIENT_TYPE_VALUES as CLIENT_TYPE_VALUES_ENUM,
  PERIODICITY_VALUES as PERIODICITY_VALUES_ENUM,
  TAX_RULES,
};

export default { registerSchema, validateZod };
