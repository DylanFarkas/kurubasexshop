import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabaseServer';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const supabase = createServerClient(cookies);
  
  // Cerrar sesión en Supabase
  await supabase.auth.signOut();
  
  // Redirigir al login
  return redirect('/admin/login');
};
