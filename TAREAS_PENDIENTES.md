# Tareas Pendientes - Kuruba Sexshop

**Fecha de análisis:** 16 de febrero, 2026  
**Basado en:** [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)

---

## 📊 Resumen del Estado del Proyecto

### ✅ Completado (98% aprox.)

- ✅ Infraestructura base (Supabase, Cloudinary, middleware)
- ✅ Sistema de carrito completo
- ✅ Páginas públicas (tienda, producto, categoría)
- ✅ Admin: Panel de productos (CRUD completo)
- ✅ Admin: Panel de gestión de pedidos (CRUD + filtros)
- ✅ Admin: Panel de gestión de categorías (CRUD completo)
- ✅ API de productos, órdenes y categorías
- ✅ Sistema de autenticación
- ✅ Componentes de UI principales
- ✅ Helper centralizado de WhatsApp

### ❌ Pendiente (2% aprox.)

- ❌ Sistema de emails (opcional)
- ❌ Correcciones menores de tipos

---

## 🔴 PRIORIDAD CRÍTICA

### 1. Panel de Gestión de Pedidos

**Archivo:** `src/pages/admin/pedidos.astro`  
**Estado:** ✅ COMPLETADO
**Impacto:** Panel completo y funcional para gestionar pedidos

#### ✅ Implementación Completa:

**Archivos creados:**

1. **`src/pages/admin/pedidos/index.astro`** - Página principal
   - ✅ Tabla de pedidos con todas las columnas requeridas
   - ✅ Tarjetas de estadísticas (total, pendientes, confirmados, entregados)
   - ✅ Estadísticas de ventas (total y promedio)
   - ✅ Integración con OrdersTable component

2. **`src/components/admin/OrdersTable.tsx`** - Tabla interactiva
   - ✅ Búsqueda por nombre, teléfono y número de orden
   - ✅ Filtros por estado (todos, pendiente, confirmado, etc.)
   - ✅ Paginación completa (10 items por página)
   - ✅ Cambio de estado inline desde la tabla
   - ✅ Link a vista de detalles
   - ✅ Badges de colores por estado

3. **`src/pages/admin/pedidos/[id].astro`** - Vista de detalles
   - ✅ Información completa del cliente
   - ✅ Lista detallada de productos con imágenes
   - ✅ Totales (subtotal, envío, total)
   - ✅ Selector para cambiar estado
   - ✅ Botón para reenviar mensaje de WhatsApp
   - ✅ Notas del cliente (si existen)
   - ✅ Links de contacto (teléfono y email)

4. **`src/pages/api/orders/update.ts`** - API de actualización
   - ✅ Endpoint PATCH para actualizar estado y notas
   - ✅ Validación con Zod schema
   - ✅ Manejo de errores completo

**Características adicionales:**
- ✅ Sidebar ya incluye link a "Pedidos"
- ✅ Integración con helper de WhatsApp centralizado
- ✅ Diseño consistente con el resto del admin
- ✅ Responsive design

**Referencia:** MIGRATION_PLAN.md - FASE 6, Sección 6.5

---

## 🟡 PRIORIDAD ALTA

### 2. Panel de Gestión de Categorías

**Archivo:** `src/pages/admin/categorias.astro`  
**Estado:** ✅ COMPLETADO
**Impacto:** Panel completo y funcional para gestionar categorías

#### ✅ Implementación Completa:

**Archivos creados:**

1. **`src/pages/admin/categorias/index.astro`** - Página principal
   - ✅ Tabla con todas las columnas (posición, nombre, slug, productos, estado)
   - ✅ Tarjetas de estadísticas (total, activas, inactivas)
   - ✅ Conteo de productos por categoría
   - ✅ Botón para crear nueva categoría
   - ✅ Acciones: Editar y Eliminar
   - ✅ Protección: No permite eliminar si tiene productos

2. **`src/components/admin/CategoryForm.tsx`** - Formulario completo
   - ✅ Validación con Zod schema
   - ✅ Auto-generación de slug del nombre
   - ✅ Campos: label, slug, order_position, active
   - ✅ Modo crear y editar
   - ✅ Manejo de errores

3. **`src/pages/admin/categorias/nuevo.astro`** - Crear categoría
   - ✅ Formulario de creación
   - ✅ Consejos y ayuda
   - ✅ Botón de volver

4. **`src/pages/admin/categorias/[id].astro`** - Editar categoría
   - ✅ Formulario de edición
   - ✅ Advertencia si tiene productos asociados
   - ✅ Información contextual

**APIs implementadas:**
- ✅ `src/pages/api/categories/create.ts` - POST para crear
- ✅ `src/pages/api/categories/update.ts` - PATCH para actualizar
- ✅ `src/pages/api/categories/delete.ts` - DELETE (con validación de productos)

**Características:**
- ✅ CRUD completo (Crear, Leer, Actualizar, Eliminar)
- ✅ Auto-generación de slug
- ✅ Ordenamiento por posición
- ✅ Estados activo/inactivo
- ✅ Protección contra eliminación accidental
- ✅ Diseño consistente con el resto del admin

**Referencia:** MIGRATION_PLAN.md - FASE 6

---

### 3. Helper de WhatsApp Centralizado

**Archivo:** `src/lib/whatsapp.ts`  
**Estado:** ✅ COMPLETADO 
**Impacto:** Código centralizado y reutilizable para mensajes de WhatsApp

#### Implementación:

**✅ COMPLETADO** - El helper ha sido creado e integrado correctamente.

**Ubicación:** `src/lib/whatsapp.ts`

**Funciones implementadas:**
- `generateWhatsAppLink(order)` - Genera link de WhatsApp con mensaje formateado
- `sendWhatsAppMessage(order)` - Placeholder para futura integración con WhatsApp Business API

**Integrado en:**
- ✅ `src/pages/api/orders/create.ts` - Usa `generateWhatsAppLink()` para generar el enlace
- 🔜 Panel de pedidos - Se usará para reenviar mensajes (cuando se implemente)

**Referencia:** MIGRATION_PLAN.md - FASE 2, Sección 2.6

---

## 🟢 PRIORIDAD MEDIA/BAJA

### 4. Sistema de Emails (Opcional)

**Archivo:** `src/lib/email.ts`  
**Estado:** ❌ No existe  
**Impacto:** Opcional - solo si la dueña quiere notificaciones por email

#### Pre-requisitos:
```bash
npm install resend
```

Variables de entorno:
```env
RESEND_API_KEY=re_xxx
PUBLIC_ADMIN_EMAIL=dueña@kuruba.com
```

#### Funciones requeridas:

```typescript
// Confirmación al cliente
export async function sendOrderConfirmationToCustomer(order: Order)

// Notificación al admin
export async function sendOrderNotificationToAdmin(order: Order)
```

**Integrar en:** `src/pages/api/orders/create.ts` después de crear la orden

**Referencia:** MIGRATION_PLAN.md - FASE 7, Sección 7.1

---

### 5. Corrección de Tipo `order_number`

**Archivos afectados:**
- `src/types/order.ts` (línea 18)

**Problema:**
```typescript
// Actual (INCORRECTO)
order_number: number;

// Debería ser
order_number: string; // Ej: "KRB-20260216-001"
```

**Razón:** En el esquema SQL del plan, `order_number` es `text`, no `integer`

**Impacto:** Bajo - no genera errores ahora pero podría causar problemas futuros

---

### 6. Activar Verificación de `admin_users`

**Archivo:** `middleware.ts` (líneas 18-31)

**Problema:** La validación de admin está comentada

```typescript
// TEMPORAL: Comentar verificación de admin mientras se configura
// TODO: Descomentar cuando admin_users esté configurado
/*
const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', session.user.email)
    .single();

if (!adminUser) {
    await supabase.auth.signOut();
    return redirect("/admin/login");
}
*/
```

**Acción requerida:**
1. Asegurar que tabla `admin_users` existe en Supabase
2. Insertar email de la dueña en la tabla
3. Descomentar la validación

**Referencia:** MIGRATION_PLAN.md - FASE 1, Sección 1.1

---

### 7. Componente ProductTable Standalone (Opcional)

**Archivo:** `src/components/admin/ProductTable.tsx`  
**Estado:** ❌ No existe como componente independiente

**Situación actual:** La tabla está inline en `src/pages/admin/productos/index.astro`

**Beneficio:** Reutilización y mejor organización del código

**Prioridad:** Muy baja - es refactoring, no funcionalidad nueva

---

## 📝 Tareas Adicionales Recomendadas

### A. Mejorar SEO (Bajo impacto técnico)

**Archivo:** `src/layouts/BaseLayout.astro`

Verificar que incluye:
- Meta tags Open Graph
- Twitter Cards
- Canonical URLs
- Structured data (JSON-LD) para productos

**Referencia:** MIGRATION_PLAN.md - FASE 7, Sección 7.2

### B. Sidebar del Admin Layout

**Archivo:** `src/components/admin/Sidebar.astro`

**Estado:** ✅ Completado

El menú incluye:
- ✅ Dashboard
- ✅ Productos
- ✅ Categorías
- ✅ Pedidos

---

## 🎯 Plan de Implementación Sugerido

### Sprint 1: Gestión de Pedidos (1-2 días)
1. Crear `OrdersTable.tsx` component
2. Crear `src/pages/admin/pedidos.astro` con tabla básica
3. Implementar API `update.ts` para cambiar estados
4. Agregar link en sidebar de admin
5. Testing completo

### Sprint 2: Helper WhatsApp + Categorías (1 día)
1. Crear `src/lib/whatsapp.ts`
2. Refactorizar `/api/orders/create.ts`
3. Crear panel de categorías básico
4. Implementar CategoryForm component

### Sprint 3: Pulido y Extras (medio día)
1. Corregir tipo `order_number`
2. Activar verificación `admin_users`
3. Verificar meta tags SEO
4. Testing general

### Sprint 4: Emails (opcional - 1 día)
1. Configurar Resend
2. Implementar `email.ts`
3. Integrar en flujo de órdenes
4. Testing de envío

---

## 🧪 Checklist de Testing Post-Implementación

### Panel de Pedidos
- [x] Ver lista de todos los pedidos
- [x] Filtrar por estado
- [x] Buscar por número de orden, nombre y teléfono
- [x] Cambiar estado de un pedido
- [x] Ver detalles completos
- [x] Reenviar WhatsApp

### Panel de Categorías
- [x] Listar todas las categorías
- [x] Crear nueva categoría
- [x] Editar categoría existente
- [x] Cambiar orden de categorías (campo order_position)
- [x] Activar/desactivar categoría
- [x] Verificar que slug se genera automáticamente

### Helper WhatsApp
- [x] Link genera mensaje correcto
- [x] Formato de mensaje es legible
- [x] Precios se formatean bien
- [x] Funciona desde confirmación de orden

### Emails (si se implementa)
- [ ] Cliente recibe confirmación
- [ ] Admin recibe notificación
- [ ] Formato de email es correcto
- [ ] Manejo de errores funciona

---

## 📚 Referencias

- **Plan completo:** [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)
- **Documentación Supabase:** https://supabase.com/docs
- **Documentación Astro:** https://docs.astro.build
- **Resend (emails):** https://resend.com/docs

---

## ✅ Estado Final Esperado

Una vez completadas todas las tareas críticas y de alta prioridad, el proyecto tendrá:

- ✅ Panel de administración **100% funcional**
- ✅ Gestión completa de productos, categorías y pedidos
- ✅ Sistema de órdenes con WhatsApp automatizado
- ✅ Experiencia de compra fluida para clientes
- ✅ Código bien organizado y mantenible
- ✅ (Opcional) Notificaciones por email

**Resultado:** Sitio productivo listo para lanzamiento 🚀

---

_Última actualización: 16 de febrero, 2026_
