import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCartStore } from '../../stores/cartStore';
import { useEffect, useState } from 'react';
import { getDepartments, getCitiesByDepartment } from '../../lib/colombiaApi';
import type { CreateOrderInput } from '../../types/order';
import type { Department, City } from '../../lib/colombiaApi';

const checkoutSchema = z.object({
  customer_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  customer_phone: z.string().regex(/^[0-9]{10}$/, 'El teléfono debe tener 10 dígitos'),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  customer_department: z.string().min(1, 'Selecciona un departamento'),
  customer_city: z.string().min(1, 'Selecciona un municipio'),
  customer_address: z.string().min(10, 'La dirección debe tener al menos 10 caracteres'),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutForm() {
  const items = useCartStore(state => state.items);
  const total = useCartStore(state => state.getTotal());
  const clearCart = useCartStore(state => state.clearCart);

  // Estados para departamentos y ciudades
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  // Cargar departamentos al montar
  useEffect(() => {
    loadDepartments();
  }, []);

  // Cargar ciudades cuando cambia el departamento
  const departmentValue = watch('customer_department');

  useEffect(() => {
    if (departmentValue && selectedDepartmentId) {
      loadCities(selectedDepartmentId);
    } else {
      setCities([]);
    }
  }, [departmentValue, selectedDepartmentId]);

  const loadDepartments = async () => {
    setLoadingDepartments(true);
    const data = await getDepartments();
    setDepartments(data);
    setLoadingDepartments(false);
  };

  const loadCities = async (departmentId: number) => {
    setLoadingCities(true);
    const data = await getCitiesByDepartment(departmentId);
    setCities(data);
    setLoadingCities(false);
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    const dept = departments.find(d => d.name === selectedName);
    if (dept) {
      setSelectedDepartmentId(dept.id);
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    const orderData: CreateOrderInput = {
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_email: data.customer_email,
      customer_department: data.customer_department,
      customer_city: data.customer_city,
      customer_address: data.customer_address,
      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.finalPrice ?? item.price,
        image: item.image,
      })),
      total,
      notes: data.notes,
    };

    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) throw new Error('Error al crear la orden');

      const result = await response.json();
      
      window.open(result.whatsappLink, '_blank');
      
      clearCart();
      
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

      {/* NUEVO: Departamento */}
      <div>
        <label className="block text-sm font-semibold mb-2">Departamento *</label>
        <select
          {...register('customer_department')}
          onChange={(e) => {
            register('customer_department').onChange(e);
            handleDepartmentChange(e);
          }}
          disabled={loadingDepartments}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">
            {loadingDepartments ? 'Cargando departamentos...' : 'Selecciona un departamento'}
          </option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.name}>
              {dept.name}
            </option>
          ))}
        </select>
        {errors.customer_department && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_department.message}</p>
        )}
      </div>

      {/* NUEVO: Municipio/Ciudad */}
      <div>
        <label className="block text-sm font-semibold mb-2">Municipio/Ciudad *</label>
        <select
          {...register('customer_city')}
          disabled={!selectedDepartmentId || loadingCities}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">
            {!selectedDepartmentId 
              ? 'Primero selecciona un departamento' 
              : loadingCities 
                ? 'Cargando ciudades...' 
                : 'Selecciona un municipio'
            }
          </option>
          {cities.map((city) => (
            <option key={city.id} value={city.name}>
              {city.name}
            </option>
          ))}
        </select>
        {errors.customer_city && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_city.message}</p>
        )}
      </div>

      {/* NUEVO: Dirección */}
      <div>
        <label className="block text-sm font-semibold mb-2">Dirección completa *</label>
        <input
          {...register('customer_address')}
          type="text"
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="Calle 123 #45-67, Apto 801"
        />
        {errors.customer_address && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_address.message}</p>
        )}
        <p className="text-gray-500 text-xs mt-1">
          Incluye calle, número, apartamento, barrio y referencias
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Notas adicionales (opcional)</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="Instrucciones especiales de envío, preferencias de entrega, etc."
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