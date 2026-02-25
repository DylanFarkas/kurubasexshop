import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

export function createServerClient(cookies: AstroCookies) {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: false,
      persistSession: true,
      storage: {
        getItem: (key) => {
          const value = cookies.get(key)?.value ?? null;
          console.log(`[Cookie] Getting ${key}:`, value ? 'found' : 'not found');
          return value;
        },
        setItem: (key, value) => {
          console.log(`[Cookie] Setting ${key}`);
          cookies.set(key, value, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365, // 1 año
            sameSite: 'lax',
            secure: import.meta.env.PROD,
            httpOnly: false, // Debe ser false para que el cliente pueda acceder
          });
        },
        removeItem: (key) => {
          console.log(`[Cookie] Removing ${key}`);
          cookies.delete(key, { 
            path: '/',
            sameSite: 'lax',
            secure: import.meta.env.PROD,
          });
        },
      },
    },
  });
}