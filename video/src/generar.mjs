// Genera las composiciones HTML de HyperFrames y el guion a partir de las escenas.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CSS } from './estilos.mjs';
import { CSS2 } from './estilos2.mjs';
import * as K from './escenas.mjs';
import * as K2 from './escenas2.mjs';
import { arq } from './arq.mjs';
import { teaser } from './teaser.mjs';
import { explicativo } from './explicativo.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 0.6; // solape de transición (s)
const render = { ...K, ...K2, arq };

const MOV = {
  fundido: { f: { opacity: 0 }, t: { opacity: 1 }, nombre: 'fundido (0,6 s)' },
  deslizar: { f: { opacity: 0, x: 220 }, t: { opacity: 1, x: 0 }, nombre: 'deslizar desde la derecha (0,6 s)' },
  zoom: { f: { opacity: 0, scale: 1.08 }, t: { opacity: 1, scale: 1 }, nombre: 'zoom suave con fundido (0,6 s)' },
};

const RUNTIME = `
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
const fmt = (v, sep) => { const r = Math.round(v); return sep ? r.toLocaleString('es-AR') : String(r); };
for (const x of SPEC) {
  const at = x.base + x.at;
  if (x.op === 'count') {
    const o = { v: 0 }; const el = document.querySelector(x.s);
    tl.to(o, { v: x.to, duration: x.d, ease: 'power2.out', onUpdate() { el.textContent = fmt(o.v, x.sep); } }, at);
    continue;
  }
  tl.fromTo(x.s, x.f, { ...x.t, duration: x.d, ease: x.e || 'power3.out', stagger: x.st || 0 }, at);
}
window.__timelines[ID] = tl;
tl.seek(0);
`;

function componer({ id, titulo, escenas }) {
  let base = 0;
  const spec = [];
  const secciones = [];
  const filas = [];
  escenas.forEach((sc, i) => {
    const n = i + 1;
    const scope = `#e${n}`;
    const r = render[sc.kind]({ ...sc }, n);
    const ultima = i === escenas.length - 1;
    const dur = sc.dur + (ultima ? 0 : T);
    secciones.push(
      `<section class="clip scene bg-${sc.bg || 'crema'}" id="e${n}" data-start="${base}" data-duration="${dur}" data-track-index="${i}">${r.html}</section>`,
    );
    const mov = i === 0 ? null : MOV[sc.trans || 'fundido'];
    if (mov) spec.push({ s: scope, f: mov.f, t: mov.t, at: 0, d: T, e: 'power2.out', base });
    for (const x of r.tw) {
      spec.push({ ...x, s: x.s.startsWith('#') ? x.s : `${scope} ${x.s}`, base });
    }
    const texto = [sc.kicker, sc.title?.replace(/\|/g, ' '), sc.sub].filter(Boolean).join(' · ');
    filas.push({ n, ini: base, dur: sc.dur, texto: sc.texto || texto, fuente: sc.fuente, trans: i === 0 ? 'inicio (sin transición)' : MOV[sc.trans || 'fundido'].nombre });
    base += sc.dur;
  });
  const total = base;
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>${titulo}</title>
<script src="vendor/gsap.min.js"></script>
<style>${CSS}${CSS2}</style>
</head>
<body>
<div id="root" data-composition-id="${id}" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
${secciones.join('\n')}
</div>
<script>
const ID = ${JSON.stringify(id)};
const SPEC = ${JSON.stringify(spec)};
${RUNTIME}
</script>
</body>
</html>
`;
  writeFileSync(join(raiz, id, 'index.html'), html);
  return { total, filas };
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
function tabla({ filas }) {
  const cab = '| N.º | Tiempo | Dur. | Texto en pantalla | Fuente de la imagen | Transición de entrada |\n|---|---|---|---|---|---|\n';
  return cab + filas.map((f) => `| ${f.n} | ${mmss(f.ini)}-${mmss(f.ini + f.dur)} | ${f.dur} s | ${f.texto.replace(/\|/g, '/')} | ${f.fuente} | ${f.trans} |`).join('\n') + '\n';
}

const a = componer(teaser);
const b = componer(explicativo);
const guion = `# Guion de los videos de Madori

Generado por \`src/generar.mjs\` desde \`src/teaser.mjs\` y \`src/explicativo.mjs\`: **no se edita a mano**, se cambian las escenas y se corre \`npm run generar\`.

- Formato: 1920 x 1080, 30 fps, MP4 (H.264). Sin voz en off y **sin música** (no se usó ninguna pista: ninguna fuente CC0 verificada); el texto en pantalla hace de subtítulos.
- Marca: Noche \`#0B1F4D\`, Cobalto \`#1F5FE0\`, Sol \`#FFB02E\` (solo formas), Cielo \`#CFE0FF\`, Crema \`#FFF4E2\`; Fraunces (logotipo), Bricolage Grotesque (títulos) y DM Sans (texto). Íconos de lucide, sin emojis.
- Las pantallas de login, proyectos y editor son capturas reales de la app y de sus plantillas (rutas del repo). Las escenas de **Escena desde una foto, Exportar plano, Imagen 3D y despliegue** (versión del 13 de octubre de 2026) son **maquetas dibujadas en HTML/CSS/SVG** con los textos, las opciones y los colores reales de la interfaz de Madori (https://madori-web-opal.vercel.app); la miniatura 3D es la de la plantilla Loft. No hay material de terceros.
- Cada transición se solapa 0,6 s con la escena anterior (la duración indicada es la de lectura, sin contar el solape).

## Video 1: teaser (${mmss(a.total)}, ${a.total} s) — \`npm run teaser\`

${tabla(a)}
## Video 2: explicativo (${mmss(b.total)}, ${b.total} s) — \`npm run explicativo\`

${tabla(b)}
## Cifras usadas (todas comprobadas en el repositorio)

- Casos de prueba: conteo estático de \`it(\`/\`test(\` por carpeta al 2026-10-12 (no es la salida de \`pnpm verify\`, que necesita Docker): API 58, web 738, raíz 77, paquetes 18, RLS 15 = 906 de unidad e integración; 168 escenarios E2E en 31 archivos.
- 144 muebles con nombre en castellano, 114 materiales, 4 plantillas: \`docs/ESTADO.md\`.
- 2 parches de pnpm (Pascal \`chrome\` y drei \`Html\`): \`docs/ESTADO.md\`.
- Exportar plano: hoja A4 o A3, escalas 1:25, 1:50 y 1:100, modos Papel y Color, cajetín con el logotipo y una hoja isométrica por planta (\`docs/ESTADO.md\`, «Exportar plano en PDF»; textos en \`apps/web/src/lib/export/texts-es.ts\`). Imagen 3D: PNG isométrico en Color o Blanco y negro (\`loft-isometrico.png\`, \`-bn.png\`).
- Escena desde una foto: \`POST /v1/analyze-room\` de la API con Gemini, hasta 10 análisis por hora y por persona, la foto no se guarda; cámara 3D con 60° de campo de visión a 1,5 m de altura (\`docs/ESTADO.md\`). Despliegue: web y API en Vercel, Postgres y Auth en Supabase (\`docs/nube.md\`); dirección https://madori-web-opal.vercel.app.
`;
writeFileSync(join(raiz, 'guion.md'), guion);
console.log(`teaser ${a.total} s · explicativo ${b.total} s`);
