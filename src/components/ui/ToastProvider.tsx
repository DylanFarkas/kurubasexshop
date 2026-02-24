import { Toaster } from 'sonner';

/** Proveedor de toasts para el layout público (tienda) */
export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{ duration: 4000 }}
    />
  );
}
