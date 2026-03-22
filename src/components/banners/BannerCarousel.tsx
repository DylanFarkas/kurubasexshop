import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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

function getClosestSlideIndex(scroller: HTMLDivElement): number {
  const slides = Array.from(scroller.children) as HTMLElement[];
  if (slides.length === 0) return 0;

  const currentLeft = scroller.scrollLeft;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  slides.forEach((slide, index) => {
    const distance = Math.abs(slide.offsetLeft - currentLeft);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
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
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollEndTimeoutRef = useRef<number | null>(null);
  const shouldJumpRef = useRef(false);
  const [displayIndex, setDisplayIndex] = useState(0);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order),
    [items]
  );

  const activeItems = useMemo(
    () => sortedItems.filter((item) => item.is_active),
    [sortedItems]
  );

  const carouselItems = useMemo(
    () => (activeItems.length > 1 ? [...activeItems, activeItems[0]] : activeItems),
    [activeItems]
  );

  const currentIndex =
    activeItems.length > 1 && displayIndex === activeItems.length ? 0 : displayIndex;

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
  } as CSSProperties;

  const goToNext = () => {
    if (activeItems.length <= 1) return;

    setDisplayIndex((prev) => {
      if (prev >= activeItems.length) {
        return 1;
      }

      return prev + 1;
    });
  };

  const goToPrevious = () => {
    if (activeItems.length <= 1) return;

    setDisplayIndex((prev) => {
      if (prev === 0) {
        return activeItems.length - 1;
      }

      if (prev > activeItems.length - 1) {
        return activeItems.length - 1;
      }

      return prev - 1;
    });
  };

  useEffect(() => {
    if (activeItems.length === 0) {
      setDisplayIndex(0);
      return;
    }

    const maxDisplayIndex = activeItems.length > 1 ? activeItems.length : 0;
    if (displayIndex > maxDisplayIndex) {
      setDisplayIndex(activeItems.length > 1 ? activeItems.length - 1 : 0);
    }
  }, [activeItems.length, displayIndex]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const targetSlide = scroller.children.item(displayIndex) as HTMLElement | null;
    const targetLeft = targetSlide ? targetSlide.offsetLeft : displayIndex * scroller.clientWidth;
    const behavior: ScrollBehavior = shouldJumpRef.current ? 'auto' : 'smooth';

    scroller.scrollTo({
      left: targetLeft,
      behavior,
    });

    if (shouldJumpRef.current) {
      shouldJumpRef.current = false;
    }
  }, [displayIndex, activeItems.length]);

  useEffect(() => {
    if (!autoplayEnabled || activeItems.length <= 1) return;

    const interval = window.setInterval(() => {
      if (document.hidden) return;
      goToNext();
    }, safeAutoplayIntervalMs);

    return () => window.clearInterval(interval);
  }, [activeItems.length, autoplayEnabled, safeAutoplayIntervalMs]);

  useEffect(() => {
    return () => {
      if (scrollEndTimeoutRef.current) {
        window.clearTimeout(scrollEndTimeoutRef.current);
      }
    };
  }, []);

  const handleScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    if (scrollEndTimeoutRef.current) {
      window.clearTimeout(scrollEndTimeoutRef.current);
    }

    scrollEndTimeoutRef.current = window.setTimeout(() => {
      const nextIndex = getClosestSlideIndex(scroller);
      const maxDisplayIndex = activeItems.length > 1 ? activeItems.length : 0;

      if (nextIndex < 0 || nextIndex > maxDisplayIndex) {
        return;
      }

      if (activeItems.length > 1 && nextIndex === activeItems.length) {
        shouldJumpRef.current = true;
        setDisplayIndex(0);
        return;
      }

      setDisplayIndex(nextIndex);
    }, 120);
  };

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
        ref={scrollerRef}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl"
        style={{ scrollbarWidth: 'none' }}
        onScroll={handleScroll}
      >
        {carouselItems.map((item, itemIndex) => {
          const isTrailingClone = activeItems.length > 1 && itemIndex === activeItems.length;
          const key = isTrailingClone ? `${item.id}-clone` : item.id;
          const content = (
            <img
              src={item.image_url}
              alt="Banner promocional"
              className="h-(--banner-mobile-height) w-full shrink-0 snap-center object-cover md:h-(--banner-desktop-height)"
              loading="lazy"
              decoding="async"
            />
          );

          if (!item.target_url || disableLinks) {
            return (
              <div key={key} className="w-full shrink-0 basis-full snap-start bg-[#11100f]">
                {content}
              </div>
            );
          }

          const external = isExternalUrl(item.target_url);

          return (
            <a
              key={key}
              href={item.target_url}
              className="block w-full shrink-0 basis-full snap-start bg-[#11100f]"
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
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