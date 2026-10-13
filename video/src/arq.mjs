// Diagrama de arquitectura animado (escena "arq"). Coordenadas absolutas sobre 1920x1080.
const N = {
  user: { x: 50, y: 410, w: 240, h: 190 },
  web: { x: 370, y: 240, w: 570, h: 500 },
  pas: { x: 400, y: 450, w: 510, h: 125 },
  shl: { x: 400, y: 595, w: 510, h: 125 },
  api: { x: 1130, y: 240, w: 300, h: 230 },
  sb: { x: 1640, y: 240, w: 250, h: 360 },
  lab: { x: 1640, y: 660, w: 250, h: 220 },
  con: { x: 500, y: 805, w: 840, h: 115 },
};
// Aristas como polilíneas [x,y,...]; "d" = punteada.
const E = [
  { id: 'e1', p: [290, 505, 370, 505], at: 4.2 },
  { id: 'e2', p: [940, 330, 1130, 330], at: 6.6, lab: ['REST + JWT', 966, 268] },
  { id: 'e3', p: [1430, 360, 1640, 360], at: 9.6, lab: ['con RLS', 1486, 298] },
  { id: 'e4', p: [660, 240, 660, 195, 1765, 195, 1765, 240], at: 10.6, lab: ['Auth: ingresar y crear cuenta', 1100, 150] },
  { id: 'e5', p: [1430, 430, 1535, 430, 1535, 770, 1640, 770], at: 12.4, lab: ['foto → Gemini', 1310, 690] },
  { id: 'e6', p: [660, 805, 660, 740], at: 7.6, d: 1 },
  { id: 'e7', p: [1280, 805, 1280, 470], at: 8.0, d: 1, lab: ['mismo contrato', 1296, 560] },
];

function flecha(p) {
  const [x2, y2] = [p[p.length - 2], p[p.length - 1]];
  const [x1, y1] = [p[p.length - 4], p[p.length - 3]];
  const a = Math.atan2(y2 - y1, x2 - x1);
  const t = (r, d) => `${x2 + r * Math.cos(a + d)},${y2 + r * Math.sin(a + d)}`;
  return `${x2},${y2} ${t(-20, 0.45)} ${t(-20, -0.45)}`;
}

export const arq = (sc) => {
  const box = (k, cls, html) => `<div class="node ${cls} nd-${k}" style="left:${N[k].x}px;top:${N[k].y}px;width:${N[k].w}px;height:${N[k].h}px">${html}</div>`;
  const html = `<div style="position:absolute;left:110px;top:56px;width:1100px"><div class="kick kk"><i></i>${sc.kicker}</div><h2 style="font-size:64px;margin-top:16px"><span class="w tl">${sc.title}</span></h2></div>
    ${box('user', '', '<small>Persona</small><b>Tu navegador</b><span>Cualquier dispositivo</span>')}
    ${box('web', '', '<small>apps/web · en Vercel</small><b>Next 16 + React 19 + Tailwind 4</b><span>Pantallas, acceso y autoguardado</span>')}
    ${box('pas', 'in', '<b>Editor Pascal 1.0.3</b><span>con 2 parches de pnpm; solo vive en src/editor/</span>')}
    ${box('shl', 'in', '<b>Shell propio de Madori</b><span>Ver, Editar, 2D, 3D, plantas, muebles</span>')}
    ${box('api', '', '<small>apps/api</small><b>API Fastify</b><span>En Vercel, con openapi.yaml</span>')}
    ${box('sb', 'sb', '<small>Supabase</small><b>Postgres + RLS</b><span>Auth con correo y contraseña. Migraciones en git</span>')}
    ${box('lab', '', '<small>Google</small><b>Gemini</b><span>Reconoce los muebles de la foto</span>')}
    ${box('con', '', '<small>packages/contract</small><b>Esquemas zod compartidos</b><span>Una sola definición para la web y la API</span>')}
    <svg style="position:absolute;left:0;top:0" width="1920" height="1080">${E.map(
      (e) =>
        `<polyline class="ed ${e.id}" pathLength="1" style="stroke-dasharray:${e.d ? '.03 .02' : '1'}" points="${e.p.join(' ')}" fill="none" stroke="${e.d ? '#8aa3d6' : '#1F5FE0'}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><polygon class="ah ${e.id}h" points="${flecha(e.p)}" fill="${e.d ? '#8aa3d6' : '#1F5FE0'}"/>`,
    ).join('')}</svg>
    ${E.filter((e) => e.lab)
      .map((e) => `<div class="lab ${e.id}l" style="left:${e.lab[1]}px;top:${e.lab[2]}px">${e.lab[0]}</div>`)
      .join('')}
    <div class="node bar" style="left:60px;top:960px;width:1800px;height:78px;padding:0 32px;display:flex;align-items:center;gap:44px;background:#CFE0FF;box-shadow:none;border-radius:24px">
      <b style="margin:0;font-size:30px">pnpm monorepo</b><span style="margin:0;font-size:26px">Vitest · Playwright · Biome · pnpm verify en cada cambio</span></div>`;
  const nd = (k, at) => ({ s: `.nd-${k}`, f: { opacity: 0, scale: 0.9, y: 24 }, t: { opacity: 1, scale: 1, y: 0 }, at, d: 0.6, e: 'back.out(1.4)' });
  const ed = (e) => [
    { s: `.${e.id}`, f: { strokeDashoffset: e.d ? 0 : 1, opacity: e.d ? 0 : 1 }, t: { strokeDashoffset: 0, opacity: 1 }, at: e.at, d: 0.7, e: 'power2.inOut' },
    { s: `.${e.id}h`, f: { opacity: 0 }, t: { opacity: 1 }, at: e.at + 0.6, d: 0.2 },
    ...(e.lab ? [{ s: `.${e.id}l`, f: { opacity: 0, y: 10 }, t: { opacity: 1, y: 0 }, at: e.at + 0.3, d: 0.5 }] : []),
  ];
  return {
    html,
    tw: [
      { s: '.kk', f: { opacity: 0, y: 20 }, t: { opacity: 1, y: 0 }, at: 0.2, d: 0.5 },
      { s: '.tl', f: { opacity: 0, y: 30 }, t: { opacity: 1, y: 0 }, at: 0.35, d: 0.6 },
      nd('user', 1.4), nd('web', 2.2), nd('pas', 3.0), nd('shl', 3.5),
      nd('api', 5.6), nd('con', 7.0), nd('sb', 8.8), nd('lab', 11.6),
      { s: '.bar', f: { opacity: 0, y: 30 }, t: { opacity: 1, y: 0 }, at: 13.6, d: 0.7 },
      ...E.flatMap(ed),
    ],
  };
};
