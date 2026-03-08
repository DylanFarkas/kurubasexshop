import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = site || 'https://www.kurubasexshop.com';
  
  // Fetch categorías activas
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .eq('active', true)
    .order('order_position');

  // Fetch productos activos
  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('active', true);

  // Páginas estáticas
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: 'tienda', priority: '0.9', changefreq: 'daily' },
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Agregar páginas estáticas
  staticPages.forEach(page => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${page.url ? '/' + page.url : ''}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  // Agregar categorías
  categories?.forEach(category => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/categoria/${category.slug}</loc>\n`;
    xml += `    <lastmod>${new Date(category.updated_at || new Date()).toISOString()}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  });

  // Agregar productos
  products?.forEach(product => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/producto/${product.slug}</loc>\n`;
    xml += `    <lastmod>${new Date(product.updated_at || new Date()).toISOString()}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.7</priority>\n';
    xml += '  </url>\n';
  });

  xml += '</urlset>';

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
