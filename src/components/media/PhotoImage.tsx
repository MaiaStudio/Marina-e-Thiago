'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { mediaUrl } from '@/lib/media';
import type { Photo } from '@/lib/manifest/types';
export const NearChapter = createContext(true);
export function ChapterLoader({ children, className = '', id, margin = '900px' }: { children: React.ReactNode; className?: string; id?: string; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting && e.intersectionRatio > 0)) { setNear(true); observer.disconnect(); } }, { rootMargin: margin });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [margin]);
  return <div ref={ref} className={className} id={id}><NearChapter.Provider value={near}>{children}</NearChapter.Provider></div>;
}
export function PhotoImage({ photo, className = '', sizes = '(min-width: 900px) 55vw, 100vw', priority = false, contain = false }: { photo: Photo; className?: string; sizes?: string; priority?: boolean; contain?: boolean }) {
  const near = useContext(NearChapter);
  const load = priority || near; const responsiveSizes = sizes === '100vw' ? `max(100vw, ${Math.round(photo.aspectRatio * 100)}svh)` : sizes;
  const sources = (format: 'avif' | 'webp') => photo.variants.filter(v => v.format === format).map(v => `${mediaUrl(v.src)} ${v.width}w`).join(', ');
  return <picture className={`photo ${className}`} style={{ backgroundImage: `url("${photo.placeholder}")`, aspectRatio: photo.aspectRatio }}>
    {load && <source type="image/avif" srcSet={sources('avif')} sizes={responsiveSizes} />}
    {load && <source type="image/webp" srcSet={sources('webp')} sizes={responsiveSizes} />}
    {/* Native picture deliberately serves pre-generated AVIF/WebP without a second optimizer. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={load ? mediaUrl(photo.src) : photo.placeholder} width={photo.width} height={photo.height} alt={photo.alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" style={{ objectPosition: `${photo.focalPoint.x}% ${photo.focalPoint.y}%`, objectFit: contain ? 'contain' : 'cover' }} />
  </picture>;
}


