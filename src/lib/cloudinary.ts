export function getCloudinaryUrl(
  publicId: string,
  transformations?: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale';
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  }
): string {
  const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
  
  if (!transformations) {
    return `${baseUrl}/${publicId}`;
  }
  
  const transforms: string[] = [];
  
  if (transformations.width) transforms.push(`w_${transformations.width}`);
  if (transformations.height) transforms.push(`h_${transformations.height}`);
  if (transformations.crop) transforms.push(`c_${transformations.crop}`);
  if (transformations.quality) transforms.push(`q_${transformations.quality}`);
  if (transformations.format) transforms.push(`f_${transformations.format}`);
  
  const transformString = transforms.join(',');
  
  return `${baseUrl}/${transformString}/${publicId}`;
}

export const CLOUDINARY_PRESETS = {
  thumbnail: { width: 300, height: 375, crop: 'fill', quality: 'auto', format: 'auto' },
  main: { width: 800, height: 1000, crop: 'fill', quality: 'auto', format: 'auto' },
  gallery: { width: 1200, height: 1500, crop: 'fill', quality: 'auto', format: 'auto' },
} as const;