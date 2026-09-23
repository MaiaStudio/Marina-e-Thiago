export const CHAPTERS = [
  { id: 'preparacao', number: '01', title: 'Antes de tudo', subtitle: 'A preparação' },
  { id: 'comeco', number: '02', title: 'Todos os caminhos', subtitle: 'A chegada' },
  { id: 'olhares', number: '03', title: 'O encontro', subtitle: 'A troca de olhares' },
  { id: 'cerimonia', number: '04', title: 'Aqui, juntos', subtitle: 'A cerimônia' },
  { id: 'sim', number: '05', title: 'Sim.', subtitle: 'Marina & Thiago' },
  { id: 'festa', number: '06', title: 'E a noite é nossa.', subtitle: 'A celebração' },
  { id: 'memoria', number: '07', title: 'Daqui em diante', subtitle: 'Nossos passos' },
] as const;
export type ChapterId = typeof CHAPTERS[number]['id'];
export type Variant = { src: string; width: number; height: number; format: 'avif' | 'webp'; bytes: number };
export type Photo = {
  id: string; src: string; width: number; height: number; aspectRatio: number;
  chapter: ChapterId; role: string; narrativeOrder: number | null; discoveryOrder: number;
  focalPoint: { x: number; y: number }; placeholder: string; variants: Variant[];
  alt: string; orientation: string; cropTolerance: string; featured: boolean;
};
export type WeddingManifest = {
  wedding: { id: string; slug: string; names: string; date: string; location: string };
  invitation: { mobile: string; desktop: string; mobileAvif: string; desktopAvif: string; mobileWidth: number; mobileHeight: number };
  assets: Photo[];
};

