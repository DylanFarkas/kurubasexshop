# Plan de Migración: Kuruba Sexshop a Supabase + Admin Panel

**Fecha:** 13 de febrero, 2026  
**Framework:** Astro 5.17.1 + React 19.2.3  
**Backend:** Supabase (PostgreSQL + Auth + Storage)  
**CDN:** Cloudinary  
**Estado:** Planificación completada

---

## **Resumen Ejecutivo**

El proyecto actualmente es una landing estática con productos hardcodeados. Migraremos a una arquitectura híbrida: **frontend estático (Astro) + backend dinámico (Supabase) + admin panel (Astro + React)**, con autenticación solo para administrador, carrito en localStorage, órdenes persistidas y envío vía WhatsApp.

### **Decisiones Clave**

- ✅ Base de datos vacía inicial (productos cargados desde admin)
- ✅ Admin panel en `/admin/*` con islas React para interactividad
- ✅ Cloudinary para imágenes (CDN + transformaciones)
- ✅ WhatsApp link directo (`wa.me`) preparado para migrar a API Business
- ✅ Emails opcionales con Resend o SendGrid
- ✅ Arquitectura: Astro Pages + React Islands (mejor performance y SEO)

---

## **FASE 1: Configuración de Infraestructura**

### 1.1 Configurar Supabase

**Crear proyecto Supabase:**
- Iniciar proyecto en app.supabase.com
- Copiar `SUPABASE_URL` y `SUPABASE_ANON_KEY`
- Tomar nota del `service_role_key` (solo para Edge Functions)

**Crear esquema de base de datos:**

```sql
-- Tabla: categories
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  slug text UNIQUE NOT NULL,
  order_position integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tabla: products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  category_id uuid REFERENCES categories(id),
  price numeric(10,2) NOT NULL,
  final_price numeric(10,2),
  discount_pct integer,
  image text,  -- Cloudinary URL principal
  images text[], -- Array de URLs de galería
  featured boolean DEFAULT false,
  active boolean DEFAULT true,
  card_variant jsonb,  -- Almacena ProductCardVariant
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla: orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL, -- ej: KRB-20260213-001
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  items jsonb NOT NULL, -- [{productId, name, quantity, price, image}]
  subtotal numeric(10,2) NOT NULL,
  shipping_cost numeric(10,2) DEFAULT 0,
  total numeric(10,2) NOT NULL,
  status text DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled
  notes text,
  whatsapp_sent_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla: admin_users (solo para la dueña)
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  role text DEFAULT 'admin',
  last_login timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(active) WHERE active = true;
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Configurar Row Level Security (RLS):**

```sql
-- Habilitar RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Políticas: Lectura pública para categorías y productos activos
CREATE POLICY "Public read categories" ON categories
  FOR SELECT USING (active = true);

CREATE POLICY "Public read active products" ON products
  FOR SELECT USING (active = true);

-- Políticas: Solo admins pueden escribir
CREATE POLICY "Admin full access categories" ON categories
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM admin_users WHERE email = auth.jwt()->>'email')
  );

CREATE POLICY "Admin full access products" ON products
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM admin_users WHERE email = auth.jwt()->>'email')
  );

-- Políticas: Crear órdenes es público, lectura solo admins
CREATE POLICY "Public insert orders" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin read orders" ON orders
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users WHERE email = auth.jwt()->>'email')
  );

CREATE POLICY "Admin update orders" ON orders
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM admin_users WHERE email = auth.jwt()->>'email')
  );
```

**Insertar categorías iniciales:**

```sql
INSERT INTO categories (label, slug, order_position) VALUES
  ('Juguetes', 'juguetes', 1),
  ('Lubricantes', 'lubricantes', 2),
  ('Lencería', 'lenceria', 3),
  ('Masculino', 'masculino', 4),
  ('Bondaje', 'bondaje', 5),
  ('Bienestar íntimo', 'bienestar-intimo', 6),
  ('Ofertas', 'ofertas', 7);
```

**Registrar usuario admin inicial:**

```sql
-- Después de que la dueña haga signup con Magic Link
INSERT INTO admin_users (id, email, name, role)
VALUES (
  'uuid-del-auth-user', -- Se obtiene después del signup
  'dueña@kuruba.com',
  'Administradora Kuruba',
  'admin'
);
```

---

### 1.2 Configurar Cloudinary

**Setup:**
- Crear cuenta en cloudinary.com
- Copiar: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Crear upload preset sin firma (unsigned) llamado `kuruba-products`
- Configurar carpeta: `kuruba/products/`

**Transformaciones recomendadas:**
- Thumbnail: `w_300,h_375,c_fill,q_auto,f_auto`
- Main image: `w_800,h_1000,c_fill,q_auto,f_auto`
- Gallery: `w_1200,h_1500,c_fill,q_auto,f_auto`

---

### 1.3 Instalar Dependencias

```bash
# Supabase y autenticación
npm install @supabase/supabase-js
npm install @supabase/auth-helpers-shared

# Estado y data fetching
npm install zustand
npm install @tanstack/react-query

# Formularios y validación
npm install react-hook-form @hookform/resolvers zod

# Cloudinary
npm install cloudinary cloudinary-react

# Email (opcional)
npm install resend

# Asegurar integración React
npx astro add react
```

---

### 1.4 Variables de Entorno

Crear `.env`:

```env
# Supabase
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # Solo para Edge Functions

# Cloudinary
PUBLIC_CLOUDINARY_CLOUD_NAME=kuruba
PUBLIC_CLOUDINARY_UPLOAD_PRESET=kuruba-products
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=xxx

# WhatsApp
PUBLIC_WHATSAPP_NUMBER=573001234567  # Formato internacional sin +

# Email (opcional)
RESEND_API_KEY=re_xxx
PUBLIC_ADMIN_EMAIL=dueña@kuruba.com

# App
PUBLIC_APP_URL=https://kuruba.com
```

Actualizar `.gitignore` para incluir `.env`.

---

## **FASE 2: Configuración del Proyecto Astro**

### 2.1 Crear Estructura de Carpetas

```
src/
├── lib/
│   ├── supabase.ts          # Cliente Supabase (browser)
│   ├── supabaseServer.ts    # Cliente Supabase (server)
│   ├── cloudinary.ts        # Helper de Cloudinary
│   └── whatsapp.ts          # Helper WhatsApp link
├── stores/
│   └── cartStore.ts         # Zustand store para carrito
├── hooks/                   # React hooks
│   ├── useProducts.ts       # TanStack Query
│   ├── useCategories.ts
│   └── useOrders.ts
├── components/
│   ├── admin/               # Componentes React del admin
│   │   ├── ProductTable.tsx
│   │   ├── ProductForm.tsx
│   │   ├── OrdersTable.tsx
│   │   ├── CategoryForm.tsx
│   │   ├── ImageUploader.tsx
│   │   └── DashboardStats.tsx
│   ├── cart/                # Componentes del carrito
│   │   ├── CartDrawer.tsx   # React
│   │   ├── CartItem.tsx
│   │   └── CheckoutForm.tsx
│   └── [existing components...]
├── pages/
│   ├── admin/               # Panel de administración
│   │   ├── login.astro
│   │   ├── index.astro
│   │   ├── productos/
│   │   │   ├── index.astro
│   │   │   ├── nuevo.astro
│   │   │   └── [id].astro
│   │   ├── categorias.astro
│   │   └── pedidos.astro
│   ├── api/                 # API endpoints (Astro endpoints)
│   │   ├── auth/
│   │   │   └── signout.ts
│   │   └── orders/
│   │       └── create.ts
│   ├── confirmacion.astro   # Página de confirmación de orden
│   ├── categoria/
│   │   └── [slug].astro     # Páginas de categoría (nuevo)
│   └── [existing pages...]
├── middleware.ts            # Protección de rutas admin
└── utils/
    ├── formatters.ts        # Helpers (precio, fecha)
    └── validators.ts        # Schemas Zod
```

---

### 2.2 Crear Clientes Supabase

**`src/lib/supabase.ts`** (cliente browser):

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**`src/lib/supabaseServer.ts`** (cliente server con cookies):

```typescript
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

export function createServerClient(cookies: AstroCookies) {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      storage: {
        getItem: (key) => {
          return cookies.get(key)?.value ?? null;
        },
        setItem: (key, value) => {
          cookies.set(key, value, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365, // 1 año
            sameSite: 'lax',
            secure: import.meta.env.PROD,
          });
        },
        removeItem: (key) => {
          cookies.delete(key, { path: '/' });
        },
      },
    },
  });
}
```

---

### 2.3 Configurar Middleware para Auth

**`src/middleware.ts`**:

```typescript
import { defineMiddleware } from 'astro:middleware';
import { createServerClient } from './lib/supabaseServer';

export const onRequest = defineMiddleware(async ({ cookies, url, redirect }, next) => {
  // Solo proteger rutas /admin/* excepto /admin/login
  if (url.pathname.startsWith('/admin') && url.pathname !== '/admin/login') {
    const supabase = createServerClient(cookies);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return redirect('/admin/login');
    }
    
    // Verificar que el usuario es admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', session.user.email)
      .single();
    
    if (!adminUser) {
      await supabase.auth.signOut();
      return redirect('/admin/login');
    }
  }
  
  return next();
});
```

---

### 2.4 Crear Store del Carrito

**`src/stores/cartStore.ts`**:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  finalPrice?: number;
  image?: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product) => {
        const items = get().items;
        const existingItem = items.find(item => item.productId === product.productId);
        
        if (existingItem) {
          // Incrementar cantidad
          set({
            items: items.map(item =>
              item.productId === product.productId
                ? { ...item, quantity: item.quantity + product.quantity }
                : item
            ),
          });
        } else {
          // Agregar nuevo item
          set({ items: [...items, product] });
        }
      },
      
      removeItem: (productId) => {
        set({ items: get().items.filter(item => item.productId !== productId) });
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        set({
          items: get().items.map(item =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        });
      },
      
      clearCart: () => {
        set({ items: [] });
      },
      
      getTotal: () => {
        return get().items.reduce((total, item) => {
          const price = item.finalPrice ?? item.price;
          return total + (price * item.quantity);
        }, 0);
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'kuruba-cart',
    }
  )
);
```

---

### 2.5 Actualizar Tipos

**Actualizar `src/types/product.ts`**:

```typescript
import type { ProductCardVariant } from "./productCard";

export type Product = {
  id: string;              // UUID de Supabase
  name: string;
  slug: string;            // Ya no opcional
  description?: string;
  category_id: string;     // UUID (renombrado de category)
  categoryLabel?: string;  // Joined data para display
  categorySlug?: string;   // Joined data para links
  price: number;
  final_price?: number;
  discount_pct?: number;
  image?: string;          // Cloudinary URL
  images?: string[];       // Array de Cloudinary URLs
  featured?: boolean;
  active?: boolean;
  cardVariant?: ProductCardVariant;
  created_at?: string;
  updated_at?: string;
};
```

**Crear `src/types/order.ts`**:

```typescript
export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
};

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled';

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  status: OrderStatus;
  notes?: string;
  whatsapp_sent_at?: string;
  email_sent_at?: string;
  created_at: string;
  updated_at?: string;
};

export type CreateOrderInput = {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  items: OrderItem[];
  total: number;
  notes?: string;
};
```

**Crear `src/types/category.ts`**:

```typescript
export type Category = {
  id: string;
  label: string;
  slug: string;
  order_position: number;
  active: boolean;
  created_at?: string;
};
```

---

### 2.6 Crear Utils y Helpers

**`src/utils/formatters.ts`**:

```typescript
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

**`src/utils/validators.ts`**:

```typescript
import { z } from 'zod';

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
  final_price: z.number().positive().optional().or(z.literal(0)),
  discount_pct: z.number().int().min(0).max(100).optional(),
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
```

**`src/lib/whatsapp.ts`**:

```typescript
import type { Order } from '../types/order';
import { formatPrice } from '../utils/formatters';

export function generateWhatsAppLink(order: Order): string {
  const phone = import.meta.env.PUBLIC_WHATSAPP_NUMBER;
  
  const message = `
🛍️ *Nuevo Pedido #${order.order_number}*

👤 Cliente: ${order.customer_name}
📱 Teléfono: ${order.customer_phone}
${order.customer_email ? `📧 Email: ${order.customer_email}` : ''}

📦 *Productos:*
${order.items.map(item => 
  `• ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`
).join('\n')}

💰 *Total: ${formatPrice(order.total)}*

${order.notes ? `📝 Notas: ${order.notes}` : ''}
  `.trim();
  
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// Para futura migración a WhatsApp Business API
export async function sendWhatsAppMessage(order: Order): Promise<boolean> {
  // TODO: Implementar cuando se active WhatsApp Business API
  // const USE_WHATSAPP_API = import.meta.env.USE_WHATSAPP_API === 'true';
  
  // if (USE_WHATSAPP_API) {
  //   // Llamar a Edge Function de Supabase que use WhatsApp Business API
  //   return true;
  // }
  
  // Por ahora, solo retornar false para indicar que se debe usar link directo
  return false;
}
```

**`src/lib/cloudinary.ts`**:

```typescript
export function getCloudinaryUrl(
  publicId: string,
  transformations?: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale';
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  }
): string {
  const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
  
  if (!transformations) {
    return `${baseUrl}/${publicId}`;
  }
  
  const transforms: string[] = [];
  
  if (transformations.width) transforms.push(`w_${transformations.width}`);
  if (transformations.height) transforms.push(`h_${transformations.height}`);
  if (transformations.crop) transforms.push(`c_${transformations.crop}`);
  if (transformations.quality) transforms.push(`q_${transformations.quality}`);
  if (transformations.format) transforms.push(`f_${transformations.format}`);
  
  const transformString = transforms.join(',');
  
  return `${baseUrl}/${transformString}/${publicId}`;
}

export const CLOUDINARY_PRESETS = {
  thumbnail: { width: 300, height: 375, crop: 'fill', quality: 'auto', format: 'auto' },
  main: { width: 800, height: 1000, crop: 'fill', quality: 'auto', format: 'auto' },
  gallery: { width: 1200, height: 1500, crop: 'fill', quality: 'auto', format: 'auto' },
} as const;
```

---

## **FASE 3: Migrar Páginas Públicas a Supabase**

### 3.1 Actualizar Página de Productos

**`src/pages/tienda.astro`**:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import ProductGrid from '../components/sections/ProductGrid.astro';
import FilterPanel from '../components/ui/FilterPanel.astro';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/product';

// Fetch productos activos con categorías
const { data: products, error } = await supabase
  .from('products')
  .select(`
    *,
    categories (
      label,
      slug
    )
  `)
  .eq('active', true)
  .order('created_at', { ascending: false });

if (error) {
  console.error('Error fetching products:', error);
}

// Mapear datos para coincidir con tipo Product
const mappedProducts: Product[] = (products || []).map(p => ({
  ...p,
  categoryLabel: p.categories?.label,
  categorySlug: p.categories?.slug,
}));

// Fetch categorías para filtros
const { data: categories } = await supabase
  .from('categories')
  .select('*')
  .eq('active', true)
  .order('order_position');
---

<BaseLayout title="Tienda - Kuruba Sexshop" description="Explora nuestro catálogo completo de productos">
  <main class="container mx-auto px-4 pt-20 pb-16">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-4xl font-bold">Todos los Productos</h1>
      <button
        id="filter-trigger"
        class="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filtrar
      </button>
    </div>

    <ProductGrid products={mappedProducts} />
    <FilterPanel categories={categories || []} />
  </main>
</BaseLayout>
```

---

### 3.2 Actualizar Producto Individual

**`src/pages/producto/[slug].astro`**:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../utils/formatters';
import type { Product } from '../../types/product';

export async function getStaticPaths() {
  const { data: products } = await supabase
    .from('products')
    .select('slug, active')
    .eq('active', true);
  
  return (products || []).map(product => ({
    params: { slug: product.slug },
  }));
}

const { slug } = Astro.params;

// Fetch producto con categoría
const { data: product, error } = await supabase
  .from('products')
  .select(`
    *,
    categories (
      label,
      slug
    )
  `)
  .eq('slug', slug)
  .single();

if (error || !product) {
  return Astro.redirect('/404');
}

const mappedProduct: Product = {
  ...product,
  categoryLabel: product.categories?.label,
  categorySlug: product.categories?.slug,
};

const displayPrice = mappedProduct.final_price || mappedProduct.price;
const hasDiscount = !!mappedProduct.final_price && mappedProduct.final_price < mappedProduct.price;
---

<BaseLayout 
  title={`${mappedProduct.name} - Kuruba Sexshop`}
  description={mappedProduct.description || `Compra ${mappedProduct.name} en Kuruba Sexshop`}
>
  <main class="container mx-auto px-4 pt-20 pb-16">
    <div class="grid md:grid-cols-2 gap-8 lg:gap-16">
      <!-- Galería de imágenes -->
      <div class="space-y-4">
        <div class="aspect-square rounded-2xl overflow-hidden bg-gray-100">
          <img
            id="main-image"
            src={mappedProduct.image || '/placeholder.png'}
            alt={mappedProduct.name}
            class="w-full h-full object-cover"
          />
        </div>
        
        {mappedProduct.images && mappedProduct.images.length > 1 && (
          <div class="grid grid-cols-4 gap-2">
            {mappedProduct.images.map((img, i) => (
              <button
                class="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-pink-500 transition thumbnail-btn"
                data-image={img}
              >
                <img src={img} alt={`${mappedProduct.name} ${i + 1}`} class="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <!-- Información del producto -->
      <div class="space-y-6">
        {mappedProduct.categoryLabel && (
          <a
            href={`/categoria/${mappedProduct.categorySlug}`}
            class="inline-block text-sm text-pink-600 hover:underline"
          >
            {mappedProduct.categoryLabel}
          </a>
        )}
        
        <h1 class="text-4xl font-bold">{mappedProduct.name}</h1>
        
        {mappedProduct.description && (
          <p class="text-gray-600 leading-relaxed">{mappedProduct.description}</p>
        )}
        
        <div class="flex items-baseline gap-3">
          <span class="text-4xl font-bold">{formatPrice(displayPrice)}</span>
          {hasDiscount && (
            <>
              <span class="text-xl text-gray-400 line-through">{formatPrice(mappedProduct.price)}</span>
              <span class="px-2 py-1 bg-pink-100 text-pink-600 rounded text-sm font-semibold">
                -{mappedProduct.discount_pct}%
              </span>
            </>
          )}
        </div>
        
        <div class="space-y-3">
          <button
            id="add-to-cart"
            data-product={JSON.stringify({
              productId: mappedProduct.id,
              name: mappedProduct.name,
              slug: mappedProduct.slug,
              price: mappedProduct.price,
              finalPrice: mappedProduct.final_price,
              image: mappedProduct.image,
            })}
            class="w-full py-4 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition"
          >
            Añadir al carrito
          </button>
          
          <a
            href="/tienda"
            class="block w-full py-4 border-2 border-gray-300 text-center rounded-lg font-semibold hover:border-pink-600 hover:text-pink-600 transition"
          >
            Seguir comprando
          </a>
        </div>
        
        <!-- Info adicional -->
        <div class="space-y-2 text-sm text-gray-600 pt-4 border-t">
          <p>✓ Producto bajo pedido (sin límite de stock)</p>
          <p>✓ Envío discreto</p>
          <p>✓ Pago seguro</p>
          <p>✓ Atención personalizada</p>
        </div>
      </div>
    </div>
  </main>

  <script>
    // Cambio de imagen en galería
    const mainImage = document.getElementById('main-image') as HTMLImageElement;
    const thumbnails = document.querySelectorAll('.thumbnail-btn');
    
    thumbnails.forEach(btn => {
      btn.addEventListener('click', () => {
        const newSrc = (btn as HTMLElement).dataset.image;
        if (newSrc && mainImage) {
          mainImage.src = newSrc;
        }
      });
    });
    
    // Añadir al carrito (se conectará con Zustand en siguiente fase)
    const addToCartBtn = document.getElementById('add-to-cart');
    addToCartBtn?.addEventListener('click', () => {
      const productData = addToCartBtn.dataset.product;
      if (productData) {
        const product = JSON.parse(productData);
        // TODO: Conectar con useCartStore en Fase 4
        console.log('Añadir producto:', product);
        alert('Producto añadido al carrito!');
      }
    });
  </script>
</BaseLayout>
```

---

### 3.3 Actualizar Homepage

**`src/pages/index.astro`**:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/sections/Hero.astro';
import CategoriesGrid from '../components/sections/CategoriesGrid.astro';
import FeaturedCarousel from '../components/sections/FeaturedCarousel.astro';
import { supabase } from '../lib/supabase';

// Fetch productos destacados agrupados por categoría
const { data: categories } = await supabase
  .from('categories')
  .select('*')
  .eq('active', true)
  .order('order_position');

const featuredByCategory = new Map();

if (categories) {
  for (const category of categories) {
    const { data: products } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          label,
          slug
        )
      `)
      .eq('category_id', category.id)
      .eq('active', true)
      .eq('featured', true)
      .limit(8);
    
    if (products && products.length > 0) {
      featuredByCategory.set(category.slug, {
        category: category.label,
        products: products.map(p => ({
          ...p,
          categoryLabel: p.categories?.label,
          categorySlug: p.categories?.slug,
        })),
      });
    }
  }
}
---

<BaseLayout 
  title="Kuruba Sexshop - Tu tienda de confianza"
  description="Encuentra los mejores productos para tu bienestar íntimo"
>
  <Hero />
  <CategoriesGrid />
  <FeaturedCarousel featuredByCategory={Object.fromEntries(featuredByCategory)} />
</BaseLayout>
```

---

### 3.4 Crear Páginas de Categoría

**`src/pages/categoria/[slug].astro`**:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ProductGrid from '../../components/sections/ProductGrid.astro';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/product';

export async function getStaticPaths() {
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, label, active')
    .eq('active', true);
  
  return (categories || []).map(category => ({
    params: { slug: category.slug },
    props: { categoryLabel: category.label },
  }));
}

const { slug } = Astro.params;
const { categoryLabel } = Astro.props;

// Fetch categoría
const { data: category } = await supabase
  .from('categories')
  .select('*')
  .eq('slug', slug)
  .single();

if (!category) {
  return Astro.redirect('/404');
}

// Fetch productos de la categoría
const { data: products } = await supabase
  .from('products')
  .select(`
    *,
    categories (
      label,
      slug
    )
  `)
  .eq('category_id', category.id)
  .eq('active', true)
  .order('created_at', { ascending: false });

const mappedProducts: Product[] = (products || []).map(p => ({
  ...p,
  categoryLabel: p.categories?.label,
  categorySlug: p.categories?.slug,
}));
---

<BaseLayout 
  title={`${categoryLabel} - Kuruba Sexshop`}
  description={`Explora nuestra selección de ${categoryLabel.toLowerCase()}`}
>
  <main class="container mx-auto px-4 pt-20 pb-16">
    <h1 class="text-4xl font-bold mb-8">{categoryLabel}</h1>
    
    {mappedProducts.length > 0 ? (
      <ProductGrid products={mappedProducts} />
    ) : (
      <div class="text-center py-16 text-gray-500">
        <p>No hay productos disponibles en esta categoría</p>
        <a href="/tienda" class="text-pink-600 hover:underline mt-4 inline-block">
          Ver todos los productos
        </a>
      </div>
    )}
  </main>
</BaseLayout>
```

---

## **FASE 4: Implementar Carrito de Compras**

### 4.1 Crear Componentes React del Carrito

**`src/components/cart/CartDrawer.tsx`**:

```tsx
import { useCartStore } from '../../stores/cartStore';
import { formatPrice } from '../../utils/formatters';
import CartItem from './CartItem';

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const items = useCartStore(state => state.items);
  const total = useCartStore(state => state.getTotal());
  const itemCount = useCartStore(state => state.getItemCount());

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">
            Carrito ({itemCount})
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="mb-4">Tu carrito está vacío</p>
              <button
                onClick={onClose}
                className="text-pink-600 hover:underline"
              >
                Ir a la tienda
              </button>
            </div>
          ) : (
            items.map(item => (
              <CartItem key={item.productId} item={item} />
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-6 space-y-4">
            <div className="flex justify-between text-xl font-bold">
              <span>Total:</span>
              <span>{formatPrice(total)}</span>
            </div>
            <a
              href="/checkout"
              className="block w-full py-4 bg-pink-600 text-white text-center rounded-lg font-semibold hover:bg-pink-700 transition"
            >
              Proceder al Checkout
            </a>
          </div>
        )}
      </div>
    </>
  );
}
```

**`src/components/cart/CartItem.tsx`**:

```tsx
import { useCartStore, type CartItem as CartItemType } from '../../stores/cartStore';
import { formatPrice } from '../../utils/formatters';

export default function CartItem({ item }: { item: CartItemType }) {
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);

  const price = item.finalPrice ?? item.price;
  const subtotal = price * item.quantity;

  return (
    <div className="flex gap-4 pb-4 border-b">
      <a href={`/producto/${item.slug}`} className="flex-shrink-0">
        <img
          src={item.image || '/placeholder.png'}
          alt={item.name}
          className="w-20 h-20 object-cover rounded-lg"
        />
      </a>
      
      <div className="flex-1 min-w-0">
        <a
          href={`/producto/${item.slug}`}
          className="font-semibold hover:text-pink-600 transition line-clamp-2"
        >
          {item.name}
        </a>
        <p className="text-gray-600 text-sm mt-1">{formatPrice(price)}</p>
        
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center border rounded-lg">
            <button
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              className="px-3 py-1 hover:bg-gray-100 transition"
              disabled={item.quantity <= 1}
            >
              −
            </button>
            <span className="px-4 py-1 border-x">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              className="px-3 py-1 hover:bg-gray-100 transition"
            >
              +
            </button>
          </div>
          
          <button
            onClick={() => removeItem(item.productId)}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Eliminar
          </button>
        </div>
      </div>
      
      <div className="text-right">
        <p className="font-semibold">{formatPrice(subtotal)}</p>
      </div>
    </div>
  );
}
```

**`src/components/cart/CheckoutForm.tsx`**:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCartStore } from '../../stores/cartStore';
import type { CreateOrderInput } from '../../types/order';

const checkoutSchema = z.object({
  customer_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  customer_phone: z.string().regex(/^[0-9]{10}$/, 'El teléfono debe tener 10 dígitos'),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutForm() {
  const items = useCartStore(state => state.items);
  const total = useCartStore(state => state.getTotal());
  const clearCart = useCartStore(state => state.clearCart);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  const onSubmit = async (data: CheckoutFormData) => {
    const orderData: CreateOrderInput = {
      ...data,
      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.finalPrice ?? item.price,
        image: item.image,
      })),
      total,
    };

    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) throw new Error('Error al crear la orden');

      const result = await response.json();
      
      // Abrir WhatsApp
      window.open(result.whatsappLink, '_blank');
      
      // Limpiar carrito
      clearCart();
      
      // Redirigir a confirmación
      window.location.href = `/confirmacion?order=${result.orderId}`;
    } catch (error) {
      console.error('Error:', error);
      alert('Hubo un error al procesar tu pedido. Por favor intenta de nuevo.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold mb-2">Nombre completo *</label>
        <input
          {...register('customer_name')}
          type="text"
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="Juan Pérez"
        />
        {errors.customer_name && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Teléfono *</label>
        <input
          {...register('customer_phone')}
          type="tel"
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="3001234567"
        />
        {errors.customer_phone && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_phone.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Email (opcional)</label>
        <input
          {...register('customer_email')}
          type="email"
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="correo@ejemplo.com"
        />
        {errors.customer_email && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Notas adicionales (opcional)</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="Instrucciones especiales de envío, etc."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || items.length === 0}
        className="w-full py-4 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Procesando...' : 'Finalizar Pedido'}
      </button>
    </form>
  );
}
```

---

### 4.2 Integrar Carrito en Header

**Actualizar `src/components/layout/Header.astro`**:

```astro
---
import Nav from './Nav.astro';
import Icon from 'astro-icon';
---

<header class="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 h-10">
  <div class="container mx-auto px-4 h-full flex items-center justify-between">
    <a href="/" class="font-bold text-xl text-pink-600">Kuruba</a>
    
    <Nav />
    
    <div class="flex items-center gap-4">
      <button id="search-btn" class="p-2 hover:bg-gray-100 rounded-full transition" aria-label="Buscar">
        <Icon name="search" size={20} />
      </button>
      
      <button id="favorites-btn" class="p-2 hover:bg-gray-100 rounded-full transition" aria-label="Favoritos">
        <Icon name="heart" size={20} />
      </button>
      
      <button id="cart-btn" class="p-2 hover:bg-gray-100 rounded-full transition relative" aria-label="Carrito">
        <Icon name="cart" size={20} />
        <span id="cart-badge" class="hidden absolute -top-1 -right-1 bg-pink-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          0
        </span>
      </button>
    </div>
  </div>
</header>

<div id="cart-root"></div>

<script>
  import { createRoot } from 'react-dom/client';
  import { createElement } from 'react';
  import CartDrawer from '../cart/CartDrawer';
  import { useCartStore } from '../../stores/cartStore';

  let isCartOpen = false;
  let cartRoot: any = null;

  function renderCart() {
    const container = document.getElementById('cart-root');
    if (!container) return;

    if (!cartRoot) {
      cartRoot = createRoot(container);
    }

    cartRoot.render(
      createElement(CartDrawer, {
        isOpen: isCartOpen,
        onClose: () => {
          isCartOpen = false;
          renderCart();
        },
      })
    );
  }

  // Inicializar
  renderCart();

  // Abrir carrito
  const cartBtn = document.getElementById('cart-btn');
  cartBtn?.addEventListener('click', () => {
    isCartOpen = true;
    renderCart();
  });

  // Actualizar badge
  function updateBadge() {
    const itemCount = useCartStore.getState().getItemCount();
    const badge = document.getElementById('cart-badge');
    
    if (badge) {
      if (itemCount > 0) {
        badge.textContent = itemCount.toString();
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  // Suscribirse a cambios del store
  useCartStore.subscribe(updateBadge);
  updateBadge();
</script>
```

---

### 4.3 Crear Página de Checkout

**`src/pages/checkout.astro`**:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import CheckoutForm from '../components/cart/CheckoutForm';
---

<BaseLayout title="Checkout - Kuruba Sexshop">
  <main class="container mx-auto px-4 pt-20 pb-16">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-4xl font-bold mb-8">Finalizar Pedido</h1>
      
      <div class="bg-white rounded-2xl shadow-lg p-8">
        <CheckoutForm client:load />
      </div>
    </div>
  </main>
</BaseLayout>
```

---

## **FASE 5: Sistema de Órdenes y WhatsApp**

### 5.1 Crear API Endpoint para Órdenes

**`src/pages/api/orders/create.ts`**:

```typescript
import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { orderSchema } from '../../../utils/validators';
import { generateWhatsAppLink } from '../../../lib/whatsapp';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validar datos
    const validatedData = orderSchema.parse(body);
    
    // Generar número de orden único
    const orderDate = new Date();
    const dateStr = orderDate.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `KRB-${dateStr}-${randomNum}`;
    
    // Crear orden en Supabase
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: validatedData.customer_name,
        customer_phone: validatedData.customer_phone,
        customer_email: validatedData.customer_email || null,
        items: validatedData.items,
        subtotal: validatedData.total,
        shipping_cost: 0,
        total: validatedData.total,
        status: 'pending',
        notes: validatedData.notes || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating order:', error);
      return new Response(JSON.stringify({ error: 'Error al crear la orden' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Generar link de WhatsApp
    const whatsappLink = generateWhatsAppLink(order);
    
    // Actualizar orden con timestamp de WhatsApp
    await supabase
      .from('orders')
      .update({ whatsapp_sent_at: new Date().toISOString() })
      .eq('id', order.id);
    
    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        whatsappLink,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Datos inválidos' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
```

---

### 5.2 Crear Página de Confirmación

**`src/pages/confirmacion.astro`**:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { supabase } from '../lib/supabase';
import { formatPrice, formatDateTime } from '../utils/formatters';

const orderId = Astro.url.searchParams.get('order');

if (!orderId) {
  return Astro.redirect('/tienda');
}

const { data: order, error } = await supabase
  .from('orders')
  .select('*')
  .eq('id', orderId)
  .single();

if (error || !order) {
  return Astro.redirect('/tienda');
}
---

<BaseLayout title="Pedido Confirmado - Kuruba Sexshop">
  <main class="container mx-auto px-4 pt-20 pb-16">
    <div class="max-w-2xl mx-auto">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="text-4xl font-bold mb-2">¡Pedido Confirmado!</h1>
        <p class="text-gray-600">Pedido #{order.order_number}</p>
      </div>

      <div class="bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div>
          <h2 class="text-xl font-bold mb-4">Detalles del Pedido</h2>
          <div class="space-y-2 text-gray-600">
            <p><strong>Nombre:</strong> {order.customer_name}</p>
            <p><strong>Teléfono:</strong> {order.customer_phone}</p>
            {order.customer_email && <p><strong>Email:</strong> {order.customer_email}</p>}
            <p><strong>Fecha:</strong> {formatDateTime(order.created_at)}</p>
          </div>
        </div>

        <div class="border-t pt-6">
          <h3 class="font-bold mb-4">Productos</h3>
          <div class="space-y-3">
            {order.items.map((item: any) => (
              <div class="flex justify-between">
                <div>
                  <p class="font-semibold">{item.name}</p>
                  <p class="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                </div>
                <p class="font-semibold">{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
        </div>

        <div class="border-t pt-6">
          <div class="flex justify-between text-xl font-bold">
            <span>Total:</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        <div class="bg-pink-50 rounded-lg p-4 text-center">
          <p class="text-gray-700 mb-2">
            ✓ Tu pedido ha sido enviado por WhatsApp
          </p>
          <p class="text-sm text-gray-600">
            Nos pondremos en contacto contigo pronto para confirmar los detalles.
          </p>
        </div>

        <a
          href="/tienda"
          class="block w-full py-4 bg-pink-600 text-white text-center rounded-lg font-semibold hover:bg-pink-700 transition"
        >
          Volver a la Tienda
        </a>
      </div>
    </div>
  </main>
</BaseLayout>
```

---

## **FASE 6: Panel de Administración**

### 6.1 Crear Sistema de Login

**`src/pages/admin/login.astro`**:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { createServerClient } from '../../lib/supabaseServer';

// Si ya está autenticado, redirigir
const supabase = createServerClient(Astro.cookies);
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  return Astro.redirect('/admin');
}
---

<BaseLayout title="Admin Login - Kuruba">
  <main class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold mb-2">Kuruba Admin</h1>
        <p class="text-gray-600">Accede al panel de administración</p>
      </div>

      <div class="bg-white rounded-2xl shadow-lg p-8">
        <form id="login-form" class="space-y-6">
          <div>
            <label class="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              name="email"
              required
              class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="admin@kuruba.com"
            />
          </div>

          <button
            type="submit"
            class="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition"
          >
            Enviar Magic Link
          </button>
        </form>

        <div id="message" class="mt-4 text-center text-sm hidden"></div>
      </div>
    </div>
  </main>

  <script>
    import { supabase } from '../../lib/supabase';

    const form = document.getElementById('login-form') as HTMLFormElement;
    const messageEl = document.getElementById('message');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const email = formData.get('email') as string;

      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
          },
        });

        if (error) throw error;

        if (messageEl) {
          messageEl.textContent = '✓ Revisa tu email para el link de acceso';
          messageEl.classList.remove('hidden', 'text-red-500');
          messageEl.classList.add('text-green-600');
        }

        form.reset();
      } catch (error: any) {
        if (messageEl) {
          messageEl.textContent = `Error: ${error.message}`;
          messageEl.classList.remove('hidden', 'text-green-600');
          messageEl.classList.add('text-red-500');
        }
      }
    });
  </script>
</BaseLayout>
```

**`src/pages/api/auth/signout.ts`**:

```typescript
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabaseServer';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const supabase = createServerClient(cookies);
  await supabase.auth.signOut();
  
  return redirect('/admin/login');
};
```

---

### 6.2 Crear Layout Admin

**`src/layouts/BaseAdminLayout.astro`**:

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>{title} - Admin Kuruba</title>
</head>
<body class="bg-gray-50">
  <div class="flex h-screen">
    <!-- Sidebar -->
    <aside class="w-64 bg-white shadow-lg">
      <div class="p-6 border-b">
        <h1 class="text-2xl font-bold text-pink-600">Kuruba Admin</h1>
      </div>
      
      <nav class="p-4 space-y-2">
        <a href="/admin" class="block px-4 py-2 rounded-lg hover:bg-pink-50 hover:text-pink-600 transition">
          Dashboard
        </a>
        <a href="/admin/productos" class="block px-4 py-2 rounded-lg hover:bg-pink-50 hover:text-pink-600 transition">
          Productos
        </a>
        <a href="/admin/categorias" class="block px-4 py-2 rounded-lg hover:bg-pink-50 hover:text-pink-600 transition">
          Categorías
        </a>
        <a href="/admin/pedidos" class="block px-4 py-2 rounded-lg hover:bg-pink-50 hover:text-pink-600 transition">
          Pedidos
        </a>
      </nav>
      
      <div class="absolute bottom-0 w-64 p-4 border-t">
        <form action="/api/auth/signout" method="POST">
          <button type="submit" class="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition">
            Cerrar Sesión
          </button>
        </form>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto">
      <div class="p-8">
        <slot />
      </div>
    </main>
  </div>
</body>
</html>
```

---

### 6.3 Crear Dashboard Admin

**`src/pages/admin/index.astro`**:

```astro
---
import BaseAdminLayout from '../../layouts/BaseAdminLayout.astro';
import { supabase } from '../../lib/supabase';

// Obtener estadísticas
const { count: totalProducts } = await supabase
  .from('products')
  .select('*', { count: 'exact', head: true });

const { count: activeProducts } = await supabase
  .from('products')
  .select('*', { count: 'exact', head: true })
  .eq('active', true);

const { count: pendingOrders } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'pending');

const today = new Date();
today.setHours(0, 0, 0, 0);

const { count: todayOrders } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', today.toISOString());
---

<BaseAdminLayout title="Dashboard">
  <h1 class="text-4xl font-bold mb-8">Dashboard</h1>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-gray-600 text-sm">Total Productos</p>
          <p class="text-3xl font-bold mt-2">{totalProducts || 0}</p>
        </div>
        <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-gray-600 text-sm">Productos Activos</p>
          <p class="text-3xl font-bold mt-2">{activeProducts || 0}</p>
        </div>
        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-gray-600 text-sm">Pedidos Pendientes</p>
          <p class="text-3xl font-bold mt-2">{pendingOrders || 0}</p>
        </div>
        <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-gray-600 text-sm">Pedidos Hoy</p>
          <p class="text-3xl font-bold mt-2">{todayOrders || 0}</p>
        </div>
        <div class="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4">Accesos Rápidos</h2>
      <div class="space-y-3">
        <a href="/admin/productos/nuevo" class="block px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-center">
          + Nuevo Producto
        </a>
        <a href="/admin/pedidos" class="block px-4 py-3 border-2 border-pink-600 text-pink-600 rounded-lg hover:bg-pink-50 transition text-center">
          Ver Pedidos
        </a>
        <a href="/" target="_blank" class="block px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-center">
          Ver Sitio Público
        </a>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4">Información</h2>
      <div class="space-y-2 text-sm text-gray-600">
        <p>• Los productos deben estar activos para ser visibles en la tienda</p>
        <p>• Las categorías inactivas no se muestran en el sitio público</p>
        <p>• Los pedidos se envían automáticamente por WhatsApp</p>
        <p>• Todos los productos se venden bajo pedido sin límite de stock</p>
      </div>
    </div>
  </div>
</BaseAdminLayout>
```

---

### 6.4 Panel de Productos

**Nota:** La implementación completa del panel de productos (tablas, formularios, Cloudinary uploader) excede el límite de espacio de este documento. Consulta las secciones 6.3 y 6.4 del plan para ver las especificaciones completas.

**Archivos clave:**
- `src/pages/admin/productos/index.astro`
- `src/pages/admin/productos/nuevo.astro`
- `src/pages/admin/productos/[id].astro`
- `src/components/admin/ProductTable.tsx`
- `src/components/admin/ProductForm.tsx`
- `src/components/admin/ImageUploader.tsx`

**Campos del formulario de productos:**
- Nombre, slug, descripción
- Categoría, precio, precio final, % descuento
- Imagen principal y galería (Cloudinary)
- Featured (destacado), activo

**Columnas de la tabla de productos:**
- Imagen, Nombre, Categoría, Precio, Estado (activo/inactivo), Acciones

⚠️ **Importante:** Los productos se venden bajo pedido sin límite de stock, por lo que NO hay gestión de inventario.

---

## **FASE 7: Optimizaciones y Extras**

### 7.1 Emails Opcionales con Resend

**Instalación:**
```bash
npm install resend
```

**`src/lib/email.ts`**:

```typescript
import { Resend } from 'resend';
import type { Order } from '../types/order';
import { formatPrice, formatDateTime } from '../utils/formatters';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export async function sendOrderConfirmationToCustomer(order: Order) {
  if (!order.customer_email) return;

  try {
    await resend.emails.send({
      from: 'Kuruba Sexshop <pedidos@kuruba.com>',
      to: order.customer_email,
      subject: `Confirmación de pedido #${order.order_number}`,
      html: `
        <h1>¡Gracias por tu pedido!</h1>
        <p>Hola ${order.customer_name},</p>
        <p>Tu pedido <strong>#${order.order_number}</strong> ha sido recibido.</p>
        
        <h2>Resumen del pedido:</h2>
        <ul>
          ${order.items.map(item => `
            <li>${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}</li>
          `).join('')}
        </ul>
        
        <p><strong>Total: ${formatPrice(order.total)}</strong></p>
        
        <p>Nos pondremos en contacto contigo pronto para confirmar los detalles.</p>
        
        <p>Gracias por confiar en Kuruba Sexshop!</p>
      `,
    });
  } catch (error) {
    console.error('Error sending customer email:', error);
  }
}

export async function sendOrderNotificationToAdmin(order: Order) {
  try {
    await resend.emails.send({
      from: 'Sistema Kuruba <sistema@kuruba.com>',
      to: import.meta.env.PUBLIC_ADMIN_EMAIL,
      subject: `Nuevo pedido #${order.order_number}`,
      html: `
        <h1>Nuevo pedido recibido</h1>
        
        <h2>Información del cliente:</h2>
        <ul>
          <li><strong>Nombre:</strong> ${order.customer_name}</li>
          <li><strong>Teléfono:</strong> ${order.customer_phone}</li>
          ${order.customer_email ? `<li><strong>Email:</strong> ${order.customer_email}</li>` : ''}
        </ul>
        
        <h2>Productos:</h2>
        <ul>
          ${order.items.map(item => `
            <li>${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}</li>
          `).join('')}
        </ul>
        
        <p><strong>Total: ${formatPrice(order.total)}</strong></p>
        
        ${order.notes ? `<p><strong>Notas:</strong> ${order.notes}</p>` : ''}
        
        <p>Pedido creado: ${formatDateTime(order.created_at)}</p>
      `,
    });
  } catch (error) {
    console.error('Error sending admin email:', error);
  }
}
```

**Integrar en `/api/orders/create`:**
```typescript
// Después de crear la orden
await sendOrderConfirmationToCustomer(order);
await sendOrderNotificationToAdmin(order);
```

---

### 7.2 SEO

**Actualizar `src/layouts/BaseLayout.astro`:**

```astro
---
interface Props {
  title: string;
  description?: string;
  image?: string;
  noindex?: boolean;
}

const { 
  title, 
  description = 'Tu tienda de confianza para productos de bienestar íntimo',
  image = '/og-image.jpg',
  noindex = false
} = Astro.props;

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonicalURL} />
  
  {noindex && <meta name="robots" content="noindex, nofollow" />}
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={new URL(image, Astro.site)} />
  <meta property="og:url" content={canonicalURL} />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={new URL(image, Astro.site)} />
  
  <!-- Resto del head... -->
</head>
<!-- ... -->
```

---

## **Checklist de Implementación**

### Fase 1: Infraestructura
- [ ] Crear proyecto Supabase
- [ ] Ejecutar esquema SQL (tablas, índices, triggers)
- [ ] Configurar RLS (Row Level Security)
- [ ] Insertar categorías iniciales
- [ ] Crear cuenta Cloudinary
- [ ] Configurar upload preset
- [ ] Instalar dependencias npm
- [ ] Configurar variables de entorno (.env)
- [ ] Actualizar .gitignore

### Fase 2: Configuración Astro
- [ ] Crear estructura de carpetas
- [ ] Configurar clientes Supabase (browser/server)
- [ ] Crear middleware de autenticación
- [ ] Crear store del carrito (Zustand)
- [ ] Actualizar tipos TypeScript
- [ ] Crear utils (formatters, validators)
- [ ] Crear helpers (WhatsApp, Cloudinary)

### Fase 3: Páginas Públicas
- [ ] Migrar /tienda a Supabase
- [ ] Migrar /producto/[slug] a Supabase
- [ ] Migrar homepage a Supabase
- [ ] Crear páginas de categoría /categoria/[slug]
- [ ] Actualizar componentes (ProductCard, ProductGrid, etc.)
- [ ] Probar que todas las páginas cargan correctamente

### Fase 4: Carrito
- [ ] Crear CartDrawer component
- [ ] Crear CartItem component
- [ ] Crear CheckoutForm component
- [ ] Integrar carrito en Header
- [ ] Crear página /checkout
- [ ] Conectar botones "Añadir al carrito"
- [ ] Probar flujo completo del carrito

### Fase 5: Órdenes
- [ ] Crear API endpoint /api/orders/create
- [ ] Crear página de confirmación
- [ ] Integrar generación de WhatsApp link
- [ ] Probar creación de órdenes
- [ ] Verificar que órdenes se guardan en Supabase
- [ ] Verificar que WhatsApp se abre con mensaje correcto

### Fase 6: Admin Panel
- [ ] Crear página de login
- [ ] Crear API endpoint de logout
- [ ] Crear BaseAdminLayout
- [ ] Crear dashboard con estadísticas
- [ ] Crear tabla de productos
- [ ] Crear formulario de productos
- [ ] Integrar Cloudinary uploader
- [ ] Crear panel de categorías
- [ ] Crear tabla de pedidos
- [ ] Probar CRUD completo de productos
- [ ] Probar actualización de estados de pedidos
- [ ] Registrar usuario admin en Supabase

### Fase 7: Extras
- [ ] Configurar Resend (emails)
- [ ] Implementar envío de emails
- [ ] Agregar meta tags SEO
- [ ] Optimizar imágenes
- [ ] Implementar búsqueda (opcional)
- [ ] Implementar favoritos (opcional)

### Deploy
- [ ] Build local: `npm run build`
- [ ] Probar preview: `npm run preview`
- [ ] Configurar Vercel/Netlify
- [ ] Configurar variables de entorno en producción
- [ ] Deploy
- [ ] Configurar dominio
- [ ] Probar sitio en producción
- [ ] Lighthouse audit

---

## **Comandos Útiles**

```bash
# Desarrollo
npm run dev                # Iniciar servidor de desarrollo
npm run build             # Build para producción
npm run preview           # Preview del build

# Supabase (si usas CLI local)
npx supabase login
npx supabase init
npx supabase db push      # Aplicar migraciones

# Linting y formato (opcional, agregar luego)
npm run lint
npm run format

# Tipos
npm run check             # Verificar tipos TypeScript
```

---

## **Recursos y Documentación**

- **Astro:** https://docs.astro.build
- **Supabase:** https://supabase.com/docs
- **Cloudinary:** https://cloudinary.com/documentation
- **Zustand:** https://github.com/pmndrs/zustand
- **React Hook Form:** https://react-hook-form.com
- **TanStack Query:** https://tanstack.com/query/latest
- **Resend:** https://resend.com/docs

---

## **Notas Finales**

1. **Seguridad:** Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` en el frontend
2. **Performance:** Usa Cloudinary transformaciones para imágenes optimizadas
3. **Stock:** Los productos se venden bajo pedido sin límite de stock
4. **Admin:** La dueña debe tener acceso al dashboard de Supabase para backups
5. **Backup:** Configura backups automáticos en Supabase
6. **Migración WhatsApp:** Preparar para WhatsApp Business API con feature flag

---

**¿Listo para empezar la implementación?**

Podemos proceder fase por fase. Te recomiendo comenzar con:
1. Crear el proyecto Supabase
2. Ejecutar el esquema SQL
3. Configurar Cloudinary
4. Instalar dependencias

Avísame cuando estés listo para la siguiente fase.
