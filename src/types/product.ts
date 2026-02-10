import type { ProductCardVariant } from "./productCard";

export type Product = {
    id: string;
    name: string;
    description?: string;
    category: string;
    price: number;
    final_price?: number;
    discount_pct?: number;
    image?: string;
    images?: string[];
    slug?: string;
    featured?: boolean;
    active?: boolean;
    cardVariant?: ProductCardVariant;
}