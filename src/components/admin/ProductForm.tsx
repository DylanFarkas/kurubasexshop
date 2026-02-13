import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema } from '../../utils/validators';
import { generateSlug } from '../../utils/formatters';
import ImageUploader from './ImageUploader';
import MultiImageUploader from './MultiImageUploader';
import { useState, useEffect } from 'react';
import type { z } from 'zod';

type ProductFormData = z.infer<typeof productSchema>;

interface Category {
  id: string;
  label: string;
  slug: string;
}

interface ProductFormProps {
  categories: Category[];
  initialData?: Partial<ProductFormData> & { id?: string };
  submitLabel?: string;
  isEdit?: boolean;
}

export default function ProductForm({ 
  categories, 
  initialData, 
  submitLabel = 'Crear Producto',
  isEdit = false,
}: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>(initialData?.images || []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || '',
      slug: initialData?.slug || '',
      description: initialData?.description || '',
      category_id: initialData?.category_id || '',
      price: initialData?.price || 0,
      final_price: initialData?.final_price || undefined,
      discount_pct: initialData?.discount_pct || undefined,
      image: initialData?.image || '',
      images: initialData?.images || [],
      featured: initialData?.featured || false,
      active: initialData?.active !== undefined ? initialData.active : true,
    },
  });

  // Auto-generar slug desde el nombre
  const name = watch('name');
  useEffect(() => {
    if (name && !initialData?.slug) {
      setValue('slug', generateSlug(name));
    }
  }, [name, setValue, initialData]);

  // Auto-calcular porcentaje de descuento
  const price = watch('price');
  const finalPrice = watch('final_price');
  
  useEffect(() => {
    if (price && finalPrice && finalPrice > 0 && finalPrice < price) {
      const discount = Math.round(((price - finalPrice) / price) * 100);
      setValue('discount_pct', discount);
    } else {
      setValue('discount_pct', undefined);
    }
  }, [price, finalPrice, setValue]);

  const handleFormSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Asegurarse de que las imágenes estén incluidas
      const formData = {
        ...data,
        images: imageUrls,
      };

      const endpoint = isEdit && initialData?.id 
        ? `/api/products/update` 
        : '/api/products/create';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(isEdit ? { ...formData, id: initialData?.id } : formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al guardar el producto');
      }

      // Redirigir a la lista de productos
      window.location.href = '/admin/productos';
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError(error instanceof Error ? error.message : 'Error al guardar el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMainImageUploaded = (url: string) => {
    setValue('image', url);
  };

  const handleGalleryImagesUploaded = (urls: string[]) => {
    const newUrls = [...imageUrls, ...urls];
    setImageUrls(newUrls);
    setValue('images', newUrls);
  };

  const removeGalleryImage = (index: number) => {
    const newUrls = imageUrls.filter((_, i) => i !== index);
    setImageUrls(newUrls);
    setValue('images', newUrls);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {submitError}
        </div>
      )}

      {/* Información Básica */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Información Básica</h2>

        {/* Nombre */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Producto *
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Ej: Vibrador de lujo"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
            Slug (URL) *
          </label>
          <input
            {...register('slug')}
            type="text"
            id="slug"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="vibrador-de-lujo"
          />
          {errors.slug && (
            <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Se genera automáticamente desde el nombre
          </p>
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            {...register('description')}
            id="description"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Describe las características del producto..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Categoría */}
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
            Categoría *
          </label>
          <select
            {...register('category_id')}
            id="category_id"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="">Selecciona una categoría</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>
          )}
        </div>
      </div>

      {/* Precios */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Precios</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Precio */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Precio Regular *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                {...register('price', { valueAsNumber: true })}
                type="number"
                id="price"
                step="0.01"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            {errors.price && (
              <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
            )}
          </div>

          {/* Precio Final */}
          <div>
            <label htmlFor="final_price" className="block text-sm font-medium text-gray-700 mb-1">
              Precio con Descuento
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                {...register('final_price', { valueAsNumber: true })}
                type="number"
                id="final_price"
                step="0.01"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            {errors.final_price && (
              <p className="mt-1 text-sm text-red-600">{errors.final_price.message}</p>
            )}
          </div>

          {/* Descuento % (readonly) */}
          <div>
            <label htmlFor="discount_pct" className="block text-sm font-medium text-gray-700 mb-1">
              Descuento %
            </label>
            <div className="relative">
              <input
                {...register('discount_pct', { valueAsNumber: true })}
                type="number"
                id="discount_pct"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                placeholder="0"
              />
              <span className="absolute right-3 top-2 text-gray-500">%</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Se calcula automáticamente
            </p>
          </div>
        </div>
      </div>

      {/* Imágenes */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Imágenes</h2>

        {/* Imagen Principal */}
        <ImageUploader
          label="Imagen Principal *"
          currentImage={watch('image')}
          onImageUploaded={handleMainImageUploaded}
        />
        {errors.image && (
          <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>
        )}

        {/* Galería */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Galería de Imágenes</h3>
          
          {/* Imágenes actuales */}
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Añadir más imágenes */}
          <MultiImageUploader
            label="Añadir Imágenes a Galería"
            onImagesUploaded={handleGalleryImagesUploaded}
          />
          <p className="mt-2 text-xs text-gray-500">
            Puedes seleccionar y subir múltiples imágenes a la vez
          </p>
        </div>
      </div>

      {/* Opciones */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Opciones</h2>

        <div className="flex items-center gap-6">
          {/* Featured */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              {...register('featured')}
              type="checkbox"
              className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Producto Destacado
            </span>
          </label>

          {/* Active */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              {...register('active')}
              type="checkbox"
              className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Producto Activo
            </span>
          </label>
        </div>

        <p className="text-xs text-gray-500">
          Los productos inactivos no se mostrarán en la tienda pública
        </p>
      </div>

      {/* Botones */}
      <div className="flex items-center justify-between">
        <a
          href="/admin/productos"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          Cancelar
        </a>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className={`
            px-6 py-2 bg-pink-600 text-white rounded-lg font-medium transition
            ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pink-700'}
          `}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Guardando...
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}
