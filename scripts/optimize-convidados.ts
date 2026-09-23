import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

async function optimizeConvidados() {
  const srcDir = path.join(process.cwd(), 'public', 'convidados');
  const outDir = path.join(process.cwd(), 'public', 'convidados-web');

  await fs.mkdir(outDir, { recursive: true });

  const files = (await fs.readdir(srcDir)).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
  // Sort numerically/alphabetically
  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  console.log(`Encontradas ${files.length} fotos em ${srcDir}. Otimizando para ${outDir}...`);

  const list: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const srcPath = path.join(srcDir, file);
    const baseName = path.parse(file).name;
    const outName = `${baseName}.webp`;
    const outPath = path.join(outDir, outName);

    // Resize max dimension 1200px, quality 85 webp
    await sharp(srcPath)
      .rotate() // auto-orient based on EXIF
      .resize({
        width: 1200,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 84 })
      .toFile(outPath);

    list.push(`/convidados-web/${outName}`);
    process.stdout.write(`\rProcessado [${i + 1}/${files.length}]: ${outName}`);
  }

  console.log('\nOtimização concluída!');
  
  // Write a manifest json file for easy import in components
  const manifestPath = path.join(process.cwd(), 'src', 'data', 'convidados.json');
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(list, null, 2));
  console.log(`Manifesto salvo em ${manifestPath} (${list.length} itens).`);
}

optimizeConvidados().catch(err => {
  console.error('Erro ao otimizar fotos:', err);
  process.exit(1);
});
