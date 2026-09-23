'use client';
import { useEffect, useRef, useState } from 'react';
import { m, useReducedMotion, useScroll, useTransform, cubicBezier, transform, type MotionValue } from 'motion/react';
import { chapterPhotos, narrative } from '@/lib/manifest';
import { CHAPTERS, type ChapterId, type Photo } from '@/lib/manifest/types';
import { ChapterLoader, PhotoImage } from '@/components/media/PhotoImage';
import { WeddingLightbox } from '@/components/galleries/WeddingLightbox';
import { encontroPhotos } from '@/lib/narrative/encontro-photos';
const gentle = { ease: cubicBezier(.4, 0, .2, 1) };
const portalEase = { ease: cubicBezier(.45, 0, .55, 1) };
// Function transforms keep scene-relative offsets consistent across browsers and reverse scroll.
function useRange<T extends string | number>(value: MotionValue<number>, input: number[], output: T[], options = gentle) { return useTransform(value, latest => transform(latest, input, output, options)); }
function ChapterTitle({ id, children }: { id: ChapterId; children?: React.ReactNode }) {
  const chapter = CHAPTERS.find(c => c.id === id)!;
  return <div className="chapter-title"><h2>{children || chapter.title}</h2></div>;
}
function Discover({ id, extraPhotos = [] }: { id: ChapterId; extraPhotos?: Photo[] }) {
  return <div className="chapter-discovery"><WeddingLightbox title={CHAPTERS.find(c => c.id === id)!.subtitle} photos={[...chapterPhotos(id), ...extraPhotos]} /></div>;
}
function DriftingPhoto({
  photo,
  className = '',
  amount = 32,
  priority = false,
  entranceX = 0,
  isTransitioning = false,
}: {
  photo: Photo;
  className?: string;
  amount?: number;
  priority?: boolean;
  entranceX?: number;
  isTransitioning?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useRange(scrollYProgress, [0, .5, 1], [amount, 0, -amount], gentle);

  return (
    <m.div ref={ref} className={className} style={{ y: reduced ? 0 : y }}>
      <m.div
        animate={isTransitioning && !reduced && entranceX ? { x: [entranceX, 0], opacity: [0.35, 1] } : { x: 0, opacity: 1 }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', height: '100%' }}
      >
        <PhotoImage photo={photo} priority={priority} />
      </m.div>
    </m.div>
  );
}

export function EditorialSpread({ stage = 'opened' }: { stage?: 'locked' | 'transitioning' | 'opened' }) {
  const photos = narrative('preparacao');
  const reduced = useReducedMotion();
  const isTransitioning = stage === 'transitioning';
  const transitionDuration = reduced ? 0.2 : 1.0;
  const transitionEase = [0.16, 1, 0.3, 1] as const;

  return (
    <m.section
      id="preparacao"
      tabIndex={-1}
      className="preparation chapter section-shell"
      aria-label="Capítulo 1: A preparação"
      initial={false}
      animate={
        stage === 'locked'
          ? { x: '100%' }
          : isTransitioning
          ? { x: '0%' }
          : { x: '0%' }
      }
      transition={{ duration: transitionDuration, ease: transitionEase }}
    >
      <m.div
        className="chapter-title"
        animate={isTransitioning && !reduced ? { x: [70, 0], opacity: [0.3, 1] } : { x: 0, opacity: 1 }}
        transition={{ duration: transitionDuration, ease: transitionEase }}
      >
        <h2>Antes<br />de <em>tudo.</em></h2>
      </m.div>
      <div className="preparation-spread">
        <DriftingPhoto
          photo={photos[0]}
          className="prep-first"
          amount={22}
          priority
          entranceX={110}
          isTransitioning={isTransitioning}
        />
        <m.span
          className="editorial-note prep-note"
          animate={isTransitioning && !reduced ? { x: [50, 0], opacity: [0.2, 1] } : { x: 0, opacity: 1 }}
          transition={{ duration: transitionDuration, ease: transitionEase }}
        >
          MARINA & THIAGO<br />04.04.2025
        </m.span>
        <DriftingPhoto
          photo={photos[1]}
          className="prep-second"
          amount={48}
          priority
          entranceX={160}
          isTransitioning={isTransitioning}
        />
        <m.div
          className="prep-caption"
          animate={isTransitioning && !reduced ? { x: [60, 0], opacity: [0.2, 1] } : { x: 0, opacity: 1 }}
          transition={{ duration: transitionDuration, ease: transitionEase }}
        >
          <span className="caption-rule" />A preparação.<br />Os detalhes.<br />A espera.
        </m.div>
        <DriftingPhoto photo={photos[2]} className="prep-detail" amount={20} />
        <DriftingPhoto photo={photos[3]} className="prep-last" amount={32} />
        <div className="prep-last-caption">
          Orando em Gratidão,<br />sem se ver ainda hehehe
        </div>
      </div>
      <Discover id="preparacao" />
    </m.section>
  );
}
function NarrativeRail({ photos }: { photos: Photo[] }) {
  const section = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const x = useRange(scrollYProgress, [0, .5, 1], [0, -distance * .5, -distance], gentle);
  useEffect(() => {
    const observer = new ResizeObserver(() => { if (track.current && viewport.current) setDistance(Math.max(0, track.current.scrollWidth - viewport.current.clientWidth)); });
    if (track.current) observer.observe(track.current);
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={section} className="rail-scene"><div className="rail-sticky"><div ref={viewport} className="rail-viewport" tabIndex={reduced ? 0 : undefined} aria-label="Fotografias da chegada"><m.div ref={track} className="rail-track" style={{ x: reduced ? 0 : x }}>{photos.map((photo, i) => <figure key={photo.id} className={`rail-frame rail-frame-${i}`}><PhotoImage photo={photo} sizes="(min-width: 900px) 40vw, 78vw" /></figure>)}</m.div></div></div></div>;
}
export function TheBeginning() {
  const photos = narrative('comeco');
  return <ChapterLoader><section id="comeco" className="beginning chapter" aria-label="Capítulo 2: A chegada"><div className="section-shell"><ChapterTitle id="comeco">Todos os<br /><em>caminhos.</em></ChapterTitle><div className="beginning-environment"><PhotoImage photo={photos[0]} /><p className="editorial-note">PRAIA DO CUMBUCO<br />04 DE ABRIL, 2025</p></div></div><NarrativeRail photos={photos.slice(1, 4)} /><Discover id="comeco" /></section></ChapterLoader>;
}
function EncounterPhoto({ photo, index, progress, reduced }: { photo: Photo; index: number; progress: MotionValue<number>; reduced: boolean | null }) {
  const x = useRange(progress, [index - 1, index + 1], ['-4%', '4%'], portalEase);
  return <figure className="encounter-panel encounter-photo"><m.div className="encounter-parallax" style={{ x: reduced ? 0 : x }}><PhotoImage photo={photo} sizes="100vw" /></m.div></figure>;
}
export function PortalMaskTransition() {
  const ref = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState({ height: 0, distance: 0 });
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const basePhotos = narrative('olhares');
  const photos = [...basePhotos, ...encontroPhotos];

  useEffect(() => {
    const measure = () => {
      if (!viewport.current || !track.current) return;
      const lastPanel = track.current.lastElementChild;
      if (!(lastPanel instanceof HTMLElement)) return;
      const height = viewport.current.clientHeight;
      // Measure the last photo's layout edge, independently of the animated transforms.
      const distance = Math.max(0, lastPanel.offsetLeft + lastPanel.offsetWidth - viewport.current.clientWidth);
      setGeometry(previous => previous.height === height && previous.distance === distance ? previous : { height, distance });
    };
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    if (track.current) {
      observer.observe(track.current);
      // Photo widths can change while the viewport and track stay the same size.
      for (const panel of track.current.children) observer.observe(panel);
    }
    measure();
    return () => observer.disconnect();
  }, []);

  // Preserve the 220svh reveal, then release the sticky scene at the last photo.
  const horizontalTravel = Math.max(geometry.distance, geometry.height * 2);
  const scrollDistance = geometry.height * 2.2 + horizontalTravel;
  const revealEnd = scrollDistance ? geometry.height * 2.2 / scrollDistance : .5;
  const revealProgress = useTransform(scrollYProgress, value => Math.min(1, value / revealEnd));
  const travelProgress = useRange(scrollYProgress, [revealEnd, 1], [0, photos.length - 1], portalEase);
  const trackX = useTransform(travelProgress, value => -geometry.distance * value / (photos.length - 1));
  // One continuous expansion avoids restarting the acceleration halfway through.
  // Leave time to see the background first and the completed reveal before the title.
  const clipPath = useRange(revealProgress, [.08, .8], ['inset(44% 43% 44% 43%)', 'inset(0% 0% 0% 0%)'], portalEase);
  const opacity = useRange(revealProgress, [.08, .32], [0, 1], portalEase);
  const titleOpacity = useRange(revealProgress, [.82, .96], [0, 1]);
  const scale = useRange(revealProgress, [.08, .8], [1.04, 1], portalEase);
  return <ChapterLoader><section id="olhares" className="recognition chapter" aria-label="Capítulo 3: A troca de olhares">
    <div ref={ref} className="portal-scene" style={{ height: !reduced && geometry.height ? geometry.height + scrollDistance : undefined }}>
      <div ref={viewport} className="portal-sticky">
        <m.div ref={track} className="encounter-track" style={{ x: reduced ? 0 : trackX }}>
          <div className="encounter-panel encounter-opening">
            <div className="portal-background"><PhotoImage photo={narrative('comeco')[4]} sizes="100vw" /></div>
            <m.div className="portal-foreground" style={{ clipPath: reduced ? 'none' : clipPath, opacity: reduced ? 1 : opacity }}><m.div className="portal-inner" style={{ scale: reduced ? 1 : scale }}><PhotoImage photo={photos[0]} sizes="100vw" /></m.div></m.div>
            <m.div className="portal-title" style={{ opacity: reduced ? 1 : titleOpacity }}><h2>O <em>encontro.</em></h2></m.div>
          </div>
          {photos.slice(1).map((photo, index) => <EncounterPhoto key={photo.id} photo={photo} index={index + 1} progress={travelProgress} reduced={reduced} />)}
        </m.div>
      </div>
    </div><Discover id="olhares" extraPhotos={encontroPhotos} />
  </section></ChapterLoader>;
}
function ImageHandoff({ photo, next }: { photo: Photo; next: Photo }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const scale = useRange(scrollYProgress, [0, .5, 1], [1, .9, .8], gentle);
  const x = useRange(scrollYProgress, [0, .5, 1], ['0%', '-5%', '-10%'], gentle);
  const before = useRange(scrollYProgress, [0, .4], [1, 0]);
  const after = useRange(scrollYProgress, [.35, .85], [0, 1]);
  const y = useRange(scrollYProgress, [0, .5, 1], [90, 45, 0], gentle);
  return <div ref={ref} className="handoff-scene"><div className="handoff-sticky"><m.p className="handoff-before" style={{ opacity: reduced ? 1 : before }}>Os pequenos<br /><em>gestos.</em></m.p><m.div className="handoff-anchor" style={{ scale: reduced ? 1 : scale, x: reduced ? 0 : x }}><PhotoImage photo={photo} /></m.div><m.div className="handoff-arrival" style={{ opacity: reduced ? 1 : after, y: reduced ? 0 : y }}><PhotoImage photo={next} /><span className="editorial-note">A PRESENÇA.</span></m.div></div></div>;
}
export function RitualSequence() {
  const photos = narrative('cerimonia');
  return <ChapterLoader><section id="cerimonia" className="ceremony chapter" aria-label="Capítulo 4: A cerimônia"><div className="section-shell"><ChapterTitle id="cerimonia">Aqui,<br /><em>juntos.</em></ChapterTitle></div><div className="ceremony-wide"><PhotoImage photo={photos[0]} sizes="100vw" /><span className="wide-caption">O MAR. AS LUZES. A PRESENÇA.</span></div><div className="ritual-pair"><DriftingPhoto photo={photos[1]} className="ritual-close" amount={25} /><div className="ritual-context"><span className="editorial-note">04 / A CERIMÔNIA</span><DriftingPhoto photo={photos[2]} amount={45} /></div></div><ImageHandoff photo={photos[3]} next={photos[4]} /><div className="rings-spread"><span className="rings-heading">As <em>alianças.</em></span><DriftingPhoto photo={photos[5]} className="rings-detail" amount={16} /><div className="ring-stack"><DriftingPhoto photo={photos[6]} className="rings-context" amount={38} /><DriftingPhoto photo={photos[7]} className="rings-action" amount={14} /></div></div><Discover id="cerimonia" /></section></ChapterLoader>;
}
export function HeroExpansion() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const scale = useRange(scrollYProgress, [0, .3, .62, 1], [.8, .88, 1, 1], gentle);
  const textOpacity = useRange(scrollYProgress, [.45, .7], [0, 1]);
  return <ChapterLoader><section id="sim" className="the-yes chapter" aria-label="Capítulo 5: O sim"><div ref={ref} className="hero-scene"><div className="hero-sticky"><m.div className="hero-expanding-image" style={{ scale: reduced ? 1 : scale }}><PhotoImage photo={narrative('sim')[0]} sizes="100vw" /></m.div><m.div className="yes-title" style={{ opacity: reduced ? 1 : textOpacity }}><h2>Sim<span>.</span></h2></m.div></div></div><div className="yes-after"><DriftingPhoto photo={narrative('sim')[1]} className="yes-second" amount={12} /></div><Discover id="sim" /></section></ChapterLoader>;
}
function FinalDissolve({ photo, before }: { photo: Photo; before: Photo }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const beforeY = useRange(scrollYProgress, [0, .4, .8], ['0vh', '-25vh', '-55vh'], gentle);
  const beforeOpacity = useRange(scrollYProgress, [.1, .6], [1, 0]);
  const scale = useRange(scrollYProgress, [0, .5, 1], [.82, .92, 1], gentle);
  const titleOpacity = useRange(scrollYProgress, [.5, .9], [0, 1]);
  return <div id="memoria" ref={ref} className="final-scene chapter" aria-label="Capítulo 7: Nossos passos"><div className="final-sticky"><m.div className="final-photo" style={{ scale: reduced ? 1 : scale }}><PhotoImage photo={photo} sizes="(min-width: 900px) 50vw, 67svh" /></m.div><m.div className="dissolve-remnant" style={{ y: reduced ? 0 : beforeY, opacity: reduced ? 0 : beforeOpacity }}><PhotoImage photo={before} /></m.div><m.div className="final-type" style={{ opacity: reduced ? 1 : titleOpacity }}><h2>Daqui<br /><em>em diante.</em></h2></m.div></div></div>;
}
export function KineticPartyGallery() {
  const photos = narrative('festa');
  const strip = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ start: 0, scroll: 0 });
  return <ChapterLoader><section id="festa" className="party chapter" aria-label="Capítulo 6: A celebração"><div className="release-pair"><DriftingPhoto photo={photos[0]} className="release-first" amount={32} /><DriftingPhoto photo={photos[1]} className="release-second" amount={55} /></div><div className="party-title-wrap"><ChapterTitle id="festa">E a noite<br />é <em>nossa.</em></ChapterTitle></div><div className="party-intro"><div className="party-toast"><PhotoImage photo={photos[3]} sizes="(min-width: 900px) 80vw, 100vw" /></div></div><div className="party-duet"><DriftingPhoto photo={photos[4]} className="party-glasses" amount={22} /><DriftingPhoto photo={photos[5]} className="party-embrace" amount={44} /></div><div ref={strip} className={`friends-strip ${dragging ? 'is-dragging' : ''}`} tabIndex={0} role="region" aria-label="Fotografias com os convidados. Deslize para os lados." onPointerDown={e => { if (e.pointerType !== 'mouse' || !strip.current) return; drag.current = { start: e.clientX, scroll: strip.current.scrollLeft }; setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (dragging && strip.current) strip.current.scrollLeft = drag.current.scroll - (e.clientX - drag.current.start); }} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); strip.current?.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * 280, behavior: 'smooth' }); } }}>{photos.slice(6, 10).map(photo => <figure key={photo.id} className="friend-frame"><PhotoImage photo={photo} sizes="(min-width: 900px) 45vw, 85vw" /></figure>)}</div><div className="party-peak"><DriftingPhoto photo={photos[10]} className="peak-one" amount={24} /><DriftingPhoto photo={photos[11]} className="peak-two" amount={46} /></div><Discover id="festa" /><FinalDissolve before={photos[12]} photo={narrative('memoria')[0]} /><div className="epilogue"><p>Marina <em>&</em> Thiago</p><Discover id="memoria" /></div></section></ChapterLoader>;
}


