'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { LazyMotion, domAnimation, m, useScroll, MotionConfig, useReducedMotion } from 'motion/react';
import dynamic from 'next/dynamic';
import { ChapterLoader } from '@/components/media/PhotoImage';
import { InvitationPrologue } from '@/components/entrance/InvitationPrologue';
import { MusicPlayer, type MusicPlayerHandle } from '@/components/media/MusicPlayer';
import { useScrollLock } from '@/components/narrative/SmoothScroll';
import { MagneticCursor } from '@/components/ui/magnetic-cursor';
import { ConvidadosMural } from '@/components/wedding/ConvidadosMural';
import { EditorialSpread, TheBeginning, PortalMaskTransition, RitualSequence, HeroExpansion, KineticPartyGallery } from './Chapters';

const GuestbookWall = dynamic(() => import('@/components/guestbook/GuestbookWall'), { ssr: false, loading: () => <div className="guestbook-loading" /> });

function Progress() {
  const { scrollYProgress } = useScroll();
  return <m.div className="story-progress" aria-hidden="true" style={{ scaleX: scrollYProgress, originX: 0 }} />;
}

export function WeddingExperience() {
  const [stage, setStage] = useState<'locked' | 'transitioning' | 'opened'>('locked');
  const reduced = useReducedMotion();
  const musicRef = useRef<MusicPlayerHandle>(null);

  useScrollLock(stage !== 'opened');

  useEffect(() => {
    if (stage !== 'opened') {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      window.scrollTo(0, 0);
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [stage]);

  const handleOpen = useCallback(() => {
    if (stage !== 'locked') return;
    setStage('transitioning');
    musicRef.current?.play();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('reset-cursor'));
    }

    const duration = reduced ? 200 : 1020;
    window.setTimeout(() => {
      setStage('opened');
      const hero = document.getElementById('preparacao');
      hero?.focus({ preventScroll: true });
    }, duration);
  }, [stage, reduced]);

  return (
    <MagneticCursor
      magneticFactor={0.5}
      blendMode="exclusion"
      cursorSize={32}
    >
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user" transition={{ duration: .55, ease: [.4, 0, .2, 1] }}>
          <Progress />
          <main>
            {stage !== 'opened' && (
              <InvitationPrologue stage={stage} onOpen={handleOpen} />
            )}
            <ChapterLoader margin="-1px">
              <EditorialSpread stage={stage} />
            </ChapterLoader>
            <TheBeginning />
            <PortalMaskTransition />
            <RitualSequence />
            <HeroExpansion />
            <KineticPartyGallery />
            <ConvidadosMural />
            <GuestbookWall />
          </main>
          <MusicPlayer ref={musicRef} visible={stage === 'opened'} />
          <footer className="site-footer">
            <a href="#preparacao" data-magnetic aria-label="Reviver a história desde o início">
              Reviver a história <span aria-hidden="true">↑</span>
            </a>
            <span>MARINA & THIAGO · 2025</span>
            <span>HORIZONTE EM MOVIMENTO</span>
          </footer>
        </MotionConfig>
      </LazyMotion>
    </MagneticCursor>
  );
}

