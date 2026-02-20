import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCartStore } from '../../stores/cartStore';
import { useEffect, useState } from 'react';
import { getDepartments, getCitiesByDepartment } from '../../lib/colombiaApi';
import type { CreateOrderInput } from '../../types/order';
import type { Department, City } from '../../lib/colombiaApi';
import { Lock, MapPin } from 'lucide-react';

const checkoutSchema = z.object({
  customer_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  customer_phone: z.string().regex(/^[0-9]{10}$/, 'El teléfono debe tener 10 dígitos'),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  customer_department: z.string().min(1, 'Selecciona un departamento'),
  customer_city: z.string().min(1, 'Selecciona un municipio'),
  customer_address: z.string().min(10, 'Escribe una dirección'),
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

  useEffect(() => {
    loadDepartments();
  }, []);

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Sección de información personal */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
          <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <h3 className="font-bold text-gray-900">Información Personal</h3>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nombre completo <span className="text-pink-600">*</span>
          </label>
          <div className="relative">
            <input
              {...register('customer_name')}
              type="text"
              className={`w-full px-4 py-3 pl-11 border-2 rounded-xl transition-all ${
                errors.customer_name 
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                  : 'border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-100'
              }`}
              placeholder="Ej: María García López"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          {errors.customer_name && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {errors.customer_name.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Teléfono / WhatsApp <span className="text-pink-600">*</span>
          </label>
          <div className="relative">
            <input
              {...register('customer_phone')}
              type="tel"
              className={`w-full px-4 py-3 pl-11 border-2 rounded-xl transition-all ${
                errors.customer_phone 
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                  : 'border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-100'
              }`}
              placeholder="3001234567"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
          </div>
          {errors.customer_phone && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {errors.customer_phone.message}
            </p>
          )}
          <p className="text-gray-500 text-xs mt-2 ml-1">
            Te contactaremos por este número para confirmar tu pedido
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Correo electrónico <span className="text-gray-400">(opcional)</span>
          </label>
          <div className="relative">
            <input
              {...register('customer_email')}
              type="email"
              className={`w-full px-4 py-3 pl-11 border-2 rounded-xl transition-all ${
                errors.customer_email 
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                  : 'border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-100'
              }`}
              placeholder="correo@ejemplo.com"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          {errors.customer_email && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {errors.customer_email.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-5 pt-6">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
          <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <h3 className="font-bold text-gray-900">Dirección de Entrega</h3>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Departamento <span className="text-pink-600">*</span>
          </label>
          <div className="relative">
            <select
              {...register('customer_department')}
              onChange={(e) => {
                register('customer_department').onChange(e);
                handleDepartmentChange(e);
              }}
              disabled={loadingDepartments}
              className={`w-full px-4 py-3 pl-11 border-2 rounded-xl transition-all appearance-none bg-white ${
                errors.customer_department 
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                  : 'border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-100'
              } disabled:bg-gray-50 disabled:cursor-not-allowed`}
            >
              <option value="">
                {loadingDepartments ? 'Cargando departamentos...' : 'Selecciona tu departamento'}
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            </svg>
            <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
          {errors.customer_department && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {errors.customer_department.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Municipio / Ciudad <span className="text-pink-600">*</span>
          </label>
          <div className="relative">
            <select
              {...register('customer_city')}
              disabled={!selectedDepartmentId || loadingCities}
              className={`w-full px-4 py-3 pl-11 border-2 rounded-xl transition-all appearance-none bg-white ${
                errors.customer_city 
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                  : 'border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-100'
              } disabled:bg-gray-50 disabled:cursor-not-allowed`}
            >
              <option value="">
                {!selectedDepartmentId 
                  ? 'Primero selecciona un departamento' 
                  : loadingCities 
                    ? 'Cargando ciudades...' 
                    : 'Selecciona tu ciudad'
                }
              </option>
              {cities.map((city) => (
                <option key={city.id} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
          {errors.customer_city && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {errors.customer_city.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Dirección completa <span className="text-pink-600">*</span>
          </label>
          <div className="relative">
            <input
              {...register('customer_address')}
              type="text"
              className={`w-full px-4 py-3 pl-11 border-2 rounded-xl transition-all ${
                errors.customer_address 
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                  : 'border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-100'
              }`}
              placeholder="Calle 123 #45-67, Torre 2, Apto 801"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </div>
          {errors.customer_address && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {errors.customer_address.message}
            </p>
          )}
          <p className="text-gray-500 text-xs mt-2 ml-1">
            <MapPin className="inline-block mr-1 w-4 h-4 mb-1" />
            Incluye: calle/carrera, número, torre/apto, barrio y referencias importantes
          </p>
        </div>
      </div>

      <div className="pt-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Notas o instrucciones especiales <span className="text-gray-400">(opcional)</span>
        </label>
        <textarea
          {...register('notes')}
          rows={4}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all resize-none"
          placeholder="Ej: Llamar antes de entregar, portería con horario especial, dejar con el portero..."
        />
        <p className="text-gray-500 text-xs mt-2 ml-1">
          Comparte cualquier información que nos ayude con la entrega
        </p>
      </div>

      <div className="pt-6">
        <button
          type="submit"
          disabled={isSubmitting || items.length === 0}
          className="w-full py-4 bg-white text-gray-800 rounded-xl font-bold text-lg hover:-translate-y-1 border border-b-6 border-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform duration-300 flex items-center justify-center gap-3 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Procesando tu pedido...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
              </svg>
              Continuar con WhatsApp
            </>
          )}
        </button>
        
        {items.length === 0 && (
          <p className="text-center text-sm text-gray-500 mt-3">
            Agrega productos a tu carrito para continuar
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          <Lock className="inline-block mr-1 w-4 h-4 mb-1" />
          Al finalizar tu pedido, aceptas nuestra política de privacidad. Tus datos están seguros y solo se usan para procesar tu compra.
        </p>
      </div>
    </form>
  );
}