import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "./src/lib/supabaseServer";

export const onRequest = defineMiddleware(async ({ cookies, url, redirect }, next) => {
    //Proteger rutas de admin, excepto la página de login
    if (url.pathname.startsWith("/admin") && url.pathname !== "/admin/login") {
        const supabase = createServerClient(cookies);

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return redirect("/admin/login");
        }

        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('id')
            .eq('email', session.user.email)
            .single();

        if (!adminUser) {
            await supabase.auth.signOut();
            return redirect("/admin/login");
        }
    }

    return next();
});