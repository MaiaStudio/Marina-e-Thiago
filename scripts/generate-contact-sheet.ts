import sharp from 'sharp';
import exifr from 'exifr';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
export async function inspect(source = path.resolve('Marina e Thiago')) {
  await mkdir('reports', { recursive: true });
  const metadata: object[] = [];
  for (const dir of (await readdir(source, { withFileTypes: true })).filter(d => d.isDirectory())) {
    const files = (await readdir(path.join(source, dir.name))).filter(f => /\.(jpe?g|png)$/i.test(f)).sort();
    const cells = [];
    for (const [i, file] of files.entries()) {
      const input = path.join(source, dir.name, file);
      const m = await sharp(input).metadata();
      const exif = await exifr.parse(input, ['DateTimeOriginal', 'Model', 'Flash']).catch(() => null);
      metadata.push({ file: `${dir.name}/${file}`, width: m.width, height: m.height, aspectRatio: m.width! / m.height!, orientation: m.width! > m.height! ? 'landscape' : 'portrait', exif });
      const thumb = await sharp(input).rotate().resize(280, 210, { fit: 'inside' }).toBuffer();
      const tm = await sharp(thumb).metadata();
      const left = (i % 4) * 300;
      const top = Math.floor(i / 4) * 250 + 50;
      cells.push({ input: thumb, left: left + Math.floor((300 - tm.width!) / 2), top });
      cells.push({ input: Buffer.from(`<svg width="300" height="30"><text x="10" y="20" font-size="15" font-family="Arial" fill="#232820">${file}</text></svg>`), left, top: top + 212 });
    }
    await sharp({ create: { width: 1200, height: Math.ceil(files.length / 4) * 250 + 50, channels: 3, background: '#f4f0e7' } }).composite(cells).jpeg({ quality: 88 }).toFile(`reports/contact-${dir.name}.jpg`);
  }
  await writeFile('reports/metadata.json', JSON.stringify(metadata, null, 2));
  console.log(`Contact sheets and metadata: ${metadata.length} photographs.`);
}
if (process.argv[1]?.includes('generate-contact-sheet')) inspect().catch(e => { console.error(e); process.exitCode = 1; });
