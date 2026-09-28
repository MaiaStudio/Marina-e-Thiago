'use client';

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { mediaUrl } from '@/lib/media';

export interface MusicPlayerHandle {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  isPlaying: boolean;
}

const AUDIO_SRC = mediaUrl('/media/' + encodeURIComponent('Armandinho - Starfix - Casinha [CyRhsFa_LbA].mp3'));

export interface MusicPlayerProps {
  visible?: boolean;
}

export const MusicPlayer = forwardRef<MusicPlayerHandle, MusicPlayerProps>(function MusicPlayer({ visible = true }, ref) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.play().then(() => {
      setPlaying(true);
    }).catch(() => {
      // Browser autoplay restriction
    });
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (playing) {
      pause();
    } else {
      play();
    }
  }, [playing, pause, play]);

  useImperativeHandle(ref, () => ({
    play,
    pause,
    toggle,
    isPlaying: playing,
  }), [play, pause, toggle, playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <>
      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        preload="auto"
        loop
        playsInline
      />
      <button
        type="button"
        className={`music-toggle-btn ${!visible ? 'music-btn-hidden' : ''}`}
        data-magnetic
        onClick={toggle}
        aria-label={playing ? 'Desativar som' : 'Ativar som'}
        title={playing ? 'Desativar som' : 'Ativar som'}
        tabIndex={visible ? 0 : -1}
        aria-hidden={!visible}
      >
        <div className="wave-container" aria-hidden="true">
          {playing ? (
            <svg className="wave-svg active" viewBox="0 0 48 16" width="28" height="16">
              <path
                className="wave-line wave-primary"
                d="M -16 8 C -12 2, -8 2, -4 8 C 0 14, 4 14, 8 8 C 12 2, 16 2, 20 8 C 24 14, 28 14, 32 8 C 36 2, 40 2, 44 8 C 48 14, 52 14, 56 8"
              />
              <path
                className="wave-line wave-secondary"
                d="M -16 8 C -12 14, -8 14, -4 8 C 0 2, 4 2, 8 8 C 12 14, 16 14, 20 8 C 24 2, 28 2, 32 8 C 36 14, 40 14, 44 8 C 48 2, 52 2, 56 8"
              />
            </svg>
          ) : (
            <svg className="wave-svg paused" viewBox="0 0 28 16" width="28" height="16">
              <line x1="4" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <span className="music-tooltip" aria-hidden="true">
          {playing ? 'desativar som' : 'ativar som'}
        </span>
      </button>
    </>
  );
});
