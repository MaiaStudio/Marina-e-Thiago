'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState } from 'react';
import { PhotoImage } from '@/components/media/PhotoImage';
import { useScrollLock } from '@/components/narrative/SmoothScroll';
import type { Photo } from '@/lib/manifest/types';
export function WeddingLightbox({ photos, title, children }: { photos: Photo[]; title: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useScrollLock(open);
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const move = (direction: number) => setIndex(i => (i + direction + photos.length) % photos.length);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); setIndex(i => (i + 1) % photos.length); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setIndex(i => (i - 1 + photos.length) % photos.length); }
      if (e.key === 'Home') { e.preventDefault(); setIndex(0); }
      if (e.key === 'End') { e.preventDefault(); setIndex(photos.length - 1); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, photos.length]);
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger className="text-link discovery-link">{children || <>Mais deste momento <span aria-hidden="true">↗</span></>}</Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="dialog-overlay" data-lenis-prevent /><Dialog.Content className="lightbox" aria-describedby="lightbox-help" data-lenis-prevent>
      <header className="lightbox-header"><Dialog.Title>{title}</Dialog.Title><Dialog.Close className="icon-button" aria-label="Fechar fotografias">×</Dialog.Close></header>
      <Dialog.Description id="lightbox-help" className="sr-only">Deslize para os lados ou use as setas para ver as fotografias. Escape fecha e retorna ao mesmo momento da história.</Dialog.Description>
      <div className="lightbox-stage" onTouchStart={e => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={e => { if (!touchStart.current) return; const dx = e.changedTouches[0].clientX - touchStart.current.x; const dy = e.changedTouches[0].clientY - touchStart.current.y; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1); touchStart.current = null; }}>
        <PhotoImage key={photos[index].id} photo={photos[index]} contain priority sizes="(min-width: 900px) 75vw, 100vw" />
      </div>
      <footer className="lightbox-footer"><button className="icon-button" aria-label="Foto anterior" onClick={() => move(-1)}>←</button><div aria-live="polite"><p>{photos[index].alt}</p></div><button className="icon-button" aria-label="Próxima foto" onClick={() => move(1)}>→</button></footer>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
