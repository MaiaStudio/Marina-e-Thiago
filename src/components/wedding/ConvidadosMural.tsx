'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import * as Dialog from '@radix-ui/react-dialog';
import convidadosList from '@/data/convidados.json';

const MagazineFlip = dynamic(
  () => import('@/components/originkit/ui/magazine-flip'),
  {
    ssr: false,
    loading: () => (
      <div className="convidados-loading" aria-hidden="true">
        <span className="editorial-note">CARREGANDO ÁLBUM DE MEMÓRIAS…</span>
      </div>
    ),
  }
);

const magazineImages = convidadosList.map((src, index) => ({
  image: {
    src,
    alt: `Marina e Thiago com convidados - Foto ${index + 1}`,
  },
  offsetY: 0,
}));

export function ConvidadosMural() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    const updateSize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const section = document.getElementById('convidados');
    if (!section) return;

    let preloaded = false;
    const observer = new IntersectionObserver((entries) => {
      if (!preloaded && entries.some(e => e.isIntersecting)) {
        preloaded = true;
        convidadosList.slice(0, 8).forEach(src => {
          const img = new window.Image();
          img.src = src;
        });
        observer.disconnect();
      }
    }, { rootMargin: '1000px 0px 1000px 0px' });

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const prevPhoto = () => {
    setLightboxIndex(i => (i - 1 + convidadosList.length) % convidadosList.length);
  };

  const nextPhoto = () => {
    setLightboxIndex(i => (i + 1) % convidadosList.length);
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen]);

  return (
    <section id="convidados" className="convidados-section chapter" aria-label="Mural de fotos com os convidados">
      <div className="convidados-header">
        <span className="editorial-note">MEMÓRIAS COMPARTILHADAS · 53 REGISTROS</span>
        <h2 className="convidados-title">
          Gratidão por quem fez parte<br />deste dia <em>com a gente.</em>
        </h2>
        <p className="convidados-subtitle">
          Cada abraço, sorriso e brinde tornaram o nosso 04 de abril inesquecível.
          Navegue pelas fotografias em formato original e toque em qualquer uma para examiná-la ampliada.
        </p>
      </div>

      <div className="convidados-stage">
        <MagazineFlip
          images={magazineImages}
          background="transparent"
          pages={53}
          pageWidth={isMobile ? 360 : 640}
          pageHeight={isMobile ? 300 : 480}
          spacing={4.4}
          tilt={0}
          turn={0}
          scrollSens={4.5}
          view={{
            tap: true,
            zoom: 6.2,
            speed: 5.5,
          }}
          travel={{
            drift: 1.6,
            smoothing: 5.5,
            wave: 3.2,
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="convidados-footer">
        <div className="convidados-cue">
          <span>← Arraste para folhear o álbum →</span>
          <span aria-hidden="true">·</span>
          <span>Toque na foto para segurar e ampliar no álbum</span>
        </div>

        <div className="convidados-actions">
          <Dialog.Root open={lightboxOpen} onOpenChange={setLightboxOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="convidados-full-link"
                data-magnetic
                onClick={() => {
                  setLightboxIndex(0);
                  setLightboxOpen(true);
                }}
              >
                <span>Ver todas as 53 fotografias em tela cheia</span>
                <span aria-hidden="true">↗</span>
              </button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" data-lenis-prevent />
              <Dialog.Content className="lightbox" aria-describedby="convidados-lightbox-help" data-lenis-prevent>
                <header className="lightbox-header">
                  <Dialog.Title>Álbum de Convidados ({lightboxIndex + 1} de {convidadosList.length})</Dialog.Title>
                  <Dialog.Close className="icon-button" aria-label="Fechar fotografias">×</Dialog.Close>
                </header>

                <Dialog.Description id="convidados-lightbox-help" className="sr-only">
                  Navegue pelas fotografias usando as setas ou teclado.
                </Dialog.Description>

                <div className="lightbox-stage">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={convidadosList[lightboxIndex]}
                    src={convidadosList[lightboxIndex]}
                    alt={`Marina e Thiago com convidados - Registro ${lightboxIndex + 1}`}
                    style={{
                      maxHeight: '82vh',
                      maxWidth: '92vw',
                      objectFit: 'contain',
                      borderRadius: '4px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    }}
                  />
                </div>

                <footer className="lightbox-footer">
                  <button className="icon-button" aria-label="Foto anterior" onClick={prevPhoto}>
                    ←
                  </button>
                  <div aria-live="polite">
                    <p>Registro {lightboxIndex + 1} de {convidadosList.length} · Praia do Cumbuco</p>
                  </div>
                  <button className="icon-button" aria-label="Próxima foto" onClick={nextPhoto}>
                    →
                  </button>
                </footer>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </section>
  );
}
