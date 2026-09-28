'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export function PhotographerFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const footerEl = footerRef.current;
    if (!footerEl) return;

    const updateHeight = () => {
      if (footerEl) {
        const height = footerEl.offsetHeight;
        if (height > 0) {
          document.documentElement.style.setProperty('--footer-height', `${height}px`);
        }
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(footerEl);
    window.addEventListener('resize', updateHeight);

    // Only enable pointer events and full opacity when scrolling near the footer
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '600px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(footerEl);

    return () => {
      resizeObserver.disconnect();
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  return (
    <footer
      id="fotografo"
      ref={footerRef}
      className={`photographer-footer ${isVisible ? 'footer-visible' : 'footer-hidden'}`}
      aria-label="Informações do fotógrafo"
    >
      <div className="photographer-footer-canvas">
        {/* Left Side: Floating Line Art Illustrations */}
        <div className="footer-illustration footer-illus-maos" aria-hidden="true">
          <Image
            src="/fotografo/maos.png"
            alt=""
            width={120}
            height={120}
            className="footer-illus-img"
          />
        </div>
        <div className="footer-illustration footer-illus-passaros" aria-hidden="true">
          <Image
            src="/fotografo/passaros-branco.png"
            alt=""
            width={75}
            height={75}
            className="footer-illus-img"
          />
        </div>
        <div className="footer-illustration footer-illus-sol" aria-hidden="true">
          <Image
            src="/fotografo/sol-branco.png"
            alt=""
            width={100}
            height={100}
            className="footer-illus-img"
          />
        </div>

        {/* Center: Brand Logo, Social & WhatsApp Contacts, Camera Art */}
        <div className="footer-center-content">
          <div className="footer-brand-logo">
            <Image
              src="/fotografo/logo-branca.png"
              alt="Ian Rafael Fotografia"
              width={260}
              height={140}
              className="footer-logo-img"
              priority
            />
          </div>

          <div className="footer-contacts">
            <a
              href="https://www.instagram.com/ianrafaelfotos/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-contact-item"
              data-magnetic
              aria-label="Instagram de Ian Rafael @ianrafaelfotos"
            >
              <span className="footer-contact-icon instagram-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none">
                  <defs>
                    <radialGradient id="ig-grad-footer" cx="20%" cy="110%" r="130%">
                      <stop offset="0%" stopColor="#fdf497" />
                      <stop offset="5%" stopColor="#fdf497" />
                      <stop offset="45%" stopColor="#fd5949" />
                      <stop offset="60%" stopColor="#d6249f" />
                      <stop offset="90%" stopColor="#285AEB" />
                    </radialGradient>
                  </defs>
                  <rect width="24" height="24" rx="6.5" fill="url(#ig-grad-footer)" />
                  <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="4.5" stroke="#ffffff" strokeWidth="1.8" />
                  <circle cx="12" cy="12" r="4.2" stroke="#ffffff" strokeWidth="1.8" />
                  <circle cx="16.7" cy="7.3" r="1.1" fill="#ffffff" />
                </svg>
              </span>
              <span className="footer-contact-text">@ianrafaelfotos</span>
            </a>

            <a
              href="https://wa.me/5585992175292"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-contact-item"
              data-magnetic
              aria-label="WhatsApp de Ian Rafael (85) 9 9217-5292"
            >
              <span className="footer-contact-icon whatsapp-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none">
                  <circle cx="12" cy="12" r="12" fill="#25D366" />
                  <path
                    d="M17.5 14.4c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.22-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.65-.93-2.25-.25-.6-.5-.5-.68-.52h-.58c-.2 0-.53.08-.8.38-.28.3-1.08 1.05-1.08 2.58s1.1 3 1.25 3.2c.15.2 2.18 3.32 5.28 4.65.74.32 1.31.5 1.76.65.74.23 1.42.2 1.95.12.6-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35z"
                    fill="#ffffff"
                  />
                </svg>
              </span>
              <span className="footer-contact-text">(85) 9 9217-5292</span>
            </a>
          </div>

          <div className="footer-camera-illustration" aria-hidden="true">
            <Image
              src="/fotografo/camera-branca.png"
              alt=""
              width={100}
              height={100}
              className="footer-camera-img"
            />
          </div>
        </div>

        {/* Right Side: Landscape Line Art & Photographer Portrait */}
        <div className="footer-illustration footer-illus-paisagem" aria-hidden="true">
          <Image
            src="/fotografo/PAISAGEM.png"
            alt=""
            width={140}
            height={140}
            className="footer-illus-img"
          />
        </div>

        <div className="footer-photographer-portrait">
          <Image
            src="/fotografo/ian-rafael.png"
            alt="Fotógrafo Ian Rafael com câmera"
            width={580}
            height={700}
            className="footer-portrait-img"
            priority
          />
        </div>
      </div>

      {/* Sub-bar: Navigation back to top and credits */}
      <div className="photographer-footer-credits">
        <a href="#preparacao" data-magnetic className="footer-back-link" aria-label="Reviver a história desde o início">
          Reviver a história <span aria-hidden="true">↑</span>
        </a>
        <span className="footer-credits-names">MARINA & THIAGO · 2025</span>
        <span className="footer-credits-note">FOTOGRAFIA · IAN RAFAEL</span>
      </div>
    </footer>
  );
}
