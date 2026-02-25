import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "./lib/supabaseServer";

export const onRequest = defineMiddleware(async ({ cookies, url, redirect }, next) => {
    // Excluir rutas API y auth callback del middleware de autenticación
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
        return next();
    }

    //Proteger rutas de admin, excepto la página de login
    if (url.pathname.startsWith("/admin") && url.pathname !== "/admin/login") {
        const supabase = createServerClient(cookies);

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return redirect("/admin/login");
        }

        // Verificar que el usuario sea administrador
        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('id')
            .eq('email', session.user.email)
            .single();

        if (!adminUser) {
            await supabase.auth.signOut();
            return redirect("/admin/login?error=not_authorized");
        }
    }

    return next();
});