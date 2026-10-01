"use client";
import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

export interface TestimonialItem {
  id?: string;
  text: string;
  image?: string | null;
  name: string;
  role?: string;
}

function TestimonialCard({
  item,
  isClone,
}: {
  item: TestimonialItem;
  isClone?: boolean;
}) {
  const { text, image, name, role } = item;
  return (
    <div
      className="p-6 md:p-7 rounded-3xl border border-[#c7c9bb]/70 bg-[#faf8f3]/95 backdrop-blur-sm shadow-[0_4px_20px_rgba(45,58,49,0.04)] hover:shadow-[0_8px_30px_rgba(45,58,49,0.08)] transition-all max-w-[290px] sm:max-w-[320px] w-full flex flex-col justify-between shrink-0"
      aria-hidden={isClone ? "true" : undefined}
    >
      <div className="font-editorial text-base sm:text-[17px] leading-relaxed text-[#2d3a31] font-normal italic break-words whitespace-pre-wrap">
        "{text}"
      </div>
      <div className="flex items-center gap-3.5 mt-5 pt-4 border-t border-[#c7c9bb]/40">
        <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-full overflow-hidden border border-[#8f9978]/50 shrink-0 bg-[#e7e4d9] flex items-center justify-center shadow-xs">
          {image ? (
            <img
              src={image}
              alt={isClone ? "" : name}
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
  );
}

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: TestimonialItem[];
  duration?: number;
  speed?: number;
}) => {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const clone1Ref = useRef<HTMLDivElement>(null);

  const [isOverflowing, setIsOverflowing] = useState(false);
  const [needExtraClone, setNeedExtraClone] = useState(false);

  const isInteractingRef = useRef(false);
  const isIntersectingRef = useRef(true);
  const isOverflowingRef = useRef(false);
  const loopHeightRef = useRef(0);
  const scrollAccumulatorRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wheelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Speed in pixels per second: ~24 px/s (target range: 22-28 px/s)
  const speed = props.speed ?? (props.duration ? Math.round(560 / props.duration) : 24);

  // Overflow detection and loop distance measurement
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      const clientH = container.clientHeight;
      const contentH = content.offsetHeight;

      // When element is display: none (e.g. desktop column hidden on mobile), clientHeight is 0
      if (clientH === 0) {
        if (isOverflowingRef.current) {
          isOverflowingRef.current = false;
          setIsOverflowing(false);
        }
        return;
      }

      const overflows = contentH > clientH + 4;
      if (overflows !== isOverflowingRef.current) {
        isOverflowingRef.current = overflows;
        setIsOverflowing(overflows);
      }

      // Need 3 sets if single set is shorter than clientHeight * 1.5, to ensure scrollTop never hits container boundary
      const extra = overflows && (contentH < clientH * 1.5 || props.testimonials.length <= 4);
      setNeedExtraClone(extra);

      // Measure exact loop height from top of real cards to top of first clone (including gap)
      if (clone1Ref.current) {
        const measured = clone1Ref.current.offsetTop - content.offsetTop;
        if (measured > 0) {
          loopHeightRef.current = measured;
          return;
        }
      }
      loopHeightRef.current = contentH + 24;
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });

    resizeObserver.observe(container);
    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
    };
  }, [props.testimonials]);

  // Keep loop height accurately updated when clones render/re-render
  useEffect(() => {
    if (clone1Ref.current && contentRef.current) {
      const measured = clone1Ref.current.offsetTop - contentRef.current.offsetTop;
      if (measured > 0) {
        loopHeightRef.current = measured;
      }
    }
  });

  // Pause when offscreen to conserve CPU / battery
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersectingRef.current = entry?.isIntersecting ?? true;
        if (!entry?.isIntersecting) {
          lastTimestampRef.current = null;
        }
      },
      { rootMargin: "150px" }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Interaction handlers: pause on interaction, resume 3s after user stops
  const handleInteractionStart = () => {
    isInteractingRef.current = true;
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  const handleInteractionEnd = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = setTimeout(() => {
      if (containerRef.current) {
        scrollAccumulatorRef.current = containerRef.current.scrollTop;
      }
      lastTimestampRef.current = null;
      isInteractingRef.current = false;
      resumeTimerRef.current = null;
    }, 3000);
  };

  // Event listeners for manual interaction (touch, mouse wheel, trackpad, pointer drag)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = () => handleInteractionStart();
    const onTouchMove = () => handleInteractionStart();
    const onTouchEnd = () => handleInteractionEnd();
    const onTouchCancel = () => handleInteractionEnd();

    const onWheel = () => {
      handleInteractionStart();
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        handleInteractionEnd();
      }, 200);
    };

    // Pointer/Mouse drag for desktop users without wheel/trackpad
    let isPointerDragging = false;
    let startY = 0;
    let startScroll = 0;

    const onPointerDown = (e: PointerEvent) => {
      handleInteractionStart();
      if (e.pointerType === "mouse" && e.button === 0) {
        isPointerDragging = true;
        startY = e.clientY;
        startScroll = container.scrollTop;
        try {
          container.setPointerCapture(e.pointerId);
        } catch {}
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isPointerDragging) {
        const delta = e.clientY - startY;
        container.scrollTop = startScroll - delta;
        scrollAccumulatorRef.current = container.scrollTop;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isPointerDragging) {
        isPointerDragging = false;
        try {
          container.releasePointerCapture(e.pointerId);
        } catch {}
      }
      handleInteractionEnd();
    };

    const onScroll = () => {
      const currentScroll = container.scrollTop;
      const loopHeight = loopHeightRef.current;

      // Handle seamless wrap during manual drag / scroll
      if (loopHeight > 0) {
        if (currentScroll >= loopHeight * 1.5) {
          container.scrollTop = currentScroll - loopHeight;
          scrollAccumulatorRef.current = container.scrollTop;
          return;
        } else if (currentScroll <= 0) {
          container.scrollTop = currentScroll + loopHeight;
          scrollAccumulatorRef.current = container.scrollTop;
          return;
        }
      }
      if (isInteractingRef.current) {
        scrollAccumulatorRef.current = currentScroll;
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        lastTimestampRef.current = null;
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchCancel, { passive: true });
    container.addEventListener("wheel", onWheel, { passive: true });
    container.addEventListener("pointerdown", onPointerDown, { passive: true });
    container.addEventListener("pointermove", onPointerMove, { passive: true });
    container.addEventListener("pointerup", onPointerUp, { passive: true });
    container.addEventListener("pointercancel", onPointerUp, { passive: true });
    container.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchCancel);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      container.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, []);

  // Continuous auto-scroll loop via requestAnimationFrame
  useEffect(() => {
    if (reduced) return;

    let animId: number;

    const step = (now: number) => {
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = now;
      }
      const elapsed = Math.min((now - lastTimestampRef.current) / 1000, 0.1);
      lastTimestampRef.current = now;

      const container = containerRef.current;
      const loopHeight = loopHeightRef.current;

      if (
        container &&
        isOverflowingRef.current &&
        !isInteractingRef.current &&
        isIntersectingRef.current &&
        loopHeight > 0
      ) {
        scrollAccumulatorRef.current += speed * elapsed;

        if (scrollAccumulatorRef.current >= loopHeight) {
          scrollAccumulatorRef.current -= loopHeight;
          container.scrollTop -= loopHeight;
        }

        container.scrollTop = scrollAccumulatorRef.current;
      }

      animId = requestAnimationFrame(step);
      animFrameRef.current = animId;
    };

    animId = requestAnimationFrame(step);
    animFrameRef.current = animId;

    return () => {
      cancelAnimationFrame(animId);
      lastTimestampRef.current = null;
    };
  }, [reduced, speed]);

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
      className={`guestbook-scroll-column select-none outline-none ${props.className || ""}`}
      style={{
        height: "100%",
        maxHeight: "100%",
        overflowY: isOverflowing ? "auto" : "hidden",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        touchAction: "pan-y",
        cursor: isOverflowing ? "grab" : "default",
      }}
    >
      <div className="flex flex-col gap-6 pb-6">
        {/* Real accessible comments */}
        <div ref={contentRef} className="flex flex-col gap-6">
          {props.testimonials.map((item, i) => (
            <TestimonialCard key={item.id || `card-${i}`} item={item} />
          ))}
        </div>

        {/* Visual clone 1 for continuous infinite looping */}
        {isOverflowing && (
          <div ref={clone1Ref} aria-hidden="true" className="flex flex-col gap-6">
            {props.testimonials.map((item, i) => (
              <TestimonialCard
                key={`clone1-${item.id || i}`}
                item={item}
                isClone
              />
            ))}
          </div>
        )}

        {/* Visual clone 2 when content is short to guarantee wrap without hitting bottom */}
        {isOverflowing && needExtraClone && (
          <div aria-hidden="true" className="flex flex-col gap-6">
            {props.testimonials.map((item, i) => (
              <TestimonialCard
                key={`clone2-${item.id || i}`}
                item={item}
                isClone
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
