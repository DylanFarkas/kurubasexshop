import type { ProductCardVariant } from "./productCard";
import type { Category } from "./category";

export type Product = {
  id: string;              // UUID de Supabase
  name: string;
  slug: string;            // Ya no opcional
  description?: string;
  // Relación muchos-a-muchos con categorías
  category_ids?: string[]; // Array de UUIDs de categorías (para formularios)
  categories?: Category[]; // Joined data completo desde Supabase
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