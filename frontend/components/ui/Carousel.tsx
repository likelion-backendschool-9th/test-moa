"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useState, useSyncExternalStore, type FocusEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

export type CarouselSlide = {
  key: string;
  content: ReactNode;
};

type CarouselProps = {
  slides: CarouselSlide[];
  label: string;
  intervalMs?: number;
  className?: string;
  "data-testid"?: string;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

const noopSubscribe = () => () => {};

/** 서버 렌더와 하이드레이션 중에는 false, 그 뒤에는 true */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * 슬라이드를 일정 간격으로 순환한다. hover·focus 중이거나 reduced motion이면 멈춘다.
 * 모든 슬라이드를 같은 칸에 겹쳐 두어 가장 긴 슬라이드 높이에 맞추고, 넘어갈 때 높이가 흔들리지 않게 한다.
 * 자동 순환 중인지는 data-autoplay로 드러낸다.
 */
export function Carousel({ slides, label, intervalMs = 5000, className, ...props }: CarouselProps) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const hydrated = useHydrated();
  const count = slides.length;
  const paused = hovered || focused || reducedMotion;
  const autoplay = hydrated && !paused && count > 1;

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => setIndex((value) => (value + 1) % count), intervalMs);
    return () => clearInterval(id);
  }, [autoplay, count, intervalMs]);

  function move(step: number) {
    setIndex((value) => (value + step + count) % count);
  }

  function onBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      data-autoplay={autoplay ? "on" : "off"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
      className={cn("relative flex flex-col gap-6", className)}
      {...props}
    >
      <div className="grid flex-1" aria-live={paused ? "polite" : "off"}>
        {slides.map((slide, slideIndex) => {
          const active = slideIndex === index % count;
          return (
            <div
              key={slide.key}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} / ${count}`}
              aria-hidden={!active}
              inert={!active}
              className={cn("col-start-1 row-start-1", active ? "animate-rise-in" : "invisible")}
            >
              {slide.content}
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <div className="flex items-center justify-end gap-2 md:absolute md:right-10 md:bottom-10">
          <Button variant="ghost" size="sm" aria-label="이전 슬라이드" onClick={() => move(-1)}>
            <CaretLeftIcon aria-hidden size={16} weight="bold" />
          </Button>
          <span className="min-w-12 text-center text-sm tabular-nums text-text-muted">
            {(index % count) + 1} / {count}
          </span>
          <Button variant="ghost" size="sm" aria-label="다음 슬라이드" onClick={() => move(1)}>
            <CaretRightIcon aria-hidden size={16} weight="bold" />
          </Button>
        </div>
      )}
    </section>
  );
}
