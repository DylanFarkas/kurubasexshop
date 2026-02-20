import type { Order } from '../types/order';
import { formatPrice } from '../utils/formatters';

/**
 * Genera un link de WhatsApp con el mensaje de pedido formateado
 * @param order - Orden completa con todos los datos del cliente y productos
 * @returns URL de WhatsApp con el mensaje pre-formateado
 */
export function generateWhatsAppLink(order: Order): string {
  const phone = import.meta.env.PUBLIC_WHATSAPP_NUMBER || '573001234567';
  
  const message = `
🛍️ *Nuevo Pedido #${order.order_number}*

👤 *DATOS DEL CLIENTE*
• Nombre: ${order.customer_name}
• Teléfono: ${order.customer_phone}
${order.customer_email ? `• Email: ${order.customer_email}` : ''}

📍 *DIRECCIÓN DE ENVÍO*
• Departamento: ${order.customer_department}
• Ciudad: ${order.customer_city}
• Dirección: ${order.customer_address}

📦 *PRODUCTOS:*
${order.items.map((item, index) => 
  `${index + 1}. ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`
).join('\n')}

💰 *TOTAL: ${formatPrice(order.total)}*

${order.notes ? `📝 Notas: ${order.notes}` : ''}
  `.trim();
  
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Envía un mensaje de WhatsApp usando WhatsApp Business API
 * @param order - Orden completa
 * @returns Promise<boolean> - true si se envió correctamente
 * @todo Implementar cuando se active WhatsApp Business API
 */
export async function sendWhatsAppMessage(order: Order): Promise<boolean> {
  // TODO: Implementar cuando se active WhatsApp Business API
  // Ejemplo de implementación futura:
  // const response = await fetch('https://graph.facebook.com/v18.0/PHONE_ID/messages', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${import.meta.env.WHATSAPP_API_TOKEN}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     messaging_product: 'whatsapp',
  //     to: order.customer_phone,
  //     type: 'text',
  //     text: { body: generateMessage(order) }
  //   })
  // });
  // return response.ok;
  
  console.log('WhatsApp Business API not configured yet');
  return false;
}