import { useState } from 'react';

interface MultiImageUploaderProps {
  onImagesUploaded: (urls: string[]) => void;
  label?: string;
}

export default function MultiImageUploader({ 
  onImagesUploaded, 
  label = 'Subir Imágenes' 
}: MultiImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validar todos los archivos antes de subir
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Todos los archivos deben ser imágenes válidas');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`La imagen ${file.name} supera los 5MB`);
        return;
      }
    }

    setError(null);
    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error('Configuración de Cloudinary no encontrada');
      }

      const uploadedUrls: string[] = [];

      // Subir cada imagen
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'kuruba/products');

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error('Cloudinary error response:', data);
          const errorMsg = data.error?.message || 'Error al subir la imagen';
          throw new Error(`Cloudinary (${file.name}): ${errorMsg}`);
        }

        uploadedUrls.push(data.secure_url);
      }

      // Notificar que todas las imágenes se subieron
      onImagesUploaded(uploadedUrls);

      // Limpiar el input para permitir subir las mismas imágenes de nuevo
      e.target.value = '';
    } catch (err) {
      console.error('Error uploading images:', err);
      setError(err instanceof Error ? err.message : 'Error al subir las imágenes');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      <div>
        <label
          htmlFor={`multi-file-upload-${label}`}
          className={`
            relative cursor-pointer inline-flex items-center gap-2 px-4 py-2 
            border border-gray-300 rounded-lg shadow-sm text-sm font-medium 
            text-gray-700 bg-white hover:bg-gray-50 transition
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-pink-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>
                Subiendo {uploadProgress?.current} de {uploadProgress?.total}...
              </span>
            </>
          ) : (
            <>
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Seleccionar Imágenes</span>
            </>
          )}
          <input
            id={`multi-file-upload-${label}`}
            type="file"
            className="sr-only"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
        
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        
        <p className="mt-2 text-xs text-gray-500">
          PNG, JPG, WEBP hasta 5MB cada una. Puedes seleccionar múltiples archivos.
        </p>
      </div>
    </div>
  );
}
