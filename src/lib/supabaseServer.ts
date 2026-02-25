import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

export function createServerClient(cookies: AstroCookies) {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      storage: {
        getItem: (key) => {
          return cookies.get(key)?.value ?? null;
        },
        setItem: (key, value) => {
          cookies.set(key, value, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
            sameSite: 'lax',
            secure: import.meta.env.PROD,
            httpOnly: false, // Permitir acceso desde JS si es necesario
          });
        },
        removeItem: (key) => {
          cookies.delete(key, { path: '/' });
        },
      },
    },
  });
}