export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convierte texto con saltos de línea y formato simple a HTML
 * - Dobles saltos de línea se convierten en párrafos <p>
 * - Saltos de línea simples se convierten en <br>
 * - **texto** se convierte en <strong>texto</strong> (negrita)
 * - *texto* se convierte en <em>texto</em> (cursiva)
 */
export function formatTextToHtml(text: string | null | undefined): string {
  if (!text) return '';
  
  // Escape HTML para prevenir XSS
  const escapeHtml = (str: string) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, (m) => map[m]);
  };
  
  const escaped = escapeHtml(text);
  
  // Aplicar formato de texto antes de procesar párrafos
  let formatted = escaped;
  
  // Convertir **texto** a <strong>texto</strong> (negrita) - Procesar primero
  formatted = formatted.replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>');
  
  // Convertir *texto* a <em>texto</em> (cursiva) - Procesar después para evitar conflictos
  formatted = formatted.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
  
  // Dividir por dobles saltos de línea para crear párrafos
  const paragraphs = formatted.split(/\n\s*\n/);
  
  // Convertir cada párrafo: saltos simples a <br>
  const withParagraphs = paragraphs
    .map(para => {
      const withBreaks = para.trim().replace(/\n/g, '<br>');
      return withBreaks ? `<p>${withBreaks}</p>` : '';
    })
    .filter(Boolean)
    .join('');
  
  return withParagraphs || formatted.replace(/\n/g, '<br>');
}