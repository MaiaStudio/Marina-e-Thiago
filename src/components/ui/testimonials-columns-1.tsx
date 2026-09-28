"use client";
import React, { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

export interface TestimonialItem {
  id?: string;
  text: string;
  image?: string | null;
  name: string;
  role?: string;
}

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: TestimonialItem[];
  duration?: number;
  speed?: number; // pixels per second
  initialDirection?: 1 | -1;
}) => {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseAtLimitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const directionRef = useRef<number>(props.initialDirection ?? 1);
  const lastTimestampRef = useRef<number | null>(null);
  const isPausedAtLimitRef = useRef(false);
  const lastAutoScrollTimeRef = useRef(0);
  const currentScrollAccumulatorRef = useRef(0);

  // Speed in pixels per second: default ~24-26 px/s for smooth editorial motion
  const speed = props.speed ?? (props.duration ? Math.round(520 / props.duration) : 24);

  // Pauses auto-scroll on manual interaction and resumes 4 seconds after inactivity
  const handleUserInteraction = () => {
    isInteractingRef.current = true;
    isPausedAtLimitRef.current = false;

    if (containerRef.current) {
      currentScrollAccumulatorRef.current = containerRef.current.scrollTop;
    }

    if (pauseAtLimitTimerRef.current) {
      clearTimeout(pauseAtLimitTimerRef.current);
      pauseAtLimitTimerRef.current = null;
    }

    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }

    lastTimestampRef.current = null;

    resumeTimerRef.current = setTimeout(() => {
      if (containerRef.current) {
        currentScrollAccumulatorRef.current = containerRef.current.scrollTop;
      }
      isInteractingRef.current = false;
      lastTimestampRef.current = null;
      resumeTimerRef.current = null;
    }, 4000);
  };

  // Attach native passive listeners for all manual interaction modalities
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onInteraction = () => {
      handleUserInteraction();
    };

    const onScroll = () => {
      // Ignore scroll events dispatched by programmatic requestAnimationFrame updates
      if (performance.now() - lastAutoScrollTimeRef.current < 50) {
        return;
      }
      handleUserInteraction();
    };

    container.addEventListener("wheel", onInteraction, { passive: true });
    container.addEventListener("touchstart", onInteraction, { passive: true });
    container.addEventListener("touchmove", onInteraction, { passive: true });
    container.addEventListener("touchend", onInteraction, { passive: true });
    container.addEventListener("touchcancel", onInteraction, { passive: true });
    container.addEventListener("pointerdown", onInteraction, { passive: true });
    container.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      container.removeEventListener("wheel", onInteraction);
      container.removeEventListener("touchstart", onInteraction);
      container.removeEventListener("touchmove", onInteraction);
      container.removeEventListener("touchend", onInteraction);
      container.removeEventListener("touchcancel", onInteraction);
      container.removeEventListener("pointerdown", onInteraction);
      container.removeEventListener("scroll", onScroll);
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
      if (pauseAtLimitTimerRef.current) {
        clearTimeout(pauseAtLimitTimerRef.current);
      }
    };
  }, []);

  // Continuous smooth auto-scroll loop with limit detection and gentle reversal
  useEffect(() => {
    const container = containerRef.current;
    if (!container || reduced) return;

    let animationFrameId: number;

    const step = (now: number) => {
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = now;
      }

      const elapsed = Math.min((now - lastTimestampRef.current) / 1000, 0.1);
      lastTimestampRef.current = now;

      const isInteracting = isInteractingRef.current;
      const isPausedAtLimit = isPausedAtLimitRef.current;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const maxScroll = scrollHeight - clientHeight;

      // Only auto-scroll when content overflows the container
      if (!isInteracting && !isPausedAtLimit && maxScroll > 2) {
        const moveDistance = speed * elapsed * directionRef.current;
        currentScrollAccumulatorRef.current += moveDistance;

        if (directionRef.current === 1) {
          // Scrolling downwards
          if (currentScrollAccumulatorRef.current >= maxScroll - 1) {
            currentScrollAccumulatorRef.current = maxScroll;
            container.scrollTop = maxScroll;
            lastAutoScrollTimeRef.current = performance.now();
            directionRef.current = -1;
            isPausedAtLimitRef.current = true;
            pauseAtLimitTimerRef.current = setTimeout(() => {
              isPausedAtLimitRef.current = false;
              lastTimestampRef.current = null;
            }, 1200);
          } else {
            container.scrollTop = Math.round(currentScrollAccumulatorRef.current);
            lastAutoScrollTimeRef.current = performance.now();
          }
        } else {
          // Scrolling upwards
          if (currentScrollAccumulatorRef.current <= 1) {
            currentScrollAccumulatorRef.current = 0;
            container.scrollTop = 0;
            lastAutoScrollTimeRef.current = performance.now();
            directionRef.current = 1;
            isPausedAtLimitRef.current = true;
            pauseAtLimitTimerRef.current = setTimeout(() => {
              isPausedAtLimitRef.current = false;
              lastTimestampRef.current = null;
            }, 1200);
          } else {
            container.scrollTop = Math.round(currentScrollAccumulatorRef.current);
            lastAutoScrollTimeRef.current = performance.now();
          }
        }
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [reduced, speed, props.testimonials.length]);

  if (!props.testimonials || props.testimonials.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-lenis-prevent
      tabIndex={0}
      role="region"
      aria-label="Mural de lembranças"
      className={`guestbook-scroll-column outline-none ${props.className || ""}`}
    >
      <div className="flex flex-col gap-6 py-2 pb-6">
        {props.testimonials.map(({ text, image, name, role, id }, i) => (
          <div
            className="p-6 md:p-7 rounded-3xl border border-[#c7c9bb]/70 bg-[#faf8f3]/95 backdrop-blur-sm shadow-[0_4px_20px_rgba(45,58,49,0.04)] hover:shadow-[0_8px_30px_rgba(45,58,49,0.08)] transition-all max-w-[290px] sm:max-w-[320px] w-full flex flex-col justify-between shrink-0"
            key={id || `card-${i}`}
          >
            <div className="font-editorial text-base sm:text-[17px] leading-relaxed text-[#2d3a31] font-normal italic break-words whitespace-pre-wrap">
              "{text}"
            </div>
            <div className="flex items-center gap-3.5 mt-5 pt-4 border-t border-[#c7c9bb]/40">
              <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-full overflow-hidden border border-[#8f9978]/50 shrink-0 bg-[#e7e4d9] flex items-center justify-center shadow-xs">
                {image ? (
                  <img
                    src={image}
                    alt={name}
                    className="!w-full !h-full !max-w-full !max-h-full object-cover rounded-full"
                    style={{ width: "48px", height: "48px", minWidth: "48px", minHeight: "48px", objectFit: "cover" }}
                  />
                ) : (
                  <span
                    className="text-xs font-semibold text-[#5c6656] tracking-wider select-none font-sans"
                    aria-hidden="true"
                  >
                    {name ? name.slice(0, 2).toUpperCase() : "M&T"}
                  </span>
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <div className="font-editorial text-[18px] sm:text-[20px] font-medium text-[#2d3a31] leading-tight break-words">
                  {name}
                </div>
                {role && (
                  <div className="text-xs text-[#5c6656] font-normal tracking-wide mt-1 leading-snug break-words">
                    {role}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
