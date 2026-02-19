import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import type { Category } from '../../types/category';

const categoryFormSchema = z.object({
  label: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string().min(2, 'El slug debe tener al menos 2 caracteres'),
  order_position: z.number().int().min(0, 'La posición debe ser un número positivo'),
  active: z.boolean(),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  category?: Category;
  onSuccess?: () => void;
}

export default function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!category;

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category ? {
      label: category.label,
      slug: category.slug,
      order_position: category.order_position,
      active: category.active,
    } : {
      label: '',
      slug: '',
      order_position: 0,
      active: true,
    }
  });

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
    setError(null);

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

      // Redirigir al listado
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = '/admin/categorias';
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar la categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

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