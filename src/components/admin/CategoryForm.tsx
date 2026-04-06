import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Category } from '../../types/category';
import ImageUploader from './ImageUploader';

const categoryFormSchema = z.object({
  label: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string().min(2, 'El slug debe tener al menos 2 caracteres'),
  order_position: z.number().int().min(0, 'La posición debe ser un número positivo'),
  active: z.boolean(),
  banner_image_url: z.string().url('URL de banner invalida').nullable().optional(),
  banner_public_id: z.string().min(1, 'public_id de banner invalido').nullable().optional(),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  category?: Category;
  onSuccess?: () => void;
}

export default function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!category;

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category ? {
      label: category.label,
      slug: category.slug,
      order_position: category.order_position,
      active: category.active,
      banner_image_url: category.banner_image_url || null,
      banner_public_id: category.banner_public_id || null,
    } : {
      label: '',
      slug: '',
      order_position: 0,
      active: true,
      banner_image_url: null,
      banner_public_id: null,
    }
  });

  const bannerPreviewUrl = watch('banner_image_url');

  // Auto-generar slug del label
  const label = watch('label');
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    if (!isEditing) {
      // Solo auto-generar slug en modo crear
      const slug = newLabel
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', slug);
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);

    try {
      const url = isEditing 
        ? `/api/categories/update?id=${category.id}`
        : '/api/categories/create';
      
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al guardar la categoría');
      }

      const successMessage = isEditing ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente';

      if (onSuccess) {
        toast.success(successMessage);
        onSuccess();
      } else {
        sessionStorage.setItem('adminToast', JSON.stringify({ type: 'success', message: successMessage }));
        window.location.href = '/admin/categorias';
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error(err instanceof Error ? err.message : 'Error al guardar la categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <ImageUploader
          label="Banner de categoria"
          currentImage={bannerPreviewUrl || undefined}
          folder="kuruba/categories"
          onImageUploaded={(url) => {
            setValue('banner_image_url', url, { shouldDirty: true });
          }}
          onUploadComplete={({ publicId }) => {
            setValue('banner_public_id', publicId, { shouldDirty: true });
          }}
        />
        {bannerPreviewUrl && (
          <button
            type="button"
            onClick={() => {
              setValue('banner_image_url', null, { shouldDirty: true });
              setValue('banner_public_id', null, { shouldDirty: true });
            }}
            className="mt-3 inline-flex items-center rounded-lg border border-red-200 dark:border-red-700 px-3 py-1.5 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Eliminar banner
          </button>
        )}
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Este banner se muestra como portada en la pagina publica de la categoria.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Previsualizacion del banner
        </label>
        {bannerPreviewUrl ? (
          <div className="relative h-40 sm:h-52 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-black">
            <img
              src={bannerPreviewUrl}
              alt={`Preview de banner para ${watch('label') || 'categoria'}`}
              className="h-full w-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-linear-to-b from-black/20 to-black/65" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-pink-300">Kuruba SexShop</p>
              <p className="mt-1 text-xl font-serif text-white">{watch('label') || 'Categoria'}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Aun no hay banner seleccionado para previsualizar.
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Nombre de la categoría *
        </label>
        <input
          {...register('label')}
          type="text"
          onChange={(e) => {
            register('label').onChange(e);
            handleLabelChange(e);
          }}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:border-transparent transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
          placeholder="Ej: Lubricantes"
        />
        {errors.label && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.label.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Slug (URL amigable) *
        </label>
        <input
          {...register('slug')}
          type="text"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:border-transparent transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
          placeholder="Ej: lubricantes"
        />
        {errors.slug && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.slug.message}</p>
        )}
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Se auto-genera del nombre. Solo usa letras minúsculas, números y guiones.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Posición en el menú *
        </label>
        <input
          {...register('order_position', { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:border-transparent transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
          placeholder="0"
        />
        {errors.order_position && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.order_position.message}</p>
        )}
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Las categorías se ordenan de menor a mayor (0 = primero).
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          {...register('active')}
          type="checkbox"
          id="active"
          className="w-5 h-5 text-pink-600 dark:text-pink-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded focus:ring-pink-500 dark:focus:ring-pink-400 transition-colors"
        />
        <label htmlFor="active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Categoría activa (visible en el sitio)
        </label>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 dark:hover:bg-pink-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar categoría' : 'Crear categoría'}
        </button>
        <a
          href="/admin/categorias"
          className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold text-center"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}