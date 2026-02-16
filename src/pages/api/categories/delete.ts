import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const prerender = false;

export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    const id = url.searchParams.get('id');
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'ID de categoría requerido' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar si hay productos asociados a esta categoría
    const { count: productCount } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    if (productCount && productCount > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `No se puede eliminar. Hay ${productCount} producto(s) asociado(s) a esta categoría.` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Eliminar categoría
    const { error: categoryError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id);

    if (categoryError) {
      console.error('Error deleting category:', categoryError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error al eliminar la categoría',
          error: categoryError.message,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Categoría eliminada exitosamente',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing category deletion:', error);

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error interno del servidor' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};