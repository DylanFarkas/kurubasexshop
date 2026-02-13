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
  category_id: z.string().uuid('Selecciona una categoría válida'),
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