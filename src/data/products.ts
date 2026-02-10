import type { Product } from "../types/product";

/**
 * Lista maestra de TODOS los productos de la tienda
 * Aquí defines todos tus productos y controlas:
 * - featured: true/false (si aparece en carouseles destacados)
 * - active: true/false (si está disponible para venta)
 * - category: en qué categoría aparece
 */
export const allProducts: Product[] = [
  // ==================== JUGUETES ====================
  {
    id: "j1",
    name: "Vibrador Compact Pro",
    category: "Juguetes",
    price: 129000,
    final_price: 109000,
    discount_pct: 16,
    image: "/imgs/products/jueguete.png",
    slug: "vibrador-compact-pro",
    featured: true, // ✅ Aparece en carousel destacado
    active: true, // ✅ Disponible para venta
  },
  {
    id: "j2",
    name: "Anillo Vibrador",
    category: "Juguetes",
    price: 69000,
    image: "/products/juguete-2.jpg",
    slug: "anillo-vibrador",
    featured: true,
    active: true,
  },
  {
    id: "j3",
    name: "Bala Vibradora",
    category: "Juguetes",
    price: 59000,
    image: "/products/juguete-3.jpg",
    slug: "bala-vibradora",
    featured: true,
    active: true,
  },
  {
    id: "j4",
    name: "Masturbador Masculino Turbo",
    category: "Juguetes",
    price: 99000,
    final_price: 85000,
    discount_pct: 14,
    image: "/products/juguete-4.jpg",
    slug: "masturbador-turbo",
    featured: true,
    active: true,
  },
  {
    id: "j5",
    name: "Consolador Realista",
    category: "Juguetes",
    price: 149000,
    image: "/products/juguete-5.jpg",
    slug: "consolador-realista",
    featured: false, // ❌ NO aparece en carousel
    active: true, // ✅ Pero sí está disponible en tienda
  },

  // ==================== LUBRICANTES ====================
  {
    id: "l1",
    name: "Lubricante Base Agua 100ml",
    category: "Lubricantes",
    price: 35000,
    image: "/imgs/products/mango.png",
    images: ["/imgs/products/mango.png", "/imgs/products/mango-2.png"],
    slug: "lub-mango",
    featured: true,
    active: true,
    cardVariant: {
      cardClass: "border-[#FF6B57] border-1 hover:border[#FF6B57]",
      buttonClass: "bg-[#FF6B57] hover:bg-[#FF6B57]",
      iconClass: "text-white",
      mediaClass: "bg-[#FADCDC]",
    },
  },
  {
    id: "l2",
    name: "Lubricante Efecto Calor",
    category: "Lubricantes",
    price: 42000,
    image: "/imgs/products/lyche.png",
    slug: "lub-calor",
    featured: true,
    active: true,
    cardVariant: {
      cardClass: "border-[#FDB3FD] border-1 hover:border-[#FDB3FD]",
      buttonClass: "bg-[#FDB3FD] hover:bg-[#FDB3FD]",
      iconClass: "text-white",
      mediaClass: "bg-[#FEF3FE]",
    },
  },
  {
    id: "l3",
    name: "Lubricante Premium 250ml",
    category: "Lubricantes",
    price: 69000,
    final_price: 62000,
    discount_pct: 10,
    image: "/imgs/products/caramelo.png",
    slug: "lub-premium-250",
    featured: true,
    active: true,
    cardVariant: {
      cardClass: "border-[#FFA857] border-1 hover:border-[#FFA857]",
      buttonClass: "bg-[#FFA857] hover:bg-[#FFA857]",
      iconClass: "text-white",
      mediaClass: "bg-[#FCEDDD]",
    },
  },
  {
    id: "l4",
    name: "Lubricante Siliconado 150ml",
    category: "Lubricantes",
    price: 55000,
    image: "/products/lubricante-4.jpg",
    slug: "lub-siliconado",
    featured: false,
    active: true,
  },

  // ==================== LENCERÍA ====================
  {
    id: "le1",
    name: "Body Encaje Noir",
    category: "Lencería",
    price: 89000,
    image: "/products/lenceria-1.jpg",
    slug: "body-encaje-noir",
    featured: true,
    active: true,
  },
  {
    id: "le2",
    name: "Conjunto Rojo",
    category: "Lencería",
    price: 79000,
    image: "/products/lenceria-2.jpg",
    slug: "conjunto-rojo",
    featured: true,
    active: true,
  },
  {
    id: "le3",
    name: "Baby Doll Rosa",
    category: "Lencería",
    price: 65000,
    image: "/products/lenceria-3.jpg",
    slug: "baby-doll-rosa",
    featured: false,
    active: true,
  },
];

// ==================== FUNCIONES HELPER ====================

/**
 * Obtiene solo los productos activos
 */
export function getActiveProducts(): Product[] {
  return allProducts.filter((p) => p.active === true);
}

/**
 * Obtiene productos destacados (para carouseles)
 * filtrados por categoría
 */
export function getFeaturedByCategory(category: string): Product[] {
  return allProducts.filter(
    (p) => p.category === category && p.featured === true && p.active === true,
  );
}

/**
 * Obtiene todos los productos destacados
 */
export function getAllFeaturedProducts(): Product[] {
  return allProducts.filter((p) => p.featured === true && p.active === true);
}

/**
 * Obtiene productos por categoría (activos)
 */
export function getProductsByCategory(category: string): Product[] {
  return allProducts.filter(
    (p) => p.category === category && p.active === true,
  );
}

/**
 * Obtiene un producto por slug
 */
export function getProductBySlug(slug: string): Product | undefined {
  return allProducts.find((p) => p.slug === slug);
}

/**
 * Obtiene un producto por ID
 */
export function getProductById(id: string): Product | undefined {
  return allProducts.find((p) => p.id === id);
}

/**
 * Obtiene productos destacados agrupados por categoría
 * (Para los carouseles)
 */
export function getFeaturedProductsByCategory(): Record<string, Product[]> {
  const result: Record<string, Product[]> = {};

  allProducts.forEach((product) => {
    if (product.featured && product.active) {
      if (!result[product.category]) {
        result[product.category] = [];
      }
      result[product.category].push(product);
    }
  });

  return result;
}