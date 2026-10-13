// Piezas reutilizables: íconos lucide, logotipo, cabecera de escena.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

export function ico(nombre) {
  const svg = readFileSync(join(raiz, 'node_modules/lucide-static/icons', `${nombre}.svg`), 'utf8');
  const cuerpo = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${cuerpo}</svg>`;
}

// Ventana de la "o": marco del color de las letras (currentColor), vidrio transparente, sol Sol.
export function ventana(id, extra = '') {
  return `<svg viewBox="0 0 64 64" aria-hidden="true" ${extra}>
    <path id="${id}-v" pathLength="1" style="stroke-dasharray:1" d="M7 46V32A25 25 0 0 1 57 32V46A12 12 0 0 1 45 58H19A12 12 0 0 1 7 46Z" fill="none" stroke="currentColor" stroke-width="11" stroke-linejoin="round"/>
    <circle id="${id}-s" cx="32" cy="39" r="9" fill="#FFB02E" style="transform-box:fill-box;transform-origin:50% 50%"/>
  </svg>`;
}

export function logotipo(id, tam = 150) {
  const l = (c, n) => `<span class="lt ${id}-l" id="${id}-l${n}">${c}</span>`;
  return `<span class="logo" style="font-size:${tam}px" role="img" aria-label="Madori">${l('M', 0)}${l('a', 1)}${l('d', 2)}<span class="o ${id}-o">${ventana(id, 'preserveAspectRatio="none"')}</span>${l('r', 3)}${l('i', 4)}</span>`;
}

// Animación de entrada del logotipo (rel. al inicio de la escena).
export function animLogo(id, at = 0.2) {
  return [
    { s: `.${id}-l`, f: { opacity: 0, y: 40 }, t: { opacity: 1, y: 0 }, at, d: 0.5, st: 0.1 },
    { s: `#${id}-v`, f: { strokeDashoffset: 1 }, t: { strokeDashoffset: 0 }, at: at + 0.35, d: 0.9, e: 'power2.inOut' },
    { s: `#${id}-s`, f: { scale: 0, y: 14 }, t: { scale: 1, y: 0 }, at: at + 1.2, d: 0.7, e: 'back.out(2)' },
  ];
}

// Cabecera estándar: kicker, título (líneas separadas por "|") y subtítulo.
export function cabecera(titulo, kicker, sub, xl = false) {
  const lineas = titulo.split('|').map((x) => `<span class="w tl">${x}</span>`).join('<br>');
  return `${kicker ? `<div class="kick kk"><i></i>${kicker}</div>` : ''}<h2 class="${xl ? 'xl' : ''}">${lineas}</h2>${sub ? `<p class="sub sb">${sub}</p>` : ''}`;
}

export function animCabecera(at = 0.2, tieneKicker = true, tieneSub = true) {
  const a = [];
  if (tieneKicker) a.push({ s: '.kk', f: { opacity: 0, y: 20 }, t: { opacity: 1, y: 0 }, at, d: 0.5 });
  a.push({ s: '.tl', f: { opacity: 0, y: 44 }, t: { opacity: 1, y: 0 }, at: at + 0.15, d: 0.7, st: 0.18 });
  if (tieneSub) a.push({ s: '.sb', f: { opacity: 0, y: 24 }, t: { opacity: 1, y: 0 }, at: at + 0.7, d: 0.7 });
  return a;
}
