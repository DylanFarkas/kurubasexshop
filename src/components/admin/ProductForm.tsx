import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema } from '../../utils/validators';
import { generateSlug, formatTextToHtml } from '../../utils/formatters';
import ImageUploader from './ImageUploader';
import MultiImageUploader from './MultiImageUploader';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
      final_price: initialData?.final_price || null,
      discount_pct: initialData?.discount_pct || null,
      image: initialData?.image || '',
      images: initialData?.images || [],
      featured: initialData?.featured || false,
      active: initialData?.active !== undefined ? initialData.active : true,
    },
  });

  // Auto-generar slug desde el nombre
  const name = watch('name');
  const description = watch('description');
  
  useEffect(() => {
    if (name && !initialData?.slug) {
      setValue('slug', generateSlug(name));
    }
  }, [name, setValue, initialData]);

  // Auto-calcular precio final desde el porcentaje de descuento
  const price = watch('price');
  const discountPct = watch('discount_pct');
  
  useEffect(() => {
    if (price && discountPct && discountPct > 0 && discountPct <= 100) {
      const finalPrice = price - (price * discountPct / 100);
      setValue('final_price', Math.round(finalPrice * 100) / 100);
    } else {
      setValue('final_price', null);
    }
  }, [price, discountPct, setValue]);

  const handleFormSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);

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

      const successMessage = isEdit ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente';
      sessionStorage.setItem('adminToast', JSON.stringify({ type: 'success', message: successMessage }));
      window.dispatchEvent(new CustomEvent('productFormSaved'));
      window.location.href = '/admin/productos';
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar el producto');
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4 transition-colors">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Información Básica</h2>

        {/* Nombre */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nombre del Producto *
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:border-transparent transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="Ej: Vibrador de lujo"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
          )}
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Slug (URL) *
          </label>
          <input
            {...register('slug')}
            type="text"
            id="slug"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:border-transparent transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="vibrador-de-lujo"
          />
          {errors.slug && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.slug.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Se genera automáticamente desde el nombre
          </p>
        </div>

        {/* Descripción con Vista Previa */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Descripción del Producto
          </label>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor de Texto */}
            <div className="flex flex-col">
              <div className="mb-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="font-medium">Editor</span>
              </div>
              <textarea
                {...register('description')}
                id="description"
                rows={10}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:border-transparent transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 font-mono text-sm resize-y"
                placeholder="Describe las características del producto...&#10;&#10;Usa **texto** para negritas y *texto* para cursivas.&#10;Los saltos de línea se respetarán."
              />
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2">Formato disponible:</p>
                <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span><code className="bg-white dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-300 dark:border-blue-700">**texto**</code> para <strong>negritas</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span><code className="bg-white dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-300 dark:border-blue-700">*texto*</code> para <em>cursivas</em></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span>Doble Enter para crear párrafos separados</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Vista Previa */}
            <div className="flex flex-col">
              <div className="mb-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="font-medium">Vista Previa</span>
              </div>
              <div className="flex-1 px-5 py-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:from-gray-900 text-sm dark:to-gray-800 transition-colors overflow-auto min-h-70">
                {description ? (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 [&_p]:mb-4 [&_p:last-child]:mb-0"
                    dangerouslySetInnerHTML={{ __html: formatTextToHtml(description) }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-62.5 text-gray-400 dark:text-gray-500">
                    <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <p className="text-sm italic">Escribe algo para ver la vista previa...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {errors.description && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
          )}
        </div>

        {/* Categoría */}
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Categoría *
          </label>
          <select
            {...register('category_id')}
            id="category_id"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:border-transparent transition-colors"
          >
            <option value="">Selecciona una categoría</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category_id.message}</p>
          )}
        </div>
      </div>

      {/* Precios */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4 transition-colors">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Precios</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Precio */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Precio Regular *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
              <input
                {...register('price', { valueAsNumber: true })}
                type="number"
                id="price"
                step="0.01"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:border-transparent transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="0.00"
              />
            </div>
            {errors.price && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price.message}</p>
            )}
          </div>

          {/* Descuento % (editable) */}
          <div>
            <label htmlFor="discount_pct" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descuento %
            </label>
            <div className="relative">
              <input
                {...register('discount_pct', { valueAsNumber: true })}
                type="number"
                id="discount_pct"
                min="0"
                max="100"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:border-transparent transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="0"
              />
              <span className="absolute right-3 top-2 text-gray-500 dark:text-gray-400">%</span>
            </div>
            {errors.discount_pct && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.discount_pct.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Ingresa el porcentaje de descuento
            </p>
          </div>

          {/* Precio Final (readonly - calculado) */}
          <div>
            <label htmlFor="final_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Precio con Descuento
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
              <input
                {...register('final_price', { valueAsNumber: true })}
                type="number"
                id="final_price"
                step="0.01"
                readOnly
                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 transition-colors"
                placeholder="0.00"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Se calcula automáticamente
            </p>
          </div>
        </div>
      </div>

      {/* Imágenes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4 transition-colors">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Imágenes</h2>

        {/* Imagen Principal */}
        <ImageUploader
          label="Imagen Principal *"
          currentImage={watch('image')}
          onImageUploaded={handleMainImageUploaded}
        />
        {errors.image && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.image.message}</p>
        )}

        {/* Galería */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Galería de Imágenes</h3>
          
          {/* Imágenes actuales */}
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(index)}
                    className="absolute top-1 right-1 bg-red-600 dark:bg-red-700 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
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
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Puedes seleccionar y subir múltiples imágenes a la vez
          </p>
        </div>
      </div>

      {/* Opciones */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4 transition-colors">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Opciones</h2>

        <div className="flex items-center gap-6">
          {/* Featured */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              {...register('featured')}
              type="checkbox"
              className="w-4 h-4 text-pink-600 dark:text-pink-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded focus:ring-pink-500 dark:focus:ring-pink-400 transition-colors"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Producto Destacado
            </span>
          </label>

          {/* Active */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              {...register('active')}
              type="checkbox"
              className="w-4 h-4 text-pink-600 dark:text-pink-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded focus:ring-pink-500 dark:focus:ring-pink-400 transition-colors"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Producto Activo
            </span>
          </label>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Los productos inactivos no se mostrarán en la tienda pública
        </p>
      </div>

      {/* Botones */}
      <div className="flex items-center justify-between">
        <a
          href="/admin/productos"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancelar
        </a>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className={`
            px-6 py-2 bg-pink-500 text-white rounded-lg font-medium transition-all cursor-pointer
            ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pink-600 dark:hover:bg-pink-700'}
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