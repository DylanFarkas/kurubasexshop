export type Category = {
  id: string;
  label: string;
  slug: string;
  order_position: number;
  active: boolean;
  banner_image_url?: string | null;
  banner_public_id?: string | null;
  created_at?: string;
};