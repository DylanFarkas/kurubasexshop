# 📧 Guía de Producción - Sistema de Emails con Resend

**Fecha:** Para cuando tengas dominio propio  
**Objetivo:** Configurar emails profesionales para Kuruba Sexshop

---

## 📋 Pre-requisitos

- ✅ Dominio registrado (ej: `kurubasexshop.com`)
- ✅ Acceso al panel DNS del dominio (GoDaddy, Namecheap, Cloudflare, etc.)
- ✅ Cuenta de Resend activa
- ✅ 30-60 minutos de tiempo

---

## 🎯 PASO 1: Verificar Dominio en Resend

### 1.1. Ir al Dashboard de Resend

1. Ingresa a: https://resend.com/domains
2. Click en **"Add Domain"**
3. Ingresa tu dominio: `kurubasexshop.com` (sin www)
4. Click en **"Add"**

### 1.2. Obtener registros DNS

Resend te mostrará una pantalla con **3 registros DNS** que debes agregar:

```
📝 REGISTRO 1 - MX (Para recibir emails)
Tipo: MX
Nombre/Host: @ (o deja vacío)
Valor/Destino: feedback-smtp.us-east-1.amazonses.com
Prioridad: 10

📝 REGISTRO 2 - TXT (Verificación SPF)
Tipo: TXT
Nombre/Host: @ (o deja vacío)
Valor: "v=spf1 include:amazonses.com ~all"

📝 REGISTRO 3 - CNAME (DKIM - Firma digital)
Tipo: CNAME
Nombre/Host: resend._domainkey
Valor: [valor único que te da Resend, ej: xxx.dkim.amazonses.com]
```

**⚠️ IMPORTANTE:** Copia estos valores exactos. Los necesitarás en el siguiente paso.

---

## 🌐 PASO 2: Configurar DNS en tu Proveedor de Dominio

### Opción A: GoDaddy

1. Ve a https://dcc.godaddy.com/
2. Click en tu dominio → **"DNS"**
3. Scroll hasta **"Registros"**

**Agregar MX:**
- Click **"Agregar"** → Tipo: **MX**
- Nombre: `@`
- Valor: `feedback-smtp.us-east-1.amazonses.com`
- Prioridad: `10`
- TTL: `1 hora`
- **Guardar**

**Agregar TXT:**
- Click **"Agregar"** → Tipo: **TXT**
- Nombre: `@`
- Valor: `v=spf1 include:amazonses.com ~all`
- TTL: `1 hora`
- **Guardar**

**Agregar CNAME:**
- Click **"Agregar"** → Tipo: **CNAME**
- Nombre: `resend._domainkey`
- Valor: `[el valor que te dio Resend]`
- TTL: `1 hora`
- **Guardar**

### Opción B: Namecheap

1. Ve a tu panel de Namecheap
2. Click en **"Manage"** → **"Advanced DNS"**

**Agregar MX:**
- Click **"Add New Record"**
- Type: `MX Record`
- Host: `@`
- Value: `feedback-smtp.us-east-1.amazonses.com`
- Priority: `10`
- **Save**

**Agregar TXT:**
- Click **"Add New Record"**
- Type: `TXT Record`
- Host: `@`
- Value: `v=spf1 include:amazonses.com ~all`
- **Save**

**Agregar CNAME:**
- Click **"Add New Record"**
- Type: `CNAME Record`
- Host: `resend._domainkey`
- Value: `[el valor que te dio Resend]`
- **Save**

### Opción C: Cloudflare

1. Ve a tu dashboard de Cloudflare
2. Selecciona tu dominio → **"DNS"** → **"Records"**

**Agregar MX:**
- Click **"Add record"**
- Type: `MX`
- Name: `@`
- Mail server: `feedback-smtp.us-east-1.amazonses.com`
- Priority: `10`
- Proxy status: **DNS only** (⚠️ importante)
- **Save**

**Agregar TXT:**
- Click **"Add record"**
- Type: `TXT`
- Name: `@`
- Content: `v=spf1 include:amazonses.com ~all`
- **Save**

**Agregar CNAME:**
- Click **"Add record"**
- Type: `CNAME`
- Name: `resend._domainkey`
- Target: `[el valor que te dio Resend]`
- Proxy status: **DNS only** (⚠️ importante)
- **Save**

---

## ⏱️ PASO 3: Esperar Propagación DNS

- **Tiempo estimado:** 5 minutos - 48 horas
- **Promedio real:** 15-30 minutos

### Verificar propagación:

Usa esta herramienta: https://dnschecker.org/

1. Ingresa tu dominio
2. Selecciona tipo de registro: `MX`, `TXT`, `CNAME`
3. Click **"Search"**
4. Espera a ver ✅ en varios países

---

## ✅ PASO 4: Verificar en Resend

1. Vuelve a https://resend.com/domains
2. Deberías ver tu dominio con estado: **"Verified"** ✅
3. Si aún dice "Pending", espera más tiempo o click en **"Verify"**

**Si falla:**
- Revisa que los registros DNS estén correctos
- Espera 30 minutos más
- Contacta soporte de Resend si persiste

---

## 💻 PASO 5: Actualizar Código en el Proyecto

### 5.1. Actualizar variables de entorno

```env
# Email Configuration (Resend) - PRODUCCIÓN
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx  # Mantener igual
PUBLIC_ADMIN_EMAIL=pedidos@kurubasexshop.com  # ⬅️ CAMBIAR a email del dominio
PUBLIC_SITE_URL=https://kurubasexshop.com  # ⬅️ CAMBIAR a URL de producción
```

### 5.2. Actualizar helper de emails

```typescript
// filepath: src/lib/email.ts
import { Resend } from 'resend';
import type { Order } from '../types/order';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

const ADMIN_EMAIL = import.meta.env.PUBLIC_ADMIN_EMAIL;
const SITE_URL = import.meta.env.PUBLIC_SITE_URL || 'https://kurubasexshop.com';

// ✅ PRODUCCIÓN: Usar dominio verificado
const FROM_EMAIL = 'pedidos@kurubasexshop.com'; // ⬅️ CAMBIAR ESTA LÍNEA

/**
 * Envía email de confirmación al cliente
 */
export async function sendOrderConfirmationToCustomer(order: Order) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Kuruba Sexshop <${FROM_EMAIL}>`,
      to: order.customer_email || ADMIN_EMAIL, // ⬅️ RESTAURAR: Enviar al cliente
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
  try {
    const { data, error } = await resend.emails.send({
      from: `Kuruba Notificaciones <notificaciones@kurubasexshop.com>`, // ⬅️ Puedes usar subdominios
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

// ...existing code... (templates sin cambios)
```

### 5.3. Actualizar templates (opcional - mejoras)

Si quieres personalizar más los emails, modifica estas partes:

```typescript
// filepath: src/lib/email.ts

// En getCustomerEmailTemplate():
// Cambiar links de WhatsApp por el número oficial de la tienda
<a href="https://wa.me/51999999999"  // ⬆️ Número de la tienda
   style="display: inline-block; background: white; color: #667eea; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
  📱 Contáctanos por WhatsApp
</a>

// Agregar footer con redes sociales
<div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
  <p style="margin: 5px 0;">© ${new Date().getFullYear()} Kuruba Sexshop. Todos los derechos reservados.</p>
  <p style="margin: 5px 0;">
    <a href="${SITE_URL}" style="color: #667eea; text-decoration: none;">Visitar tienda</a> |
    <a href="https://instagram.com/kuruba" style="color: #667eea; text-decoration: none;">Instagram</a> |
    <a href="https://facebook.com/kuruba" style="color: #667eea; text-decoration: none;">Facebook</a>
  </p>
</div>
```

---

## 🧪 PASO 6: Probar en Producción

### 6.1. Deploy del proyecto

```bash
# Asegúrate que las variables de entorno estén actualizadas
# en tu plataforma de hosting (Vercel, Netlify, etc.)

# Hacer push de los cambios
git add .
git commit -m "feat: Configurar emails de producción con dominio verificado"
git push origin main
```

### 6.2. Realizar orden de prueba

1. Ve a tu sitio en producción: `https://kurubasexshop.com`
2. Agrega productos al carrito
3. Completa el checkout con un **email REAL de prueba**
4. Confirma el pedido

### 6.3. Verificar emails

**Deberías recibir:**
- ✉️ Email de confirmación al cliente
- ✉️ Email de notificación al admin

**Revisar:**
- ✅ Llegan a la bandeja principal (no spam)
- ✅ Remitente muestra "Kuruba Sexshop"
- ✅ Diseño se ve correctamente
- ✅ Links funcionan
- ✅ Imágenes cargan (si agregaste)

---

## 📊 PASO 7: Monitoreo y Analytics

### 7.1. Dashboard de Resend

En https://resend.com/emails verás:

- 📬 Emails enviados
- ✅ Tasa de entrega
- 📧 Emails abiertos (si activas tracking)
- ❌ Rebotes y errores
- 📈 Gráficas de uso

### 7.2. Configurar webhooks (opcional)

Si quieres recibir notificaciones de eventos:

1. Ve a https://resend.com/webhooks
2. Click **"Create Webhook"**
3. URL: `https://kurubasexshop.com/api/webhooks/resend`
4. Eventos: `email.delivered`, `email.bounced`, `email.complained`

Luego crea el endpoint:

```typescript
// filepath: src/pages/api/webhooks/resend.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  
  console.log('📧 Webhook de Resend:', body);
  
  // Aquí puedes actualizar el estado de la orden
  // o enviar notificaciones según el evento
  
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

---

## 🔒 PASO 8: Seguridad y Mejores Prácticas

### 8.1. Configurar DMARC (opcional pero recomendado)

Agrega un registro TXT adicional en tu DNS:

```
Tipo: TXT
Nombre: _dmarc
Valor: v=DMARC1; p=none; rua=mailto:pedidos@kurubasexshop.com
```

Esto ayuda a:
- ✅ Evitar que tu dominio sea usado para spam
- ✅ Recibir reportes de autenticación
- ✅ Mejorar reputación del dominio

### 8.2. Límites de envío

**Free tier de Resend:**
- 3,000 emails/mes
- 100 emails/día

**Si necesitas más:**
- Plan Pro: $20/mes → 50,000 emails/mes
- Plan Business: $80/mes → 500,000 emails/mes

### 8.3. Manejo de errores mejorado

```typescript
// filepath: src/lib/email.ts

export async function sendOrderConfirmationToCustomer(order: Order) {
  // ...existing code...
  
  if (error) {
    // Registrar en sistema de logs (ej: Sentry)
    console.error('❌ Error enviando email:', {
      orderId: order.id,
      orderNumber: order.order_number,
      error: error,
      timestamp: new Date().toISOString()
    });
    
    // Podrías enviar alerta al admin por otro canal
    // ej: Telegram, Slack, etc.
    
    return { success: false, error };
  }
}
```

---

## 📝 PASO 9: Checklist Final de Producción

Antes de considerar el sistema 100% productivo:

- [ ] Dominio verificado en Resend (estado: ✅ Verified)
- [ ] Registros DNS propagados (verificado en dnschecker.org)
- [ ] `.env` actualizado con dominio en producción
- [ ] `FROM_EMAIL` cambiado a dominio verificado
- [ ] Código actualizado y desplegado
- [ ] Orden de prueba realizada exitosamente
- [ ] Emails recibidos (cliente y admin)
- [ ] Emails NO van a spam
- [ ] Remitente muestra nombre correcto
- [ ] Links de WhatsApp funcionan
- [ ] Link al admin panel funciona
- [ ] Templates se ven bien en diferentes clientes:
  - [ ] Gmail (web)
  - [ ] Gmail (móvil)
  - [ ] Outlook
  - [ ] Apple Mail
- [ ] Monitoreo configurado en Resend dashboard
- [ ] DMARC configurado (opcional)
- [ ] Plan de escalamiento definido si creces

---

## 🆘 Troubleshooting Común

### Problema 1: Emails van a spam

**Soluciones:**
- Verificar que DKIM esté correctamente configurado
- Agregar registro DMARC
- Evitar palabras spam en subject ("gratis", "oferta", muchos emojis)
- Pedir a clientes que agreguen a contactos

### Problema 2: Dominio no se verifica

**Soluciones:**
- Esperar más tiempo (hasta 48 horas)
- Verificar registros DNS con herramientas online
- Asegurar que no hay duplicados de registros
- Contactar soporte de Resend

### Problema 3: Límite de envío excedido

**Soluciones:**
- Upgrade a plan Pro ($20/mes)
- Implementar sistema de cola para emails
- Combinar notificaciones (1 email diario con resumen)

---

## 📧 Emails Sugeridos para Crear

Puedes crear estas direcciones en tu dominio:

- `pedidos@kurubasexshop.com` - Para confirmaciones de órdenes
- `notificaciones@kurubasexshop.com` - Para alertas al admin
- `soporte@kurubasexshop.com` - Para atención al cliente
- `noreply@kurubasexshop.com` - Para emails automatizados

**No necesitas buzones reales**, solo configurar el FROM en Resend.

---

## 🎉 Resultado Final

Una vez completado todo:

✅ **Emails profesionales** desde tu dominio  
✅ **Alta entregabilidad** (no spam)  
✅ **Templates hermosos** con tu branding  
✅ **Monitoreo completo** en dashboard  
✅ **Escalable** hasta 3,000 emails/mes gratis  
✅ **Confiable** con infraestructura de AWS  

---

**Tiempo estimado total:** 1-2 horas (incluyendo espera de DNS)

**¿Listo para producción?** Sigue estos pasos cuando tengas tu dominio y estarás online en poco tiempo. 🚀
