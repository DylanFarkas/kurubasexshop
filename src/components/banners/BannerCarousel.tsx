import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { HomeBanner } from '../../types/homeBanner';

type BannerCarouselProps = {
  items: Array<Pick<HomeBanner, 'id' | 'image_url' | 'target_url' | 'sort_order' | 'is_active'>>;
  disableLinks?: boolean;
  autoplayEnabled?: boolean;
  autoplayIntervalMs?: number;
  mobileHeightPx?: number;
  desktopHeightPx?: number;
  className?: string;
};

const MIN_AUTOPLAY_INTERVAL_MS = 1000;
const MAX_AUTOPLAY_INTERVAL_MS = 30000;
const DEFAULT_AUTOPLAY_INTERVAL_MS = 5000;
const MIN_MOBILE_HEIGHT_PX = 160;
const MAX_MOBILE_HEIGHT_PX = 800;
const DEFAULT_MOBILE_HEIGHT_PX = 288;
const MIN_DESKTOP_HEIGHT_PX = 200;
const MAX_DESKTOP_HEIGHT_PX = 1000;
const DEFAULT_DESKTOP_HEIGHT_PX = 384;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isExternalUrl(url: string): boolean {
  return /^https:\/\//i.test(url);
}

export default function BannerCarousel({
  items,
  disableLinks = false,
  autoplayEnabled = true,
  autoplayIntervalMs = DEFAULT_AUTOPLAY_INTERVAL_MS,
  mobileHeightPx = DEFAULT_MOBILE_HEIGHT_PX,
  desktopHeightPx = DEFAULT_DESKTOP_HEIGHT_PX,
  className = '',
}: BannerCarouselProps) {
  const [displayIndex, setDisplayIndex] = useState(0);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order),
    [items]
  );

  const activeItems = useMemo(
    () => sortedItems.filter((item) => item.is_active),
    [sortedItems]
  );

  const currentIndex = displayIndex;

  const safeAutoplayIntervalMs = clamp(
    Math.round(autoplayIntervalMs),
    MIN_AUTOPLAY_INTERVAL_MS,
    MAX_AUTOPLAY_INTERVAL_MS
  );
  const safeMobileHeightPx = clamp(
    Math.round(mobileHeightPx),
    MIN_MOBILE_HEIGHT_PX,
    MAX_MOBILE_HEIGHT_PX
  );
  const safeDesktopHeightPx = clamp(
    Math.round(desktopHeightPx),
    MIN_DESKTOP_HEIGHT_PX,
    MAX_DESKTOP_HEIGHT_PX
  );

  const carouselStyle = {
    '--banner-mobile-height': `${safeMobileHeightPx}px`,
    '--banner-desktop-height': `${safeDesktopHeightPx}px`,
    '--banner-mobile-height-fluid': `clamp(${MIN_MOBILE_HEIGHT_PX}px, 30vw, ${safeMobileHeightPx}px)`,
    '--banner-desktop-height-fluid': `clamp(${MIN_DESKTOP_HEIGHT_PX}px, 42vw, ${safeDesktopHeightPx}px)`,
    '--banner-max-height-vh': '72vh',
  } as CSSProperties;

  const goToNext = () => {
    if (activeItems.length <= 1) return;

    setDisplayIndex((prev) => (prev + 1) % activeItems.length);
  };

  const goToPrevious = () => {
    if (activeItems.length <= 1) return;

    setDisplayIndex((prev) => (prev === 0 ? activeItems.length - 1 : prev - 1));
  };

  useEffect(() => {
    if (activeItems.length === 0) {
      setDisplayIndex(0);
      return;
    }

    const maxDisplayIndex = activeItems.length - 1;
    if (displayIndex > maxDisplayIndex) {
      setDisplayIndex(Math.max(maxDisplayIndex, 0));
    }
  }, [activeItems.length, displayIndex]);

  useEffect(() => {
    if (!autoplayEnabled || activeItems.length <= 1) return;

    const interval = window.setInterval(() => {
      if (document.hidden) return;
      goToNext();
    }, safeAutoplayIntervalMs);

    return () => window.clearInterval(interval);
  }, [activeItems.length, autoplayEnabled, safeAutoplayIntervalMs]);

  if (activeItems.length === 0) {
    return (
      <div className={`rounded-xl border border-dashed border-[#2a2520] bg-[#11100f] px-6 py-10 text-center text-[#8b8a83] ${className}`}>
        No hay banners activos para mostrar.
      </div>
    );
  }

  return (
    <section
      className={`relative w-full ${className}`}
      style={carouselStyle}
    >
      <div
        className="relative h-[min(var(--banner-mobile-height-fluid),var(--banner-max-height-vh))] overflow-hidden rounded-2xl  md:h-[min(var(--banner-desktop-height-fluid),var(--banner-max-height-vh))]"
      >
        {activeItems.map((item, itemIndex) => {
          const isVisible = itemIndex === currentIndex;
          const content = (
            <img
              src={item.image_url}
              alt="Banner promocional"
              className="h-full w-full object-contain object-center md:object-cover"
              loading="lazy"
              decoding="async"
            />
          );

          if (!item.target_url || disableLinks) {
            return (
              <div
                key={item.id}
                className={`absolute inset-0 transition-opacity duration-500 ease-out ${isVisible ? 'opacity-100 z-1' : 'opacity-0 z-0 pointer-events-none'}`}
                aria-hidden={!isVisible}
              >
                {content}
              </div>
            );
          }

          const external = isExternalUrl(item.target_url);

          return (
            <a
              key={item.id}
              href={item.target_url}
              className={`absolute inset-0 block transition-opacity duration-500 ease-out ${isVisible ? 'opacity-100 z-1' : 'opacity-0 z-0 pointer-events-none'}`}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              aria-hidden={!isVisible}
              tabIndex={isVisible ? 0 : -1}
            >
              {content}
            </a>
          );
        })}
      </div>

      {activeItems.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[#2a2520] bg-[rgba(10,10,10,0.72)] text-[#f0ece4] transition-colors hover:border-[#b4704a]"
            aria-label="Banner anterior"
            onClick={goToPrevious}
          >
            ‹
          </button>

          <button
            type="button"
            className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[#2a2520] bg-[rgba(10,10,10,0.72)] text-[#f0ece4] transition-colors hover:border-[#b4704a]"
            aria-label="Banner siguiente"
            onClick={goToNext}
          >
            ›
          </button>
        </>
      )}
    </section>
  );
}