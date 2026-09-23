'use client';
import { m, useReducedMotion } from 'motion/react';
import { mediaUrl } from '@/lib/media';
import { manifest } from '@/lib/manifest';

interface InvitationPrologueProps {
  stage: 'locked' | 'transitioning' | 'opened';
  onOpen: () => void;
}

export function InvitationPrologue({ stage, onOpen }: InvitationPrologueProps) {
  const reduced = useReducedMotion();
  const isTransitioning = stage === 'transitioning';
  const transitionDuration = reduced ? 0.2 : 1.0;
  const transitionEase = [0.16, 1, 0.3, 1] as const;

  return (
    <m.section
      className="prologue prehero-layer"
      aria-label="O convite de Marina e Thiago"
      initial={false}
      animate={isTransitioning ? { x: '-100%' } : { x: '0%' }}
      transition={{ duration: transitionDuration, ease: transitionEase }}
    >
      <m.header
        className="prologue-top"
        animate={isTransitioning && !reduced ? { x: -70, opacity: 0 } : { x: 0, opacity: 1 }}
        transition={{ duration: transitionDuration, ease: transitionEase }}
      >
        <span>UM DIA PARA REVIVER</span>
        <span>CUMBUCO, CEARÁ</span>
      </m.header>

      <div className="invitation-wrap">
        <m.span
          className="invitation-side"
          animate={isTransitioning && !reduced ? { y: -20, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={{ duration: transitionDuration, ease: transitionEase }}
        >
          04° / 04° / 2025
        </m.span>

        <m.div
          className="invitation-art"
          animate={
            isTransitioning && !reduced
              ? { x: 110, opacity: 0.15 }
              : { x: 0, opacity: 1 }
          }
          transition={{ duration: transitionDuration, ease: transitionEase }}
        >
          <picture>
            <source media="(min-width: 768px)" type="image/avif" srcSet={mediaUrl(manifest.invitation.desktopAvif)} />
            <source media="(min-width: 768px)" type="image/webp" srcSet={mediaUrl(manifest.invitation.desktop)} />
            <source type="image/avif" srcSet={mediaUrl(manifest.invitation.mobileAvif)} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl(manifest.invitation.mobile)}
              alt="Convite original do casamento de Marina e Thiago, com fotografia do casal diante das montanhas ao pôr do sol."
              width={1199}
              height={1920}
              fetchPriority="high"
              loading="eager"
            />
          </picture>
        </m.div>

        <m.span
          className="invitation-side right"
          animate={isTransitioning && !reduced ? { y: -20, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={{ duration: transitionDuration, ease: transitionEase }}
        >
          MARINA & THIAGO
        </m.span>
      </div>

      <m.footer
        className="prologue-bottom"
        animate={isTransitioning && !reduced ? { x: -50, opacity: 0 } : { x: 0, opacity: 1 }}
        transition={{ duration: transitionDuration, ease: transitionEase }}
      >
        <div className="invitation-date">
          <span>04 de abril de 2025</span>
          <span>Praia do Cumbuco</span>
        </div>
        <button
          className="open-invitation"
          data-magnetic
          onClick={onOpen}
          disabled={stage !== 'locked'}
          aria-label="Abrir convite e começar a história"
        >
          <span>Abrir convite</span>
          <span className="arrow-circle" aria-hidden="true">↗</span>
        </button>
      </m.footer>
      <h1 className="sr-only">Marina & Thiago — 04 de abril de 2025</h1>
    </m.section>
  );
}


