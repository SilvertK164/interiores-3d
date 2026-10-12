// Copia las capturas y plantillas reales del repo a video/assets/ (carpeta ignorada por git).
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const repo = join(aqui, '..', '..');
const destino = join(aqui, '..', 'assets');
const origenes = [
  ['docs/design/implementado', 'capturas'],
  ['apps/web/public/templates', 'plantillas'],
];
for (const [o, d] of origenes) {
  const desde = join(repo, o);
  if (!existsSync(desde)) throw new Error(`Falta ${o}: corre el video desde dentro del repo de Madori.`);
  mkdirSync(join(destino, d), { recursive: true });
  cpSync(desde, join(destino, d), { recursive: true, filter: (f) => !f.endsWith('.json') });
}
console.log('assets copiados en video/assets/');

// Cada video es un proyecto de HyperFrames (carpeta con index.html): se le copian fuentes, GSAP e imágenes.
for (const v of ['teaser', 'explicativo']) {
  const dir = join(aqui, '..', v);
  mkdirSync(dir, { recursive: true });
  for (const c of ['fonts', 'vendor', 'assets']) cpSync(join(aqui, '..', c), join(dir, c), { recursive: true });
}
console.log('fuentes, GSAP e imágenes copiados en teaser/ y explicativo/');
