// Escenas nuevas: Escena desde una foto, Exportar plano, Imagen 3D y despliegue. Cada una devuelve { html, tw }.
// "ritmo" (< 1) acelera las entradas para el teaser.
import { ico, cabecera, animCabecera } from './piezas.mjs';
import { salaFoto, sala3d, cono, planoHoja } from './maquetas.mjs';

const r = (sc) => (x) => +(x * (sc.ritmo || 1)).toFixed(2);
const flecha = (x1, x2, y, cls) =>
  `<path class="${cls}" pathLength="1" style="stroke-dasharray:1" d="M${x1} ${y}H${x2 - 4}" stroke="#1F5FE0" stroke-width="6" stroke-linecap="round" fill="none"/><polygon class="${cls}" points="${x2},${y} ${x2 - 20},${y - 11} ${x2 - 20},${y + 11}" fill="#1F5FE0"/>`;
const pill = (t, extra = '', hi = '') => `<div class="pill ${extra}"><span>${t}</span><div class="hi ${hi}">${t}</div></div>`;
const marca = (t) => `<i>${t}</i>`;
const late = (t) => ({ ...t, immediateRender: false });

// Foto -> Gemini reconoce los muebles -> ambiente en 3D.
export const fotoflujo = (sc) => {
  const R = r(sc);
  const filas = [['Sofá', 94], ['Lámpara de pie', 88], ['Mesa de centro', 81], ['Planta', 76]];
  return {
    html: `<div class="col wide" style="justify-content:flex-start;padding-top:90px">${cabecera(sc.title, sc.kicker, sc.sub)}</div>
      <div class="t2 ca" style="left:110px;top:440px;width:520px;height:500px"><h4>${marca(1)}Subes una foto</h4>${salaFoto().replace('<svg', '<svg class="dib"')}</div>
      <svg style="position:absolute;left:0;top:0" width="1920" height="1080">${flecha(636, 736, 690, 'f1')}${flecha(1166, 1266, 690, 'f2')}</svg>
      <div class="t2 cb" style="left:740px;top:440px;width:420px;height:500px"><h4>${marca(2)}Gemini reconoce</h4>
        <div class="rows" style="margin-top:0;gap:12px">${filas
          .map(([n, p]) => `<div class="fl2" style="background:#EEF2F8;border-radius:16px;padding:12px 16px"><div style="display:flex;justify-content:space-between;font:700 25px/1.1 'DMSans'"><span>${n}</span><span style="color:#1F5FE0">${p} %</span></div><div style="height:8px;border-radius:4px;background:#CFE0FF;margin-top:9px"><div class="br" style="height:8px;border-radius:4px;background:#1F5FE0;width:${p}%;transform-origin:0 50%"></div></div></div>`)
          .join('')}</div>
        <p class="cap" style="font-size:21px">Del catálogo de Madori.</p></div>
      <div class="t2 cc" style="left:1270px;top:440px;width:540px;height:500px"><h4>${marca(3)}Se arma en 3D</h4>${sala3d(480).replace('<svg', '<svg class="dib"')}
        <p class="cap" style="font-size:21px">Con la cámara en el punto de vista de la foto.</p></div>`,
    tw: [
      ...animCabecera(0.2, true, true),
      { s: '.ca', f: { opacity: 0, y: 60 }, t: { opacity: 1, y: 0 }, at: R(1.0), d: 0.7, e: 'back.out(1.2)' },
      { s: '.bx', f: { opacity: 0, y: -10 }, t: { opacity: 1, y: 0 }, at: R(2.0), d: 0.4, st: R(0.45) },
      { s: '.f1', f: { opacity: 0 }, t: { opacity: 1 }, at: R(2.2), d: 0.4 },
      { s: '.cb', f: { opacity: 0, y: 60 }, t: { opacity: 1, y: 0 }, at: R(2.7), d: 0.7, e: 'back.out(1.2)' },
      { s: '.br', f: { scaleX: 0 }, t: { scaleX: 1 }, at: R(3.4), d: 0.6, st: R(0.2) },
      { s: '.f2', f: { opacity: 0 }, t: { opacity: 1 }, at: R(4.2), d: 0.4 },
      { s: '.cc', f: { opacity: 0, y: 60 }, t: { opacity: 1, y: 0 }, at: R(4.6), d: 0.7, e: 'back.out(1.2)' },
    ],
  };
};

// Escena desde una foto, segunda parte: el ambiente 3D y la cámara.
export const ambiente3d = (sc) => ({
  html: `<div class="col" style="width:620px">${cabecera(sc.title, sc.kicker, sc.sub)}</div>
    <div class="win" style="left:720px;top:150px;width:1110px;height:780px">
      <div class="a3" style="position:absolute;left:36px;top:40px;width:680px">${sala3d(680).replace('<svg', '<svg class="dib" style="border-radius:20px"')}</div>
      <div class="pvbox cm2" style="position:absolute;left:748px;top:40px;width:326px;height:300px;padding:12px 12px">${cono()}</div>
      <div style="position:absolute;left:748px;top:366px;width:330px;display:flex;flex-direction:column;gap:12px">${sc.notas
        .map((n) => `<div class="chip cp" style="box-shadow:none;background:#EEF2F8;font-size:23px;line-height:1.2;border-radius:20px;padding:14px 18px 14px 14px">${ico(n.i)}<span>${n.t}</span></div>`)
        .join('')}</div>
      <div class="ok2 ok" style="position:absolute;left:36px;top:556px">${ico('check')}Todo en un solo paso: un Deshacer lo quita</div>
      <div class="cap" style="position:absolute;left:36px;top:640px;width:680px;font-size:25px">Muros, piso, cielo, una puerta y una ventana que esquivan los muebles; las piezas salen del catálogo con su tamaño real.</div>
    </div>`,
  tw: [
    ...animCabecera(0.2, true, true),
    { s: '.win', f: { opacity: 0, y: 70 }, t: { opacity: 1, y: 0 }, at: 0.4, d: 0.8, e: 'back.out(1.1)' },
    { s: '.a3 svg', f: { scale: 1.12 }, t: { scale: 1 }, at: 0.5, d: sc.dur, e: 'power1.out' },
    { s: '.cm2', f: { opacity: 0, x: 40 }, t: { opacity: 1, x: 0 }, at: 1.6, d: 0.6 },
    { s: '.cn', f: { opacity: 0 }, t: { opacity: 1 }, at: 2.3, d: 0.6 },
    { s: '.cm', f: { scale: 0 }, t: { scale: 1 }, at: 2.0, d: 0.6, e: 'back.out(2)' },
    { s: '.cp', f: { opacity: 0, x: 40 }, t: { opacity: 1, x: 0 }, at: 2.8, d: 0.5, st: 0.35 },
    { s: '.ok', f: { opacity: 0, y: 20 }, t: { opacity: 1, y: 0 }, at: 4.4, d: 0.6 },
    { s: '.cap', f: { opacity: 0 }, t: { opacity: 1 }, at: 5.0, d: 0.6 },
  ],
});

// Diálogo "Exportar plano" con una hoja de vista previa que cambia de escala y de modo.
export const plano = (sc) => {
  const R = r(sc);
  return {
    html: `<div class="col" style="width:560px">${cabecera(sc.title, sc.kicker, sc.sub)}${sc.chips ? `<div class="chips">${sc.chips.map((c) => `<div class="chip cp">${ico(c.i)}${c.t}</div>`).join('')}</div>` : ''}</div>
      <div class="win dlg" style="left:700px;top:100px;width:1130px;height:880px">
        <div style="position:absolute;left:40px;top:34px;width:470px">
          <div style="font:800 46px/1.05 'Bricolage'">Exportar plano</div>
          <div style="font:400 23px/1.3 'DMSans';color:#3b4d78;margin:8px 0 26px">PDF con escala, cotas y cajetín listo para imprimir.</div>
          <div class="lbl">Hoja</div><div class="pills"><div class="pill"><span>A4</span><div class="hi h4" style="opacity:1">A4</div></div>${pill('A3', '', 'h3')}</div>
          <div class="lbl">Escala</div><div class="pills">${pill('1:25')}<div class="pill"><span>1:50</span><div class="hi e50">1:50</div></div><div class="pill"><span>1:100</span><div class="hi e100" style="opacity:1">1:100</div></div></div>
          <div class="lbl">Modo</div><div class="pills"><div class="pill ink"><span>Papel</span><div class="hi mp" style="opacity:1">Papel</div></div><div class="pill ink"><span>Color</span><div class="hi mc">Color</div></div></div>
          <div class="tg"><div><b>Incluir cajetín</b><span class="s">Proyecto, escala, fecha y autor</span></div><div class="sw2"><div class="on" style="opacity:1"></div><div class="kn" style="left:32px"></div></div></div>
          <div class="tg"><div><b>Incluir vistas isométricas</b><span class="s">Una hoja por planta, sin escala, con su cajetín</span></div><div class="sw2"><div class="on iso1"></div><div class="kn iso2"></div></div></div>
          <div style="display:flex;gap:14px;margin-top:22px"><div class="btn2">${ico('x')}Cancelar</div><div class="btn2 pri dl">${ico('file-down')}Descargar PDF</div></div>
        </div>
        <div class="pvbox" style="position:absolute;left:540px;top:34px;width:550px;height:812px;padding:25px;text-align:center">
          <div class="hojab" style="width:500px;height:354px;position:relative"><div class="vs" style="position:absolute;inset:0">${planoHoja('pv', '1:100', 'Hoja 1 de 2')}</div><div class="vs1" style="position:absolute;inset:0;opacity:0">${planoHoja('pv2', '1:50', 'Hoja 1 de 2')}</div></div>
          <div style="margin-top:20px"><span class="ok2">${ico('check')}Cabe en la hoja · usa 64 % del ancho</span></div>
          <div class="cap capw"><span class="c1">Vista previa · A4 apaisada (297 × 210 mm) · 1:100</span><span class="c2" style="opacity:0">Vista previa · A4 apaisada (297 × 210 mm) · 1:50</span><span class="c3" style="opacity:0">Vista previa · A3 apaisada (420 × 297 mm) · 1:50</span></div>
          <div class="lbl" style="margin:26px 0 8px;font-size:23px;color:#3b4d78;font-weight:600">Una hoja A4 o A3 por planta, norte arriba</div>
          <div class="file" style="position:absolute;left:25px;right:25px;bottom:30px;display:flex;align-items:center;gap:14px;background:#fff;border-radius:20px;padding:16px 22px;box-shadow:0 8px 22px rgba(11,31,77,.14);font:700 26px/1.1 'DMSans';text-align:left"><span style="display:flex">${ico('file-down')}</span>casa-alvear-planos.pdf</div>
        </div>
      </div>`,
    tw: [
      ...animCabecera(0.2, true, true),
      ...(sc.chips ? [{ s: '.cp', f: { opacity: 0, scale: 0.8, y: 20 }, t: { opacity: 1, scale: 1, y: 0 }, at: R(1.3), d: 0.5, st: 0.25, e: 'back.out(1.6)' }] : []),
      { s: '.dlg', f: { opacity: 0, y: 80 }, t: { opacity: 1, y: 0 }, at: R(0.5), d: 0.8, e: 'back.out(1.1)' },
      { s: '.e100', f: { opacity: 1 }, t: { opacity: 0 }, at: R(2.2), d: 0.25 },
      { s: '.e50', f: { opacity: 0 }, t: { opacity: 1 }, at: R(2.2), d: 0.25 },
      { s: '.vs', f: { opacity: 1 }, t: { opacity: 0 }, at: R(2.3), d: 0.4 },
      { s: '.vs1', f: { opacity: 0 }, t: { opacity: 1 }, at: R(2.3), d: 0.4 },
      { s: '.c1', f: { opacity: 1 }, t: { opacity: 0 }, at: R(2.3), d: 0.3 },
      { s: '.c2', f: { opacity: 0 }, t: { opacity: 1 }, at: R(2.4), d: 0.3 },
      { s: '.mp', f: { opacity: 1 }, t: { opacity: 0 }, at: R(3.8), d: 0.25 },
      { s: '.mc', f: { opacity: 0 }, t: { opacity: 1 }, at: R(3.8), d: 0.25 },
      { s: '.co', f: { opacity: 0 }, t: { opacity: 1 }, at: R(3.8), d: 0.5 },
      { s: '.h4', f: { opacity: 1 }, t: { opacity: 0 }, at: R(5.0), d: 0.25 },
      { s: '.h3', f: { opacity: 0 }, t: { opacity: 1 }, at: R(5.0), d: 0.25 },
      { s: '.c2', f: { opacity: 1 }, t: late({ opacity: 0 }), at: R(5.0), d: 0.3 },
      { s: '.c3', f: { opacity: 0 }, t: { opacity: 1 }, at: R(5.1), d: 0.3 },
      { s: '.iso1', f: { opacity: 0 }, t: { opacity: 1 }, at: R(4.4), d: 0.25 },
      { s: '.iso2', f: { x: 0 }, t: { x: 28 }, at: R(4.4), d: 0.25 },
      { s: '.dl', f: { scale: 1 }, t: { scale: 1.08 }, at: R(5.8), d: 0.25, e: 'power2.out' },
      { s: '.file', f: { opacity: 0, y: 24 }, t: { opacity: 1, y: 0 }, at: R(6.3), d: 0.5 },
    ],
  };
};

// Una hoja isométrica por planta: el PDF completo (planta y vista isométrica de cada planta).
export const hojas = (sc) => {
  const x = (k) => 110 + k * 433;
  const iso = (pos, planta) => `<div class="iso"><img src="assets/plantillas/loft.jpg" alt="" style="left:${pos[0]}px;top:${pos[1]}px"><div class="cj"><em>Madori</em>Casa Alvear · ${planta}<br><span>Isométrico · Sin escala</span></div></div>`;
  const hoja = (k, cuerpo, t, c) => `<div class="hjh hj" style="left:${x(k)}px"><div class="hojab">${cuerpo}</div><b>${t}</b><span class="c">${c}</span></div>`;
  return {
    html: `<div class="col wide" style="justify-content:flex-start;padding-top:90px">${cabecera(sc.title, sc.kicker, sc.sub)}</div>
      ${hoja(0, planoHoja('h1', '1:50', 'Hoja 1 de 4', 'Planta baja'), 'Hoja 1 · Planta baja', 'Plano a escala 1:50')}
      ${hoja(1, planoHoja('h2', '1:50', 'Hoja 2 de 4', 'Planta alta'), 'Hoja 2 · Planta alta', 'Plano a escala 1:50')}
      ${hoja(2, iso([-290, -215], 'Planta baja'), 'Hoja 3 · Planta baja', 'Vista isométrica, sin escala')}
      ${hoja(3, iso([-100, -30], 'Planta alta'), 'Hoja 4 · Planta alta', 'Vista isométrica, sin escala')}
      <div class="nota" style="bottom:56px;font-size:30px;color:#0B1F4D">Dos modos: Papel (blanco y negro, para imprimir) y Color (para presentar).</div>`,
    tw: [
      ...animCabecera(0.2, true, true),
      { s: '.hj', f: { opacity: 0, y: 90, rotate: 2 }, t: { opacity: 1, y: 0, rotate: 0 }, at: 1.0, d: 0.7, st: 0.45, e: 'back.out(1.2)' },
      { s: '.nota', f: { opacity: 0, y: 20 }, t: { opacity: 1, y: 0 }, at: 3.4, d: 0.6 },
    ],
  };
};

// Imagen 3D: PNG isométrico en Color o en Blanco y negro.
export const imagen3d = (sc) => {
  const R = r(sc);
  return {
    html: `<div class="sun" style="left:-120px;top:820px;width:340px;height:340px;opacity:.9"></div>
      <div class="col">${cabecera(sc.title, sc.kicker, sc.sub)}${sc.chips ? `<div class="chips">${sc.chips.map((c) => `<div class="chip cp">${ico(c.i)}${c.t}</div>`).join('')}</div>` : ''}</div>
      <div class="fr"><div class="fr-in"><img class="ic" src="assets/plantillas/loft.jpg" alt="" style="object-position:center"><img class="bn" src="assets/plantillas/loft.jpg" alt="" style="object-position:center;filter:grayscale(1) contrast(1.06);opacity:0">
        <div class="fchip fa">${ico('file-image')}<span class="cfil">loft-isometrico.png</span></div>
        <div class="fchip fb" style="opacity:0">${ico('file-image')}<span>loft-isometrico-bn.png</span></div>
        <div class="seg"><div class="pill ink"><span>Color</span><div class="hi sc" style="opacity:1">Color</div></div><div class="pill ink"><span>Blanco y negro</span><div class="hi sb2">Blanco y negro</div></div></div>
        <div class="btn2 bx2" style="position:absolute;right:24px;bottom:28px;box-shadow:0 10px 30px rgba(11,31,77,.22)">${ico('image-down')}Exportar imagen 3D</div></div></div>`,
    tw: [
      ...animCabecera(0.2, true, true),
      ...(sc.chips ? [{ s: '.cp', f: { opacity: 0, scale: 0.8, y: 20 }, t: { opacity: 1, scale: 1, y: 0 }, at: R(1.3), d: 0.5, st: 0.25, e: 'back.out(1.6)' }] : []),
      { s: '.fr', f: { opacity: 0, x: 90, rotate: 0.6 }, t: { opacity: 1, x: 0, rotate: 0 }, at: R(0.35), d: 0.9 },
      { s: '.ic', f: { scale: 1 }, t: { scale: 1.06 }, at: R(0.6), d: sc.dur + 0.6, e: 'none' },
      { s: '.bn', f: { scale: 1 }, t: { scale: 1.06 }, at: R(0.6), d: sc.dur + 0.6, e: 'none' },
      { s: '.fa', f: { opacity: 0, y: -20 }, t: { opacity: 1, y: 0 }, at: R(1.8), d: 0.5 },
      { s: '.sc', f: { opacity: 1 }, t: { opacity: 0 }, at: R(3.0), d: 0.25 },
      { s: '.sb2', f: { opacity: 0 }, t: { opacity: 1 }, at: R(3.0), d: 0.25 },
      { s: '.bn', f: { opacity: 0 }, t: { opacity: 1 }, at: R(3.1), d: 0.6 },
      { s: '.fa', f: { opacity: 1 }, t: late({ opacity: 0 }), at: R(3.9), d: 0.3 },
      { s: '.fb', f: { opacity: 0, y: -20 }, t: { opacity: 1, y: 0 }, at: R(4.0), d: 0.5 },
      { s: '.bx2', f: { scale: 1 }, t: { scale: 1.07 }, at: R(3.8), d: 0.25, e: 'power2.out' },
    ],
  };
};

// Despliegue: Vercel (web y API) + Supabase + Gemini.
export const nube = (sc) => {
  const R = r(sc);
  const X = [110, 573, 1036, 1499];
  const W = 311;
  const nodo = (cls, x, y, h, small, b, s) => `<div class="node nb ${cls}" style="left:${x}px;top:${y}px;width:${W}px;height:${h}px"><small>${small}</small><b>${b}</b><span>${s}</span></div>`;
  const gap = (k) => [X[k] + W + 6, X[k + 1] - 6];
  const lab = (k, t, w) => `<div class="lab nl" style="left:${X[k] + W + (152 - w) / 2}px;top:500px">${t}</div>`;
  return {
    html: `<div class="col wide" style="justify-content:flex-start;padding-top:90px">${cabecera(sc.title, sc.kicker, sc.sub)}</div>
      ${nodo('', X[0], 470, 200, 'Persona', 'Tu navegador', 'Sin instalar nada')}
      ${nodo('', X[1], 470, 200, 'Vercel', 'Web: Next 16', 'Pantallas, acceso y editor')}
      ${nodo('', X[2], 470, 200, 'Vercel', 'API Fastify', 'Una sola función en la nube')}
      ${nodo('sb', X[3], 470, 200, 'Supabase', 'Postgres + Auth', 'Cada persona ve solo lo suyo')}
      ${nodo('', X[2], 790, 170, 'Google', 'Gemini', 'Reconoce los muebles de la foto')}
      <svg style="position:absolute;left:0;top:0" width="1920" height="1080">${flecha(...gap(0), 570, 'n1')}${flecha(...gap(1), 570, 'n2')}${flecha(...gap(2), 570, 'n3')}
        <path class="n4" pathLength="1" style="stroke-dasharray:1" d="M${X[2] + 155} 676V770" stroke="#1F5FE0" stroke-width="6" stroke-linecap="round" fill="none"/><polygon class="n4" points="${X[2] + 155},788 ${X[2] + 144},768 ${X[2] + 166},768" fill="#1F5FE0"/></svg>
      ${lab(0, 'HTTPS', 90)}${lab(1, 'REST + JWT', 128)}${lab(2, 'con RLS', 100)}
      <div class="url ur" style="position:absolute;left:110px;top:800px">${ico('globe')}madori-web-opal.vercel.app</div>
      <div class="nota" style="left:110px;bottom:62px;font-size:28px;color:#0B1F4D;max-width:760px">Web y API se publican desde el repositorio, cada una con su proyecto de Vercel.</div>`,
    tw: [
      ...animCabecera(0.2, true, true),
      { s: '.nb', f: { opacity: 0, y: 50, scale: 0.92 }, t: { opacity: 1, y: 0, scale: 1 }, at: R(1.0), d: 0.6, st: R(0.4), e: 'back.out(1.4)' },
      { s: '.n1', f: { opacity: 0 }, t: { opacity: 1 }, at: R(1.7), d: 0.4 },
      { s: '.n2', f: { opacity: 0 }, t: { opacity: 1 }, at: R(2.1), d: 0.4 },
      { s: '.n3', f: { opacity: 0 }, t: { opacity: 1 }, at: R(2.5), d: 0.4 },
      { s: '.n4', f: { opacity: 0 }, t: { opacity: 1 }, at: R(2.9), d: 0.4 },
      { s: '.nl', f: { opacity: 0, y: 10 }, t: { opacity: 1, y: 0 }, at: R(2.2), d: 0.4, st: R(0.3) },
      { s: '.ur', f: { opacity: 0, y: 30 }, t: { opacity: 1, y: 0 }, at: R(3.4), d: 0.6, e: 'back.out(1.4)' },
      ...(sc.dur > 6 ? [{ s: '.nota', f: { opacity: 0 }, t: { opacity: 1 }, at: 4.4, d: 0.6 }] : []),
    ],
  };
};
