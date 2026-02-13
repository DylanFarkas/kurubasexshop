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