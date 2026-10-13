// Video 1: teaser de 36 s.
const C = 'assets/capturas/';
const P = 'assets/plantillas/';

export const teaser = {
  id: 'teaser',
  titulo: 'Madori - teaser',
  escenas: [
    { kind: 'frase', bg: 'crema', dur: 4.5, kicker: 'El problema', title: 'Amoblar y planificar|un local o una vivienda|sin software complejo.', sub: 'Planos, medidas y muebles en programas pensados para profesionales.', fuente: 'Sin imagen: tipografía y forma de la marca (círculo Sol)' },
    { kind: 'captura', bg: 'cielo', dur: 4.5, trans: 'deslizar', kicker: 'Entra', title: 'Tu cuenta,|tus proyectos', sub: 'Ingresa o crea tu cuenta en segundos.', img: C + 'login.jpg', crop: 94, fuente: 'docs/design/implementado/login.jpg', zoom: { s: 1.06, o: '60% 50%' } },
    { kind: 'captura', bg: 'crema', dur: 5, trans: 'fundido', kicker: 'Empieza rápido', title: 'Elige una plantilla|de vivienda o comercio', sub: 'O parte de un plano en blanco.', img: C + 'nuevo-proyecto.jpg', fuente: 'docs/design/implementado/nuevo-proyecto.jpg', zoom: { s: 1.1, o: '50% 62%' } },
    { kind: 'captura', bg: 'canvas', dur: 6, trans: 'zoom', kicker: 'Editor 2D y 3D', title: 'El plano y la casa,|a la vez', sub: 'Mira en modo Ver o cambia a Editar.', chips: [{ i: 'eye', t: 'Ver' }, { i: 'pencil', t: 'Editar' }, { i: 'layers', t: 'Plantas' }], img: C + 'editor-ver-dividida.jpg', fuente: 'docs/design/implementado/editor-ver-dividida.jpg', zoom: { s: 1.08, o: '50% 10%' } },
    { kind: 'captura', bg: 'crema', dur: 4.5, trans: 'deslizar', kicker: 'Muebles', title: 'Muebles que|se ajustan a tu medida', sub: 'Estantes y gabinetes paramétricos, y más de cien piezas.', img: C + 'editor-muebles.jpg', fuente: 'docs/design/implementado/editor-muebles.jpg', zoom: { s: 1.08, o: '15% 50%' } },
    { kind: 'captura', bg: 'cielo', dur: 4.5, trans: 'fundido', kicker: 'Recorre tu diseño', title: 'Varias plantas,|y camina por dentro', sub: 'Mira el resultado antes de comprar o construir.', chips: [{ i: 'footprints', t: 'Recorrer' }], img: C + 'editor-ver-3d.jpg', fuente: 'docs/design/implementado/editor-ver-3d.jpg', zoom: { s: 1.08, o: '70% 40%' } },
    { kind: 'frase', bg: 'crema', dur: 3, trans: 'zoom', kicker: 'Próximamente', title: 'Exporta tu plano|en PDF', sub: 'Con escala y cajetín. Todavía no está disponible.', fuente: 'Sin imagen: tipografía y forma de la marca' },
    { kind: 'cierre', bg: 'crema', dur: 5.5, trans: 'fundido', sub: 'Diseño de interiores 2D y 3D', curso: 'Trabajo final de IISAIA, FIUBA', fuente: 'Logotipo reconstruido con la geometría de apps/web/src/lib/brand.ts' },
  ],
};
