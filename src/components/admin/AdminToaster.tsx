import { Toaster, toast } from 'sonner';
import { useEffect } from 'react';

/**
 * AdminToaster
 * - Monta el componente Toaster de Sonner en el layout de admin
 * - Expone `window.__sonnerToast` para scripts inline que no pueden usar ES modules
 * - Lee sesionStorage en cada carga para mostrar toasts pendientes tras redirect/reload
 */
export default function AdminToaster() {
  useEffect(() => {
    // Exponer toast globalmente para scripts inline (define:vars)
    (window as any).__sonnerToast = toast;

    // Mostrar toasts pendientes guardados antes de un redirect o reload
    const pending = sessionStorage.getItem('adminToast');
    if (pending) {
      sessionStorage.removeItem('adminToast');
      try {
        const { type, message } = JSON.parse(pending) as { type: string; message: string };
        setTimeout(() => {
          if (type === 'success') toast.success(message);
          else if (type === 'error') toast.error(message);
          else if (type === 'warning') toast.warning(message);
          else toast(message);
        }, 150);
      } catch {
        // ignorar JSON malformado
      }
    }
  }, []);

  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{ duration: 4000 }}
    />
  );
}