import raw from '@/content/weddings/marina-thiago/manifest.json';
import type { WeddingManifest } from './types';
export const manifest = raw as WeddingManifest;
export const weddingId = manifest.wedding.id;
export function narrative(chapter: string) { return manifest.assets.filter(p => p.chapter === chapter && p.narrativeOrder !== null).sort((a, b) => a.narrativeOrder! - b.narrativeOrder!); }
export function chapterPhotos(chapter: string) { return manifest.assets.filter(p => p.chapter === chapter).sort((a, b) => a.discoveryOrder - b.discoveryOrder); }
