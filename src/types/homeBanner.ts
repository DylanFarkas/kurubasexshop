export type HomeBanner = {
  id: string;
  image_url: string;
  public_id: string;
  target_url?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type HomeBannerInput = {
  id?: string;
  image_url: string;
  public_id: string;
  target_url?: string | null;
  sort_order: number;
  is_active: boolean;
};

export type HomeBannerDeleteInput = {
  id: string;
  public_id?: string;
};

export type HomeBannerSettings = {
  id?: string;
  singleton_key?: boolean;
  autoplay_enabled: boolean;
  autoplay_interval_ms: number;
  mobile_height_px: number;
  desktop_height_px: number;
  created_at?: string;
  updated_at?: string;
};

export type HomeBannerSettingsInput = {
  autoplay_enabled: boolean;
  autoplay_interval_ms: number;
  mobile_height_px: number;
  desktop_height_px: number;
};

export const DEFAULT_HOME_BANNER_SETTINGS: HomeBannerSettingsInput = {
  autoplay_enabled: true,
  autoplay_interval_ms: 5000,
  mobile_height_px: 288,
  desktop_height_px: 384,
};

export type HomeBannersSavePayload = {
  items: HomeBannerInput[];
  deleted?: HomeBannerDeleteInput[];
  settings?: HomeBannerSettingsInput;
};
