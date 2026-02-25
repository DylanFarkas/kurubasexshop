import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabaseServer';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  
  // Cerrar sesión en Supabase
  await supabase.auth.signOut();
  
  // Retornar JSON para que el frontend maneje la redirección
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
