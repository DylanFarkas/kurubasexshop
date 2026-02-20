import { Resend } from 'resend';
import type { Order } from '../types/order';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

const ADMIN_EMAIL = import.meta.env.PUBLIC_ADMIN_EMAIL;
const SITE_URL = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';

// MODO TESTING: Usar email de Resend
const FROM_EMAIL = 'onboarding@resend.dev';

// 🆕 Verificar si los emails están habilitados
const EMAILS_ENABLED = import.meta.env.ENABLE_EMAILS === 'true';

/**
 * Envía email de confirmación al cliente
 */
export async function sendOrderConfirmationToCustomer(order: Order) {
  if (!EMAILS_ENABLED) {
    console.log('⚠️ Emails desactivados - No se envió email a cliente');
    return { success: true, skipped: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Kuruba Sexshop <${FROM_EMAIL}>`,
      to: order.customer_email || ADMIN_EMAIL, // Fallback si no hay email
      subject: `✅ Confirmación de pedido #${order.order_number}`,
      html: getCustomerEmailTemplate(order),
    });

    if (error) {
      console.error('❌ Error enviando email a cliente:', error);
      return { success: false, error };
    }

    console.log('✅ Email enviado a cliente:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error en sendOrderConfirmationToCustomer:', error);
    return { success: false, error };
  }
}

/**
 * Notifica al admin sobre nuevo pedido
 */
export async function sendOrderNotificationToAdmin(order: Order) {
  if (!EMAILS_ENABLED) {
    console.log('⚠️ Emails desactivados - No se envió email a admin');
    return { success: true, skipped: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Kuruba Notificaciones <${FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: `🛒 Nuevo Pedido #${order.order_number} - S/ ${order.total.toFixed(2)}`,
      html: getAdminEmailTemplate(order),
    });

    if (error) {
      console.error('❌ Error enviando email a admin:', error);
      return { success: false, error };
    }

    console.log('✅ Email enviado a admin:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error en sendOrderNotificationToAdmin:', error);
    return { success: false, error };
  }
}

/**
 * Template HTML para email del cliente
 */
function getCustomerEmailTemplate(order: Order): string {
  const itemsHtml = order.items
    .map(
      (item: any) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        ${item.name || 'Producto'}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        S/ ${item.price.toFixed(2)}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        S/ ${(item.quantity * item.price).toFixed(2)}
      </td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">¡Gracias por tu compra!</h1>
      </div>

      <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        
        <p style="font-size: 16px;">Hola <strong>${order.customer_name}</strong>,</p>
        
        <p>Hemos recibido tu pedido correctamente. A continuación los detalles:</p>

        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <p style="margin: 5px 0;"><strong>Número de pedido:</strong> ${order.order_number}</p>
          <p style="margin: 5px 0;"><strong>Estado:</strong> <span style="color: #667eea; font-weight: bold;">Pendiente de confirmación</span></p>
          <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date(order.created_at).toLocaleDateString('es-PE', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>

        <!-- NUEVO: Dirección de envío -->
        <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-top: 30px;">📍 Dirección de Envío</h3>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Departamento:</strong> ${order.customer_department}</p>
          <p style="margin: 5px 0;"><strong>Ciudad:</strong> ${order.customer_city}</p>
          <p style="margin: 5px 0;"><strong>Dirección:</strong> ${order.customer_address}</p>
        </div>

        <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-top: 30px;">📦 Productos</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #667eea;">Producto</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #667eea;">Cant.</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #667eea;">Precio</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #667eea;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 20px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <p style="margin: 5px 0; font-size: 14px;">Subtotal: S/ ${order.subtotal.toFixed(2)}</p>
          <p style="margin: 5px 0; font-size: 14px;">Envío: S/ ${order.shipping_cost.toFixed(2)}</p>
          <p style="margin: 15px 0 0 0; font-size: 24px; color: #667eea;"><strong>Total: S/ ${order.total.toFixed(2)}</strong></p>
        </div>

        ${order.notes ? `
        <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 25px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold;">📝 Notas adicionales:</p>
          <p style="margin: 5px 0 0 0;">${order.notes}</p>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f4ff; border-radius: 8px;">
          <p style="margin: 0 0 10px 0; font-size: 16px;">En breve nos pondremos en contacto contigo para confirmar tu pedido.</p>
          <p style="color: #666; font-size: 14px; margin: 0;">También recibirás un mensaje de WhatsApp al <strong>${order.customer_phone}</strong></p>
        </div>

        <div style="text-align: center; padding: 25px; background: #667eea; border-radius: 8px; margin-top: 30px;">
          <p style="margin: 0 0 15px 0; color: white; font-size: 16px; font-weight: bold;">¿Tienes alguna duda?</p>
          <a href="https://wa.me/51${order.customer_phone.replace(/\D/g, '')}" 
             style="display: inline-block; background: white; color: #667eea; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
            📱 Contáctanos por WhatsApp
          </a>
        </div>

      </div>

      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} Kuruba Sexshop. Todos los derechos reservados.</p>
        <p style="margin: 5px 0;">
          <a href="${SITE_URL}" style="color: #667eea; text-decoration: none;">Visitar tienda</a>
        </p>
      </div>

    </body>
    </html>
  `;
}

/**
 * Template HTML para email del admin
 */
function getAdminEmailTemplate(order: Order): string {
  const itemsHtml = order.items
    .map(
      (item: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">
        ${item.name || 'Producto'}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
        S/ ${(item.quantity * item.price).toFixed(2)}
      </td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      
      <div style="background: #f44336; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 26px;">🛒 Nuevo Pedido Recibido</h1>
      </div>

      <div style="background: white; padding: 25px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        
        <h2 style="color: #f44336; margin-top: 0;">Pedido #${order.order_number}</h2>

        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f44336;">
          <p style="margin: 5px 0;"><strong>👤 Cliente:</strong> ${order.customer_name}</p>
          <p style="margin: 5px 0;"><strong>📱 Teléfono:</strong> <a href="tel:${order.customer_phone}" style="color: #f44336; text-decoration: none;">${order.customer_phone}</a></p>
          ${order.customer_email ? `<p style="margin: 5px 0;"><strong>📧 Email:</strong> <a href="mailto:${order.customer_email}" style="color: #f44336; text-decoration: none;">${order.customer_email}</a></p>` : ''}
          <p style="margin: 5px 0;"><strong>🕐 Fecha:</strong> ${new Date(order.created_at).toLocaleString('es-PE')}</p>
        </div>

        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4caf50;">
          <p style="margin: 0; font-weight: bold;">📍 Dirección de Envío:</p>
          <p style="margin: 5px 0 0 0;">
            ${order.customer_department} - ${order.customer_city}<br/>
            ${order.customer_address}
          </p>
        </div>

        ${order.notes ? `
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; font-weight: bold;">📝 Notas del cliente:</p>
          <p style="margin: 5px 0 0 0;">${order.notes}</p>
        </div>
        ` : ''}

        <h3 style="margin-top: 25px; color: #333;">Productos:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #f44336;">Producto</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #f44336;">Cant.</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #f44336;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 15px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
          <p style="margin: 5px 0;">Subtotal: S/ ${order.subtotal.toFixed(2)}</p>
          <p style="margin: 5px 0;">Envío: S/ ${order.shipping_cost.toFixed(2)}</p>
          <p style="margin: 10px 0 0 0; font-size: 20px; color: #f44336;"><strong>Total: S/ ${order.total.toFixed(2)}</strong></p>
        </div>

        <div style="text-align: center; margin-top: 25px;">
          <a href="${SITE_URL}/admin/pedidos/${order.id}" 
             style="display: inline-block; background: #f44336; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            👉 Ver Pedido en Admin
          </a>
        </div>

        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 25px; text-align: center;">
          <p style="margin: 0; color: #1976d2; font-weight: bold;">
            💡 No olvides confirmar el pedido y contactar al cliente!
          </p>
        </div>

      </div>

      <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
        <p style="margin: 0;">Este email se envió automáticamente desde Kuruba Sexshop</p>
      </div>

    </body>
    </html>
  `;
}