import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { z } from 'zod';

export const prerender = false;

const orderItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  image: z.string().optional(),
});

const createOrderSchema = z.object({
  customer_name: z.string().min(3),
  customer_phone: z.string().regex(/^[0-9]{10}$/),
  customer_email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  total: z.number().positive(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    // Crear orden en base de datos
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: validatedData.customer_name,
        customer_phone: validatedData.customer_phone,
        customer_email: validatedData.customer_email || null,
        notes: validatedData.notes || null,
        total: validatedData.total,
        status: 'pending',
        items: validatedData.items,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error al crear la orden' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generar mensaje de WhatsApp
    const whatsappNumber = import.meta.env.PUBLIC_WHATSAPP_NUMBER || '573001234567';
    
    let message = `¡Hola! 🛍️ Nuevo pedido #${order.id}\n\n`;
    message += `👤 Cliente: ${validatedData.customer_name}\n`;
    message += `📱 Teléfono: ${validatedData.customer_phone}\n`;
    if (validatedData.customer_email) {
      message += `📧 Email: ${validatedData.customer_email}\n`;
    }
    message += `\n📦 PRODUCTOS:\n`;
    
    validatedData.items.forEach((item, index) => {
      message += `\n${index + 1}. ${item.name}\n`;
      message += `   Cantidad: ${item.quantity}\n`;
      message += `   Precio: $${item.price.toLocaleString()}\n`;
    });
    
    message += `\n💰 TOTAL: $${validatedData.total.toLocaleString()}\n`;
    
    if (validatedData.notes) {
      message += `\n📝 Notas: ${validatedData.notes}\n`;
    }

    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    return new Response(
      JSON.stringify({ 
        success: true,
        orderId: order.id,
        whatsappLink,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing order:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Datos inválidos',
          errors: error.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error interno del servidor' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
