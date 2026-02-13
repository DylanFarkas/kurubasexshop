import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCartStore } from '../../stores/cartStore';
import type { CreateOrderInput } from '../../types/order';

const checkoutSchema = z.object({
  customer_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  customer_phone: z.string().regex(/^[0-9]{10}$/, 'El teléfono debe tener 10 dígitos'),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutForm() {
  const items = useCartStore(state => state.items);
  const total = useCartStore(state => state.getTotal());
  const clearCart = useCartStore(state => state.clearCart);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  const onSubmit = async (data: CheckoutFormData) => {
    const orderData: CreateOrderInput = {
      ...data,
      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.finalPrice ?? item.price,
        image: item.image,
      })),
      total,
    };

    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) throw new Error('Error al crear la orden');

      const result = await response.json();
      
      // Abrir WhatsApp
      window.open(result.whatsappLink, '_blank');
      
      // Limpiar carrito
      clearCart();
      
      // Redirigir a confirmación
      window.location.href = `/confirmacion?order=${result.orderId}`;
    } catch (error) {
      console.error('Error:', error);
      alert('Hubo un error al procesar tu pedido. Por favor intenta de nuevo.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold mb-2">Nombre completo *</label>
        <input
          {...register('customer_name')}
          type="text"
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="Juan Pérez"
        />
        {errors.customer_name && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Teléfono *</label>
        <input
          {...register('customer_phone')}
          type="tel"
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="3001234567"
        />
        {errors.customer_phone && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_phone.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Email (opcional)</label>
        <input
          {...register('customer_email')}
          type="email"
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="correo@ejemplo.com"
        />
        {errors.customer_email && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Notas adicionales (opcional)</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="Instrucciones especiales de envío, etc."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || items.length === 0}
        className="w-full py-4 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Procesando...' : 'Finalizar Pedido'}
      </button>
    </form>
  );
}