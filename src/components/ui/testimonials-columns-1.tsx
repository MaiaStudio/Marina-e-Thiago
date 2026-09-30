"use client";
import React from "react";
import { m, useReducedMotion } from "motion/react";

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
}) => {
  const reduced = useReducedMotion();

  if (!props.testimonials || props.testimonials.length === 0) {
    return null;
  }

  // Rola no automático apenas quando houver comentários suficientes (> 1)
  const shouldAnimate = !reduced && props.testimonials.length > 1;
  const loopCount = shouldAnimate ? 2 : 1;

  return (
    <div className={props.className}>
      <m.div
        animate={
          shouldAnimate
            ? {
                translateY: "-50%",
              }
            : undefined
        }
        transition={
          shouldAnimate
            ? {
                duration: props.duration || 20,
                repeat: Infinity,
                ease: "linear",
                repeatType: "loop",
              }
            : undefined
        }
        className="flex flex-col gap-6 pb-6"
      >
        {Array.from({ length: loopCount }).map((_, index) => (
          <React.Fragment key={index}>
            {props.testimonials.map(({ text, image, name, role, id }, i) => (
              <div
                className="p-6 md:p-7 rounded-3xl border border-[#c7c9bb]/70 bg-[#faf8f3]/95 backdrop-blur-sm shadow-[0_4px_20px_rgba(45,58,49,0.04)] hover:shadow-[0_8px_30px_rgba(45,58,49,0.08)] transition-all max-w-[290px] sm:max-w-[320px] w-full flex flex-col justify-between shrink-0"
                key={id ? `${index}-${id}` : `${index}-${i}`}
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
          </React.Fragment>
        ))}
      </m.div>
    </div>
  );
};
