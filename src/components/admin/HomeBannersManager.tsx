import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from 'react';
import { toast } from 'sonner';
import BannerCarousel from '../banners/BannerCarousel';
import { bannerTargetUrlSchema, homeBannerSettingsInputSchema } from '../../utils/validators';
import { DEFAULT_HOME_BANNER_SETTINGS, type HomeBanner, type HomeBannerSettingsInput } from '../../types/homeBanner';

type BannerDraft = {
  local_id: string;
  id?: string;
  image_url: string;
  public_id: string;
  target_url: string | null;
  sort_order: number;
  is_active: boolean;
};

type DeleteDraft = {
  id: string;
  public_id?: string;
};

type HomeBannersManagerProps = {
  initialItems: HomeBanner[];
  initialSettings?: HomeBannerSettingsInput;
};

type UploadProgress = {
  current: number;
  total: number;
};

type SettingsErrors = Partial<Record<keyof HomeBannerSettingsInput, string>>;

function createLocalId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeSortOrder(items: BannerDraft[]): BannerDraft[] {
  return items.map((item, index) => ({
    ...item,
    sort_order: index,
  }));
}

function toDraft(item: HomeBanner): BannerDraft {
  return {
    local_id: item.id || createLocalId(),
    id: item.id,
    image_url: item.image_url,
    public_id: item.public_id,
    target_url: item.target_url ?? null,
    sort_order: item.sort_order,
    is_active: item.is_active,
  };
}

function validateTargetUrl(value: string | null): string | null {
  const result = bannerTargetUrlSchema.safeParse(value);
  if (result.success) return null;

  return result.error.issues[0]?.message || 'URL de destino invalida';
}

export default function HomeBannersManager({ initialItems, initialSettings = DEFAULT_HOME_BANNER_SETTINGS }: HomeBannersManagerProps) {
  const [items, setItems] = useState<BannerDraft[]>(
    normalizeSortOrder(
      [...initialItems]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(toDraft)
    )
  );
  const [deleted, setDeleted] = useState<DeleteDraft[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [targetUrlErrors, setTargetUrlErrors] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<HomeBannerSettingsInput>(initialSettings);
  const [settingsErrors, setSettingsErrors] = useState<SettingsErrors>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const activeCount = useMemo(() => items.filter((item) => item.is_active).length, [items]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const updateItems = (updater: (prev: BannerDraft[]) => BannerDraft[]) => {
    setItems((prev) => normalizeSortOrder(updater(prev)));
    setHasUnsavedChanges(true);
  };

  const validateCurrentTargetUrls = (): boolean => {
    const nextErrors: Record<string, string> = {};

    items.forEach((item) => {
      const error = validateTargetUrl(item.target_url);
      if (error) {
        nextErrors[item.local_id] = error;
      }
    });

    setTargetUrlErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateCurrentSettings = (): boolean => {
    const validationResult = homeBannerSettingsInputSchema.safeParse(settings);

    if (validationResult.success) {
      setSettingsErrors({});
      return true;
    }

    const nextErrors: SettingsErrors = {};

    validationResult.error.issues.forEach((issue) => {
      const key = issue.path[0];
      if (typeof key === 'string') {
        nextErrors[key as keyof HomeBannerSettingsInput] = issue.message;
      }
    });

    setSettingsErrors(nextErrors);
    return false;
  };

  const updateSettings = <K extends keyof HomeBannerSettingsInput>(key: K, value: HomeBannerSettingsInput[K]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    setSettingsErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

    setHasUnsavedChanges(true);
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`El archivo ${file.name} no es una imagen valida`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`La imagen ${file.name} supera el limite de 5MB`);
        return;
      }
    }

    const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.error('Configuracion de Cloudinary incompleta');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      const newItems: BannerDraft[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setUploadProgress({ current: index + 1, total: files.length });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'kuruba/banners/home');

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || `Error al subir ${file.name}`);
        }

        newItems.push({
          local_id: createLocalId(),
          image_url: data.secure_url,
          public_id: data.public_id,
          target_url: null,
          is_active: true,
          sort_order: 0,
        });
      }

      updateItems((prev) => [...prev, ...newItems]);
      toast.success(`${newItems.length} banner(s) subido(s) correctamente`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error subiendo banners');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      setIsDragActive(false);
    }
  };

  const handleFilesInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    await uploadFiles(files);
    event.target.value = '';
  };

  const onDropFiles = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const files = Array.from(event.dataTransfer.files || []);
    await uploadFiles(files);
  };

  const handleRemoveItem = (item: BannerDraft) => {
    if (item.id) {
      setDeleted((prev) => [...prev, { id: item.id as string, public_id: item.public_id }]);
    }

    updateItems((prev) => prev.filter((current) => current.local_id !== item.local_id));
    setTargetUrlErrors((prev) => {
      const next = { ...prev };
      delete next[item.local_id];
      return next;
    });
  };

  const handleTargetUrlChange = (localId: string, value: string) => {
    updateItems((prev) =>
      prev.map((item) =>
        item.local_id === localId
          ? {
              ...item,
              target_url: value,
            }
          : item
      )
    );

    setTargetUrlErrors((prev) => {
      const next = { ...prev };
      delete next[localId];
      return next;
    });
  };

  const handleTargetUrlBlur = (localId: string, value: string | null) => {
    const error = validateTargetUrl(value);

    if (!error) {
      setTargetUrlErrors((prev) => {
        const next = { ...prev };
        delete next[localId];
        return next;
      });
      return;
    }

    setTargetUrlErrors((prev) => ({
      ...prev,
      [localId]: error,
    }));
  };

  const handleDragStart = (localId: string) => {
    setDraggingId(localId);
  };

  const handleDropItem = (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    updateItems((prev) => {
      const sourceIndex = prev.findIndex((item) => item.local_id === draggingId);
      const targetIndex = prev.findIndex((item) => item.local_id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });

    setDraggingId(null);
  };

  const handleSave = async () => {
    if (!validateCurrentTargetUrls()) {
      toast.error('Corrige las URLs invalidas antes de guardar');
      return;
    }

    if (!validateCurrentSettings()) {
      toast.error('Corrige la configuracion del carrusel antes de guardar');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        items: normalizeSortOrder(items).map((item) => ({
          id: item.id,
          image_url: item.image_url,
          public_id: item.public_id,
          target_url: item.target_url,
          sort_order: item.sort_order,
          is_active: item.is_active,
        })),
        deleted,
        settings,
      };

      const response = await fetch('/api/banners/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'No se pudieron guardar los cambios');
      }

      setItems(
        normalizeSortOrder(
          (result.items || [])
            .sort((a: HomeBanner, b: HomeBanner) => a.sort_order - b.sort_order)
            .map((item: HomeBanner) => ({
              ...toDraft(item),
              local_id: item.id,
            }))
        )
      );
      if (result.settings) {
        setSettings({
          autoplay_enabled: result.settings.autoplay_enabled,
          autoplay_interval_ms: result.settings.autoplay_interval_ms,
          mobile_height_px: result.settings.mobile_height_px,
          desktop_height_px: result.settings.desktop_height_px,
        });
      }
      setDeleted([]);
      setHasUnsavedChanges(false);

      const warnings = (result.cleanupWarnings || []) as Array<{ message: string; public_id: string }>;

      if (warnings.length > 0) {
        toast.warning(`Guardado con ${warnings.length} advertencia(s) de limpieza en Cloudinary`);
      } else {
        toast.success('Banners guardados exitosamente');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar banners');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Configuracion del carrusel</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define si el carrusel avanza solo y ajusta la altura en movil/desktop para mejorar el encuadre.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={settings.autoplay_enabled}
              onChange={(event) => updateSettings('autoplay_enabled', event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            Activar autoplay
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Intervalo de autoplay (segundos)
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              value={Math.round(settings.autoplay_interval_ms / 1000)}
              onChange={(event) => {
                const seconds = Number(event.target.value);
                if (Number.isNaN(seconds)) return;
                updateSettings('autoplay_interval_ms', Math.round(seconds * 1000));
              }}
              disabled={!settings.autoplay_enabled}
              className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-pink-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800"
            />
            {settingsErrors.autoplay_interval_ms && (
              <p className="mt-1 text-xs normal-case text-red-600 dark:text-red-400">{settingsErrors.autoplay_interval_ms}</p>
            )}
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Altura movil (px)
            <input
              type="number"
              min={160}
              max={800}
              step={8}
              value={settings.mobile_height_px}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isNaN(value)) return;
                updateSettings('mobile_height_px', Math.round(value));
              }}
              className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-pink-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            {settingsErrors.mobile_height_px && (
              <p className="mt-1 text-xs normal-case text-red-600 dark:text-red-400">{settingsErrors.mobile_height_px}</p>
            )}
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Altura desktop (px)
            <input
              type="number"
              min={200}
              max={1000}
              step={8}
              value={settings.desktop_height_px}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isNaN(value)) return;
                updateSettings('desktop_height_px', Math.round(value));
              }}
              className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-pink-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            {settingsErrors.desktop_height_px && (
              <p className="mt-1 text-xs normal-case text-red-600 dark:text-red-400">{settingsErrors.desktop_height_px}</p>
            )}
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Subida de banners</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Arrastra y suelta una o varias imágenes para crear banners.</p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        <label
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={onDropFiles}
          className={`block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
              : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900'
          }`}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFilesInputChange}
            disabled={isUploading}
          />

          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {isUploading
              ? `Subiendo ${uploadProgress?.current} de ${uploadProgress?.total}...`
              : 'Haz click o arrastra imágenes aquí'}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">PNG, JPG, WEBP de hasta 5MB</p>
        </label>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gestión de banners</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total: {items.length} | Activos: {activeCount}</p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
            No hay banners cargados. Sube imágenes para comenzar.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.local_id}
                draggable
                onDragStart={() => handleDragStart(item.local_id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDropItem(item.local_id)}
                className="grid gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700 md:grid-cols-[auto_1fr_auto]"
              >
                <div className="flex items-center gap-3">
                  <span className="cursor-grab text-gray-400" title="Arrastra para reordenar">⋮⋮</span>
                  <img
                    src={item.image_url}
                    alt="Miniatura del banner"
                    className="h-20 w-28 rounded object-cover"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    URL de destino
                    <input
                      type="text"
                      value={item.target_url ?? ''}
                      onChange={(event) => handleTargetUrlChange(item.local_id, event.target.value)}
                      onBlur={(event) => handleTargetUrlBlur(item.local_id, event.target.value || null)}
                      placeholder="/tienda o https://instagram.com/..."
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-pink-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    />
                  </label>
                  {targetUrlErrors[item.local_id] && (
                    <p className="text-xs text-red-600 dark:text-red-400">{targetUrlErrors[item.local_id]}</p>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400">Orden: {item.sort_order + 1}</p>
                </div>

                <div className="flex items-center gap-2 md:flex-col md:items-end md:justify-between">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={item.is_active}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        updateItems((prev) =>
                          prev.map((current) =>
                            current.local_id === item.local_id
                              ? { ...current, is_active: checked }
                              : current
                          )
                        );
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    Activo
                  </label>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item)}
                    className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Vista previa</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Este preview usa el mismo componente de carrusel del home y respeta orden/estado activo.</p>
        </div>

        <BannerCarousel
          disableLinks
          autoplayEnabled={settings.autoplay_enabled}
          autoplayIntervalMs={settings.autoplay_interval_ms}
          mobileHeightPx={settings.mobile_height_px}
          desktopHeightPx={settings.desktop_height_px}
          items={items.map((item) => ({
            id: item.local_id,
            image_url: item.image_url,
            target_url: item.target_url,
            sort_order: item.sort_order,
            is_active: item.is_active,
          }))}
        />
      </section>
    </div>
  );
}
