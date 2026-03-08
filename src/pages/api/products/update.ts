import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabaseServer';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { productSchema } from '../../../utils/validators';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación del usuario
    const supabase = createServerClient(cookies);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!session) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No autenticado. Por favor, inicia sesión nuevamente.' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Leer el body correctamente en Astro
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Content-Type debe ser application/json' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'ID del producto requerido' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar datos con Zod (sin el ID)
    const { id: _id, ...dataToValidate } = body;
    const validatedData = productSchema.parse(dataToValidate);

    // Actualizar producto en Supabase usando Admin client (bypass RLS)
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .update({
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        // Ya no usamos category_id - se maneja con la tabla de unión
        price: validatedData.price,
        final_price: validatedData.final_price || null,
        discount_pct: validatedData.discount_pct || null,
        image: validatedData.image,
        images: validatedData.images,
        featured: validatedData.featured || false,
        active: validatedData.active !== undefined ? validatedData.active : true,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: error.message || 'Error al actualizar el producto' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sincronizar categorías usando la función de Supabase
    if (validatedData.category_ids) {
      const { error: categoriesError } = await supabaseAdmin.rpc(
        'sync_product_categories',
        {
          p_product_id: id,
          p_category_ids: validatedData.category_ids,
        }
      );

      if (categoriesError) {
        console.error('Error syncing categories:', categoriesError);
        // No fallar completamente, solo advertir
        console.warn('Producto actualizado pero hubo un error al sincronizar categorías');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        product,
        message: 'Producto actualizado exitosamente'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating product:', error);
    
    // Error de validación de Zod
    if (error instanceof Error && error.name === 'ZodError') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Datos inválidos',
          errors: error
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
