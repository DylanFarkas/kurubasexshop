import { z } from "zod";

export const orderSchema = z.object({
  customer_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  customer_phone: z.string().regex(/^[0-9]{10}$/, 'El teléfono debe tener 10 dígitos'),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    name: z.string(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
    image: z.string().optional(),
  })).min(1, 'Debe haber al menos un producto'),
  total: z.number().positive(),
});

export const productSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  slug: z.string().min(3, 'El slug debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  category_ids: z.array(z.string().uuid('ID de categoría inválido'))
    .min(1, 'Selecciona al menos una categoría')
    .max(10, 'Máximo 10 categorías por producto'),
  price: z.number().positive('El precio debe ser mayor a 0'),
  final_price: z.number().positive().optional().nullable(),
  discount_pct: z.number().int().min(0).max(100).optional().nullable(),
  image: z.string().url('URL de imagen inválida').optional(),
  images: z.array(z.string().url()).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const categorySchema = z.object({
  label: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string().min(2, 'El slug debe tener al menos 2 caracteres'),
  order_position: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const externalSecureUrlRegex = /^https:\/\/\S+$/i;

function isValidBannerTargetUrl(value: string): boolean {
  return value.startsWith('/') || externalSecureUrlRegex.test(value);
}

export const bannerTargetUrlSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z
    .string()
    .max(500, 'La URL de destino no puede superar 500 caracteres')
    .refine(isValidBannerTargetUrl, 'Usa una ruta interna (/ruta) o URL externa segura (https://...)')
    .nullable()
    .optional()
);

export const homeBannerSchema = z.object({
  id: z.string().uuid().optional(),
  image_url: z.string().url('La URL de imagen no es valida'),
  public_id: z.string().min(1, 'El public_id de Cloudinary es requerido'),
  target_url: bannerTargetUrlSchema,
  sort_order: z.number().int().min(0, 'El orden debe ser mayor o igual a 0'),
  is_active: z.boolean(),
});

export const homeBannerSettingsInputSchema = z.object({
  autoplay_enabled: z.boolean(),
  autoplay_interval_ms: z.number().int().min(1000, 'El intervalo minimo es 1000ms').max(30000, 'El intervalo maximo es 30000ms'),
  mobile_height_px: z.number().int().min(160, 'La altura movil minima es 160px').max(800, 'La altura movil maxima es 800px'),
  desktop_height_px: z.number().int().min(200, 'La altura desktop minima es 200px').max(1000, 'La altura desktop maxima es 1000px'),
});

export const homeBannersSaveSchema = z.object({
  items: z.array(homeBannerSchema).max(100, 'Maximo 100 banners por solicitud'),
  deleted: z.array(
    z.object({
      id: z.string().uuid('ID de banner invalido'),
      public_id: z.string().optional(),
    })
  ).optional().default([]),
  settings: homeBannerSettingsInputSchema.optional(),
});