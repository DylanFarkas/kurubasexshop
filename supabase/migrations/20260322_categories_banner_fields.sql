-- ============================================
-- MIGRACION: BANNER POR CATEGORIA
-- ============================================
-- Objetivo:
-- Permitir configurar un banner/hero por categoria desde admin.
-- Se agregan campos opcionales en la tabla categories para guardar
-- URL de imagen y public_id de Cloudinary.
-- ============================================

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS banner_image_url text,
  ADD COLUMN IF NOT EXISTS banner_public_id text;

ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_banner_image_url_check;

ALTER TABLE categories
  ADD CONSTRAINT categories_banner_image_url_check
  CHECK (
    banner_image_url IS NULL
    OR banner_image_url ~ '^https://'
  );

ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_banner_public_id_check;

ALTER TABLE categories
  ADD CONSTRAINT categories_banner_public_id_check
  CHECK (
    banner_public_id IS NULL
    OR length(trim(banner_public_id)) > 0
  );

-- Verificacion manual sugerida:
-- SELECT id, label, slug, banner_image_url, banner_public_id
-- FROM categories
-- ORDER BY order_position ASC;
