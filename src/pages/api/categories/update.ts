import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { categorySchema } from '../../../utils/validators';
import { generateSlug } from '../../../utils/formatters';

export const prerender = false;

export const PATCH: APIRoute = async ({ request, url }) => {
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

    const body = await request.json();
    
    // Auto-generar slug si se cambió el label pero no el slug
    if (body.label && !body.slug) {
      body.slug = generateSlug(body.label);
    }
    
    const validatedData = categorySchema.partial().parse(body);

    // Actualizar categoría en base de datos
    const { data: category, error: categoryError } = await supabaseAdmin
      .from('categories')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (categoryError) {
      console.error('Error updating category:', categoryError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error al actualizar la categoría',
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
    console.error('Error processing category update:', error);
    
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