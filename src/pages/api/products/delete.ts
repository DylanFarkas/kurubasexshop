import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabaseServer';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación del usuario
    const supabase = createServerClient(cookies);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No autenticado' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = await request.json();

    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'ID del producto requerido' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Eliminar producto usando Admin client
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: error.message || 'Error al eliminar el producto' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Producto eliminado exitosamente'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error deleting product:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
