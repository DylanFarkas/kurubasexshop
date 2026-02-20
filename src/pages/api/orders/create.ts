import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { generateWhatsAppLink } from '../../../lib/whatsapp';
import { sendOrderConfirmationToCustomer, sendOrderNotificationToAdmin } from '../../../lib/email';
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
  customer_department: z.string().min(1),
  customer_city: z.string().min(1),
  customer_address: z.string().min(10),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  total: z.number().positive(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    // Generar número de orden único
    const { count } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    const orderNumber = (count || 0) + 1;

    // Crear orden en base de datos
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: validatedData.customer_name,
        customer_phone: validatedData.customer_phone,
        customer_email: validatedData.customer_email || null,
        customer_department: validatedData.customer_department,
        customer_city: validatedData.customer_city,
        customer_address: validatedData.customer_address,
        notes: validatedData.notes || null,
        subtotal: validatedData.total,
        shipping_cost: 0,
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

    // Generar link de WhatsApp usando el helper
    const whatsappLink = generateWhatsAppLink(order);

    // 📧 Enviar emails de forma asíncrona (no bloquea la respuesta)
    console.log('📧 Enviando emails...');
    Promise.all([
      sendOrderConfirmationToCustomer(order),
      sendOrderNotificationToAdmin(order)
    ]).then(results => {
      console.log('✅ Emails procesados:', results);
    }).catch(err => {
      console.error('❌ Error enviando emails (no crítico):', err);
      // No fallar la orden si los emails fallan
    });

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