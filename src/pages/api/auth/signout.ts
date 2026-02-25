import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabaseServer';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  
  // Cerrar sesión en Supabase
  await supabase.auth.signOut();
  
  // Limpiar todas las cookies de autenticación
  const cookieNames = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
    'sb-auth-token'
  ];
  
  cookieNames.forEach(name => {
    cookies.delete(name, { path: '/' });
  });
  
  // Retornar JSON para que el frontend maneje la redirección
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
