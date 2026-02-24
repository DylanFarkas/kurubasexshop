import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return new Response(JSON.stringify({ products: [] }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    // Buscar productos por nombre (case-insensitive)
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        price,
        final_price,
        image,
        images,
        categories (label)
      `)
      .eq('active', true)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10);

    if (error) {
      console.error('Error searching products:', error);
      return new Response(JSON.stringify({ error: 'Error searching products' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Mapear los productos con categoryLabel
    const mappedProducts = (products || []).map(p => {
      const category = p.categories as any;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        final_price: p.final_price,
        image: p.image,
        images: p.images,
        categoryLabel: category?.label,
      };
    });

    return new Response(JSON.stringify({ products: mappedProducts }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Unexpected error occurred' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
