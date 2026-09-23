import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Variant } from '../src/lib/manifest/types';
export async function generateVariants(input: string, id: string, featured: boolean, output: string): Promise<Variant[]> {
  await mkdir(output, { recursive: true });
  const meta = await sharp(input).rotate().metadata();
  const widths = featured ? [480, 768, 1080, 1440] : [480, 1080];
  const result: Variant[] = [];
  for (const width of widths.filter(w => w <= (meta.width ?? 6000))) {
    for (const format of ['webp', 'avif'] as const) {
      const name = `${id}-${width}.${format}`;
      const file = path.join(output, name);
      let info;
      try {
        const existing = await stat(file);
        const dimensions = await sharp(file).metadata();
        info = { width: dimensions.width!, height: dimensions.height!, size: existing.size };
      } catch {
        info = await sharp(input).rotate().resize({ width, withoutEnlargement: true })[format]({ quality: format === 'avif' ? 48 : 77, effort: format === 'avif' ? 3 : 4 }).toFile(file);
      }
      result.push({ src: `/media/${name}`, width: info.width, height: info.height, format, bytes: info.size });
    }
  }
  return result;
}
