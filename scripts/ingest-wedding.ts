import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { editorial } from './editorial';
import { generateVariants } from './generate-image-variants';
import { inspect } from './generate-contact-sheet';
import type { Photo, WeddingManifest } from '../src/lib/manifest/types';
const source = path.resolve(process.env.PHOTO_SOURCE_DIR || 'Marina e Thiago');
const upload = process.argv.includes('--upload');
async function main() {
  if (upload && ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_BUCKET', 'R2_ORIGINALS_BUCKET', 'NEXT_PUBLIC_MEDIA_URL'].some(k => !process.env[k])) throw new Error('Missing R2 configuration; see .env.example.');
  if (upload && process.env.R2_PUBLIC_BUCKET === process.env.R2_ORIGINALS_BUCKET) throw new Error('Originals require a separate private bucket.');
  if (!process.argv.includes('--skip-inspect')) await inspect(source);
  const client = upload ? new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } }) : null;
  const assets: Photo[] = [];
  for (const [file, edit] of Object.entries(editorial)) {
    const input = path.join(source, file);
    const id = file.replace(/\.jpg$/i, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    const m = await sharp(input).metadata();
    const variants = await generateVariants(input, id, !!edit.order, 'public/media');
    const placeholder = `data:image/webp;base64,${(await sharp(input).rotate().resize(16).webp({ quality: 30 }).toBuffer()).toString('base64')}`;
    if (client) {
      await client.send(new PutObjectCommand({ Bucket: process.env.R2_ORIGINALS_BUCKET!, Key: `marina-thiago/originals/${file}`, Body: await readFile(input), ContentType: 'image/jpeg' }));
      for (const variant of variants) await client.send(new PutObjectCommand({ Bucket: process.env.R2_PUBLIC_BUCKET!, Key: `marina-thiago/${path.basename(variant.src)}`, Body: await readFile(`public${variant.src}`), ContentType: `image/${variant.format}`, CacheControl: 'public, max-age=31536000, immutable' }));
    }
    assets.push({ id, src: variants.find(v => v.format === 'webp' && v.width === 1080)!.src, width: m.width!, height: m.height!, aspectRatio: m.width! / m.height!, chapter: edit.chapter, role: edit.role || (edit.order ? 'narrative' : 'discovery'), narrativeOrder: edit.order ?? null, discoveryOrder: assets.filter(a => a.chapter === edit.chapter).length + 1, focalPoint: { x: edit.focal?.[0] ?? 50, y: edit.focal?.[1] ?? 50 }, placeholder, variants, alt: edit.alt, orientation: m.width! > m.height! ? 'landscape' : 'portrait', cropTolerance: edit.role === 'detail' ? 'low' : 'moderate', featured: !!edit.order });
    console.log(`${assets.length}/77 ${id}`);
  }
  for (const [name, file, width] of [['invitation-mobile', 'Convite mobile.jpg', 768], ['invitation-desktop', 'Convite desktop.png', 1440]] as const) {
    const avif = await sharp(path.join(source, file)).resize({ width }).avif({ quality: 55, effort: 5 }).toBuffer();
    await writeFile(`public/media/${name}.avif`, avif);
    if (client) await client.send(new PutObjectCommand({ Bucket: process.env.R2_PUBLIC_BUCKET!, Key: `marina-thiago/${name}.avif`, Body: avif, ContentType: 'image/avif', CacheControl: 'public, max-age=31536000, immutable' }));
    const body = await sharp(path.join(source, file)).resize({ width }).webp({ quality: 84 }).toBuffer();
    await writeFile(`public/media/${name}.webp`, body);
    if (client) await client.send(new PutObjectCommand({ Bucket: process.env.R2_PUBLIC_BUCKET!, Key: `marina-thiago/${name}.webp`, Body: body, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }));
  }
  const manifest: WeddingManifest = { wedding: { id: 'd92db886-8fab-4561-90f3-d7e448cc0425', slug: 'marina-thiago-040425', names: 'Marina & Thiago', date: '2025-04-04', location: 'Praia do Cumbuco — Ceará, Brasil' }, invitation: { mobile: '/media/invitation-mobile.webp', desktop: '/media/invitation-desktop.webp', mobileAvif: '/media/invitation-mobile.avif', desktopAvif: '/media/invitation-desktop.avif', mobileWidth: 1199, mobileHeight: 1920 }, assets };
  await mkdir('src/content/weddings/marina-thiago', { recursive: true });
  await writeFile('src/content/weddings/marina-thiago/manifest.json', JSON.stringify(manifest, null, 2));
  console.log(`Ready: ${assets.length} photos, ${assets.filter(a => a.featured).length} narrative. ${upload ? 'Uploaded to R2.' : 'Local optimized media. R2 upload requires --upload.'}`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });

