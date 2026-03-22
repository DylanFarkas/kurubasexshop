import type { APIRoute } from 'astro';
import { v2 as cloudinary } from 'cloudinary';
import { createServerClient } from '../../../lib/supabaseServer';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { DEFAULT_HOME_BANNER_SETTINGS, type HomeBannerSettingsInput } from '../../../types/homeBanner';
import { homeBannersSaveSchema } from '../../../utils/validators';

export const prerender = false;

type CloudinaryCleanupWarning = {
  public_id: string;
  message: string;
};

function toZodErrorResponse(error: unknown): Response {
  return new Response(
    JSON.stringify({
      success: false,
      message: 'Datos invalidos',
      errors: error,
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

function configureCloudinary() {
  const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = import.meta.env.CLOUDINARY_API_KEY;
  const apiSecret = import.meta.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return true;
}

async function destroyPublicId(publicId: string): Promise<CloudinaryCleanupWarning | null> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok' || result.result === 'not found') {
      return null;
    }

    return {
      public_id: publicId,
      message: `Cloudinary respondio: ${result.result}`,
    };
  } catch (error) {
    return {
      public_id: publicId,
      message: error instanceof Error ? error.message : 'Error desconocido al limpiar imagen',
    };
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return new Response(
        JSON.stringify({ success: false, message: 'No autenticado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({ success: false, message: 'No autorizado' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const parsed = homeBannersSaveSchema.parse(body);

    const normalizedItems = parsed.items.map((item, index) => ({
      ...item,
      sort_order: index,
      target_url: item.target_url ?? null,
    }));

    const normalizedSettings = parsed.settings
      ? {
          autoplay_enabled: parsed.settings.autoplay_enabled,
          autoplay_interval_ms: parsed.settings.autoplay_interval_ms,
          mobile_height_px: parsed.settings.mobile_height_px,
          desktop_height_px: parsed.settings.desktop_height_px,
        }
      : null;

    const existingIds = normalizedItems
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id));

    const cleanupWarnings: CloudinaryCleanupWarning[] = [];

    const cloudinaryReady = configureCloudinary();

    let previousById = new Map<string, { public_id: string }>();

    if (existingIds.length > 0) {
      const { data: previousRows, error: previousError } = await supabaseAdmin
        .from('home_banners')
        .select('id, public_id')
        .in('id', existingIds);

      if (previousError) {
        return new Response(
          JSON.stringify({ success: false, message: previousError.message }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      previousById = new Map((previousRows || []).map((row) => [row.id, { public_id: row.public_id }]));
    }

    const deletedIds = (parsed.deleted || []).map((item) => item.id);

    if (deletedIds.length > 0) {
      const { data: rowsToDelete, error: rowsToDeleteError } = await supabaseAdmin
        .from('home_banners')
        .select('id, public_id')
        .in('id', deletedIds);

      if (rowsToDeleteError) {
        return new Response(
          JSON.stringify({ success: false, message: rowsToDeleteError.message }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from('home_banners')
        .delete()
        .in('id', deletedIds);

      if (deleteError) {
        return new Response(
          JSON.stringify({ success: false, message: deleteError.message }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const publicIdsToDelete = (rowsToDelete || [])
        .map((row) => row.public_id)
        .filter((value): value is string => Boolean(value));

      if (!cloudinaryReady && publicIdsToDelete.length > 0) {
        publicIdsToDelete.forEach((publicId) => {
          cleanupWarnings.push({
            public_id: publicId,
            message: 'No se pudo limpiar Cloudinary: faltan variables CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET',
          });
        });
      }

      if (cloudinaryReady) {
        for (const publicId of publicIdsToDelete) {
          const warning = await destroyPublicId(publicId);
          if (warning) cleanupWarnings.push(warning);
        }
      }
    }

    const toUpdate = normalizedItems.filter((item) => item.id);
    const toInsert = normalizedItems.filter((item) => !item.id);

    if (toUpdate.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('home_banners')
        .upsert(
          toUpdate.map((item) => ({
            id: item.id,
            image_url: item.image_url,
            public_id: item.public_id,
            target_url: item.target_url,
            sort_order: item.sort_order,
            is_active: item.is_active,
          })),
          { onConflict: 'id' }
        );

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, message: updateError.message }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (cloudinaryReady) {
        for (const item of toUpdate) {
          const previous = previousById.get(item.id as string);
          if (!previous || previous.public_id === item.public_id) {
            continue;
          }

          const warning = await destroyPublicId(previous.public_id);
          if (warning) cleanupWarnings.push(warning);
        }
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('home_banners')
        .insert(
          toInsert.map((item) => ({
            image_url: item.image_url,
            public_id: item.public_id,
            target_url: item.target_url,
            sort_order: item.sort_order,
            is_active: item.is_active,
          }))
        );

      if (insertError) {
        return new Response(
          JSON.stringify({ success: false, message: insertError.message }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (normalizedSettings) {
      const { error: settingsUpsertError } = await supabaseAdmin
        .from('home_banner_settings')
        .upsert(
          {
            singleton_key: true,
            autoplay_enabled: normalizedSettings.autoplay_enabled,
            autoplay_interval_ms: normalizedSettings.autoplay_interval_ms,
            mobile_height_px: normalizedSettings.mobile_height_px,
            desktop_height_px: normalizedSettings.desktop_height_px,
          },
          { onConflict: 'singleton_key' }
        );

      if (settingsUpsertError) {
        return new Response(
          JSON.stringify({ success: false, message: settingsUpsertError.message }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: banners, error: fetchError } = await supabaseAdmin
      .from('home_banners')
      .select('*')
      .order('sort_order', { ascending: true });

    if (fetchError) {
      return new Response(
        JSON.stringify({ success: false, message: fetchError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let settings: HomeBannerSettingsInput = DEFAULT_HOME_BANNER_SETTINGS;

    const { data: settingsRow, error: settingsError } = await supabaseAdmin
      .from('home_banner_settings')
      .select('autoplay_enabled, autoplay_interval_ms, mobile_height_px, desktop_height_px')
      .eq('singleton_key', true)
      .maybeSingle();

    if (settingsError) {
      if (normalizedSettings) {
        return new Response(
          JSON.stringify({ success: false, message: settingsError.message }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      console.error('Error fetching home banner settings:', settingsError);
    } else if (settingsRow) {
      settings = {
        autoplay_enabled: settingsRow.autoplay_enabled,
        autoplay_interval_ms: settingsRow.autoplay_interval_ms,
        mobile_height_px: settingsRow.mobile_height_px,
        desktop_height_px: settingsRow.desktop_height_px,
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        items: banners || [],
        settings,
        cleanupWarnings,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return toZodErrorResponse(error);
    }

    console.error('Error saving home banners:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};