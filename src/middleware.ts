import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "./lib/supabaseServer.js";

export const onRequest = defineMiddleware(async ({ cookies, url, redirect }, next) => {
    // Excluir rutas API y auth callback del middleware de autenticación
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
        return next();
    }

    //Proteger rutas de admin, excepto la página de login
    if (url.pathname.startsWith("/admin") && url.pathname !== "/admin/login") {
        const supabase = createServerClient(cookies);

        const { data: { session }, error } = await supabase.auth.getSession();

        console.log('[Middleware] Checking admin access for:', url.pathname);
        console.log('[Middleware] Session exists:', !!session);
        console.log('[Middleware] Session error:', error);

        if (!session) {
            console.log('[Middleware] No session, redirecting to login');
            return redirect("/admin/login?error=session_expired");
        }

        // Verificar si es admin
        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('id')
            .eq('email', session.user.email)
            .single();

        console.log('[Middleware] Admin user check:', !!adminUser);

        if (!adminUser) {
            console.log('[Middleware] Not an admin user, signing out');
            await supabase.auth.signOut();
            return redirect("/admin/login?error=not_authorized");
        }

        console.log('[Middleware] Access granted');
    }

    return next();
});
