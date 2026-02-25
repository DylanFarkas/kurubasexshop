import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabaseServer';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Session API] Received session sync request');
    
    const body = await request.json();
    console.log('[Session API] Body keys:', Object.keys(body));
    
    const { access_token, refresh_token } = body;
    
    if (!access_token || !refresh_token) {
      console.error('[Session API] Missing tokens:', { 
        hasAccessToken: !!access_token, 
        hasRefreshToken: !!refresh_token 
      });
      return new Response(
        JSON.stringify({ success: false, message: 'Tokens requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Session API] Creating Supabase client...');
    const supabase = createServerClient(cookies);
    
    console.log('[Session API] Setting session...');
    // Establecer la sesión en las cookies del servidor
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error('[Session API] Error setting session:', error);
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Session API] Session set successfully:', {
      userId: data.user?.id,
      email: data.user?.email,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Session API] Session sync error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error?.message || 'Error interno' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
