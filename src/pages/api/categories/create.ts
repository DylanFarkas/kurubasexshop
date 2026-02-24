import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { categorySchema } from '../../../utils/validators';
import { generateSlug } from '../../../utils/formatters';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Auto-generar slug si no se proporciona
    if (!body.slug && body.label) {
      body.slug = generateSlug(body.label);
    }
    
    const validatedData = categorySchema.parse(body);

    // Obtener la posición máxima actual para nuevas categorías
    const { data: maxPosition } = await supabaseAdmin
      .from('categories')
      .select('order_position')
      .order('order_position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = maxPosition ? maxPosition.order_position + 1 : 0;

    // Crear categoría en base de datos
    const { data: category, error: categoryError } = await supabaseAdmin
      .from('categories')
      .insert({
        label: validatedData.label,
        slug: validatedData.slug,
        order_position: validatedData.order_position ?? nextPosition,
        active: validatedData.active ?? true,
      })
      .select()
      .single();

    if (categoryError) {
      console.error('Error creating category:', categoryError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error al crear la categoría',
          error: categoryError.message,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        category,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing category creation:', error);
    
    if (error instanceof Error && 'issues' in error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Datos inválidos',
          errors: (error as any).issues,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error interno del servidor' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};