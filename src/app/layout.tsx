import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { SmoothScroll } from '@/components/narrative/SmoothScroll';
import 'lenis/dist/lenis.css';
import './globals.css';
const display = localFont({ src: [
  { path: '../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2', style: 'normal', weight: '200 800' },
  { path: '../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2', style: 'italic', weight: '200 800' },
], variable: '--font-editorial', display: 'swap', preload: false });
const sans = localFont({ src: '../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2', variable: '--font-interface', weight: '200 800', display: 'swap', preload: true });
const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: 'Marina & Thiago · 04.04.2025',
  description: 'Um dia para reviver. O casamento de Marina e Thiago, na Praia do Cumbuco, Ceará. 04 de abril de 2025.',
  robots: { index: false, follow: false, noarchive: true },
  openGraph: { title: 'Marina & Thiago · 04.04.2025', description: 'Um dia para reviver. Cumbuco, Ceará.', locale: 'pt_BR', type: 'website', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
};
export const viewport: Viewport = { themeColor: '#f3f0e8', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={`${display.variable} ${sans.variable}`}><body><SmoothScroll><a className="skip-link" href="#preparacao">Ir para a história</a>{children}</SmoothScroll></body></html>;
}

