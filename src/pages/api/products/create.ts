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

    // Validar datos con Zod
    const validatedData = productSchema.parse(body);

    // Insertar producto en Supabase usando Admin client (bypass RLS)
    // TODO: Cambiar a 'supabase' cuando admin_users esté correctamente configurado
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert([{
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        category_id: validatedData.category_id,
        price: validatedData.price,
        final_price: validatedData.final_price || null,
        discount_pct: validatedData.discount_pct || null,
        image: validatedData.image,
        images: validatedData.images,
        featured: validatedData.featured || false,
        active: validatedData.active !== undefined ? validatedData.active : true,
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: error.message || 'Error al crear el producto' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        product,
        message: 'Producto creado exitosamente'
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating product:', error);
    
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
