// Tipos de escena. Cada uno devuelve { html, tw } (tw = tweens relativos al inicio de la escena).
import { ico, logotipo, animLogo, cabecera, animCabecera, ventana } from './piezas.mjs';

const chips = (lista = []) =>
  lista.length
    ? `<div class="chips">${lista.map((c) => `<div class="chip cp ${c.pronto ? 'soon' : ''}">${ico(c.i)}${c.t}</div>`).join('')}</div>`
    : '';
const animChips = (at) => [{ s: '.cp', f: { opacity: 0, scale: 0.8, y: 20 }, t: { opacity: 1, scale: 1, y: 0 }, at, d: 0.5, st: 0.25, e: 'back.out(1.6)' }];

export const frase = (sc) => ({
  html: `<div class="sun" style="left:1380px;top:250px;width:420px;height:420px"></div>
    <div class="col wide">${cabecera(sc.title, sc.kicker, sc.sub, true)}</div>`,
  tw: [
    { s: '.sun', f: { scale: 0 }, t: { scale: 1 }, at: 0.3, d: 1.1, e: 'back.out(1.5)' },
    ...animCabecera(0.2, !!sc.kicker, !!sc.sub),
    ...(sc.sol ? [{ s: '.sun', f: { y: 0 }, t: { y: -40 }, at: 1.4, d: sc.dur, e: 'none' }] : []),
  ],
});

export const captura = (sc) => {
  const z = sc.zoom || { s: 1.07, o: '50% 50%' };
  
  return {
    html: `<div class="sun" style="left:-120px;top:820px;width:340px;height:340px;opacity:.9"></div>
      <div class="col">${cabecera(sc.title, sc.kicker, sc.sub)}${chips(sc.chips)}</div>
      <div class="fr ${sc.crop ? 'crop' : ''}"><div class="fr-in"><img src="${sc.img}" alt="" style="transform-origin:${z.o}"></div></div>`,
    tw: [
      ...animCabecera(0.2, !!sc.kicker, !!sc.sub),
      ...animChips(1.3),
      { s: '.fr', f: { opacity: 0, x: 90, rotate: 0.6 }, t: { opacity: 1, x: 0, rotate: 0 }, at: 0.35, d: 0.9 },
      { s: '.fr-in img', f: { scale: 1 }, t: { scale: z.s }, at: 0.6, d: sc.dur + 0.6, e: 'power1.inOut' },
    ],
  };
};

export const plantillas = (sc) => ({
  html: `<div class="col wide" style="justify-content:flex-start;padding-top:90px">${cabecera(sc.title, sc.kicker, sc.sub)}</div>
    <div class="tiles">${sc.items.map((p) => `<div class="tile ti"><img src="${p.img}" alt=""><b>${p.t}</b><span>${p.s}</span></div>`).join('')}</div>`,
  tw: [
    ...animCabecera(0.2, !!sc.kicker, !!sc.sub),
    { s: '.ti', f: { opacity: 0, y: 80, scale: 0.92 }, t: { opacity: 1, y: 0, scale: 1 }, at: 1.1, d: 0.7, st: 0.3, e: 'back.out(1.3)' },
    { s: '.ti img', f: { scale: 1.12 }, t: { scale: 1 }, at: 1.1, d: sc.dur, e: 'power1.out' },
  ],
});

export const lista = (sc) => ({
  html: `<div class="col" style="width:700px">${cabecera(sc.title, sc.kicker, sc.sub)}</div>
    <div style="position:absolute;left:880px;top:0;width:930px;height:1080px;display:flex;flex-direction:column;justify-content:center">
    <div class="rows" style="margin-top:0">${sc.rows
      .map((r) => `<div class="row rw"><div class="ico">${ico(r.i)}</div><div><b>${r.t}</b><span>${r.s}</span></div></div>`)
      .join('')}</div></div>`,
  tw: [...animCabecera(0.2, !!sc.kicker, !!sc.sub), { s: '.rw', f: { opacity: 0, x: 120 }, t: { opacity: 1, x: 0 }, at: 0.9, d: 0.6, st: sc.paso || 0.55 }],
});

export const stats = (sc) => ({
  html: `<div class="col" style="width:620px">${cabecera(sc.title, sc.kicker, sc.sub)}</div>
    <div style="position:absolute;left:800px;top:110px;width:1010px;height:860px;display:flex;align-items:center"><div class="grid2" style="width:100%">${sc.stats
      .map((s, k) => `<div class="stat st"><div class="n" id="n${k}">0</div><div class="l">${s.l}</div><div class="d">${s.d}</div></div>`)
      .join('')}</div></div>
    ${sc.nota ? `<div class="nota">${sc.nota}</div>` : ''}`,
  tw: [
    ...animCabecera(0.2, !!sc.kicker, !!sc.sub),
    { s: '.st', f: { opacity: 0, y: 60 }, t: { opacity: 1, y: 0 }, at: 0.9, d: 0.6, st: 0.35 },
    ...sc.stats.map((s, k) => ({ op: 'count', s: `#n${k}`, to: s.n, at: 1.0 + k * 0.35, d: 1.8, sep: s.sep })),
  ],
});

export const flujo = (sc) => {
  const n = sc.steps.length;
  const ancho = n > 5 ? 250 : 300;
  const hueco = (1700 - n * ancho) / (n - 1);
  return {
    html: `<div class="col wide" style="justify-content:flex-start;padding-top:90px">${cabecera(sc.title, sc.kicker, sc.sub)}</div>
      ${sc.steps
        .map((s, k) => `<div class="step sp" style="width:${ancho}px;left:${110 + k * (ancho + hueco)}px;top:${sc.top || 520}px"><div class="num">${k + 1}</div><b>${s.t}</b><span>${s.s}</span></div>`)
        .join('')}
      <svg style="position:absolute;left:0;top:0" width="1920" height="1080">${sc.steps
        .slice(1)
        .map((_, k) => {
          const x1 = 110 + k * (ancho + hueco) + ancho + 6;
          const x2 = 110 + (k + 1) * (ancho + hueco) - 6;
          const y = (sc.top || 520) + 52;
          return `<path class="fl" pathLength="1" style="stroke-dasharray:1" d="M${x1} ${y}H${x2}" stroke="#1F5FE0" stroke-width="5" stroke-linecap="round" fill="none"/>`;
        })
        .join('')}</svg>
      ${sc.pie ? `<div class="nota" style="bottom:70px;font-size:30px;color:#0B1F4D">${sc.pie}</div>` : ''}`,
    tw: [
      ...animCabecera(0.2, !!sc.kicker, !!sc.sub),
      { s: '.sp', f: { opacity: 0, y: 50 }, t: { opacity: 1, y: 0 }, at: 1.2, d: 0.55, st: sc.paso || 0.7, e: 'back.out(1.4)' },
      { s: '.fl', f: { strokeDashoffset: 1 }, t: { strokeDashoffset: 0 }, at: 1.6, d: 0.5, st: sc.paso || 0.7 },
      ...(sc.pie ? [{ s: '.nota', f: { opacity: 0, y: 20 }, t: { opacity: 1, y: 0 }, at: 1.2 + n * (sc.paso || 0.7) + 0.3, d: 0.6 }] : []),
    ],
  };
};

export const apertura = (sc) => ({
  html: `<div class="sun" style="left:1480px;top:-140px;width:520px;height:520px;opacity:.9"></div>
    <div class="center">${logotipo('ap', sc.tam || 260)}<p class="sub" style="font-size:44px;margin-top:34px;max-width:1200px">${sc.sub}</p></div>`,
  tw: [
    { s: '.sun', f: { scale: 0 }, t: { scale: 1 }, at: 0.2, d: 1.2, e: 'back.out(1.4)' },
    ...animLogo('ap', 0.3),
    { s: '.sb', f: { opacity: 0, y: 24 }, t: { opacity: 1, y: 0 }, at: 2.0, d: 0.7 },
  ],
});

export const cierre = (sc) => ({
  html: `<div class="center">${logotipo('ci', 240)}
    <p class="sub sb" style="font-size:44px;margin-top:20px;color:#0B1F4D">${sc.sub}</p>
    <div class="names nm">Silvert Quispe <em>y</em> Victoria Villalba</div>
    <p class="sub nm" style="font-size:30px;margin-top:18px">${sc.curso}</p></div>`,
  tw: [...animLogo('ci', 0.2), { s: '.sb', f: { opacity: 0, y: 20 }, t: { opacity: 1, y: 0 }, at: 1.7, d: 0.6 }, { s: '.nm', f: { opacity: 0, y: 24 }, t: { opacity: 1, y: 0 }, at: 2.3, d: 0.7, st: 0.3 }],
});

export const personas = (sc) => ({
  html: `<div class="col wide" style="justify-content:flex-start;padding-top:110px">${cabecera(sc.title, sc.kicker, sc.sub)}</div>
    <div style="position:absolute;left:110px;top:560px;display:flex;gap:40px">${sc.gente
      .map((p) => `<div class="node pe" style="position:relative;width:520px;padding:34px 38px"><small>${p.rol}</small><b style="font-size:48px">${p.n}</b><span style="font-size:27px">${p.s}</span></div>`)
      .join('')}
      <div class="node pe" style="position:relative;width:640px;padding:34px 38px;background:#1F5FE0;color:#fff"><small style="color:#CFE0FF">${sc.curso.k}</small><b style="font-size:42px">${sc.curso.t}</b><span style="font-size:27px;color:#DCE6FF">${sc.curso.s}</span></div></div>`,
  tw: [...animCabecera(0.2, true, true), { s: '.pe', f: { opacity: 0, y: 60 }, t: { opacity: 1, y: 0 }, at: 1.2, d: 0.6, st: 0.4, e: 'back.out(1.3)' }],
});

export const origen = (sc) => {
  const D = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`;
  return {
    html: `<div class="col" style="width:760px">${cabecera(sc.title, sc.kicker, sc.sub)}</div>
      <div style="position:absolute;left:960px;top:150px;width:850px;height:780px">
        <div class="kj" style="position:absolute;left:0;top:0;width:850px;text-align:center;font:700 190px/1 'Yu Mincho','Yu Gothic','Meiryo','MS Gothic',serif;color:#0B1F4D;letter-spacing:.04em">間取り</div>
        <svg viewBox="0 0 300 300" style="position:absolute;left:30px;top:250px;width:340px;height:340px" fill="none" stroke="#0B1F4D" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
          <path class="pu" pathLength="1" style="stroke-dasharray:1" d="M40 280V20H260V280"/>
          <path class="pu" pathLength="1" style="stroke-dasharray:1" d="M40 20H260"/>
          <g class="di" stroke-width="7" stroke="#0B1F4D"><rect x="105" y="80" width="90" height="110" rx="10"/><path d="M105 135H195"/></g>
          <circle class="so" cx="150" cy="135" r="30" fill="#FFB02E" stroke="none" style="transform-box:fill-box;transform-origin:50% 50%"/>
        </svg>
        <div class="ig" style="position:absolute;left:380px;top:370px;font:700 90px/1 'Bricolage';color:#1F5FE0">=</div>
        <div class="vt" style="position:absolute;left:470px;top:250px;width:340px;height:340px;color:#0B1F4D">${ventana('or').replace('<svg', '<svg style="width:100%;height:100%"')}</div>
        <div style="position:absolute;left:0;top:620px;width:850px;font:400 30px/1.35 'DMSans';color:#3b4d78;text-align:center" class="pie">Un sol dentro de una puerta: la ventana de la "o" de Madori</div>
      </div>`,
    tw: [
      ...animCabecera(0.2, true, true),
      { s: '.kj', f: { opacity: 0, y: 40 }, t: { opacity: 1, y: 0 }, at: 0.8, d: 0.9 },
      { s: '.pu', f: { strokeDashoffset: 1 }, t: { strokeDashoffset: 0 }, at: 2.0, d: 1.0, e: 'power2.inOut' },
      { s: '.di', f: { opacity: 0 }, t: { opacity: 1 }, at: 3.0, d: 0.5 },
      { s: '.so', f: { scale: 0 }, t: { scale: 1 }, at: 3.4, d: 0.7, e: 'back.out(2)' },
      { s: '.ig', f: { opacity: 0, scale: 0.5 }, t: { opacity: 1, scale: 1 }, at: 4.4, d: 0.5, e: 'back.out(2)' },
      { s: '#or-v', f: { strokeDashoffset: 1 }, t: { strokeDashoffset: 0 }, at: 4.8, d: 0.9, e: 'power2.inOut' },
      { s: '#or-s', f: { scale: 0 }, t: { scale: 1 }, at: 5.6, d: 0.7, e: 'back.out(2)' },
      { s: '.pie', f: { opacity: 0 }, t: { opacity: 1 }, at: 6.2, d: 0.7 },
    ],
  };
};

export const marca = (sc) => ({
  html: `<div class="col wide" style="justify-content:flex-start;padding-top:90px">${cabecera(sc.title, sc.kicker, sc.sub)}</div>
    <div style="position:absolute;left:110px;top:480px;display:flex;gap:50px;align-items:flex-start">
      <div><div class="sw">${[['Noche', '#0B1F4D', 'texto y letras'], ['Cobalto', '#1F5FE0', 'botones y enlaces'], ['Sol', '#FFB02E', 'solo formas'], ['Cielo', '#CFE0FF', 'fondos suaves'], ['Crema', '#FFF4E2', 'fondo cálido']]
        .map(([n, c, u]) => `<div class="sq"><i style="background:${c}${c === '#FFF4E2' ? ';border:2px solid #0B1F4D22' : ''}"></i><b>${n}</b><span>${c}</span><span>${u}</span></div>`)
        .join('')}</div></div>
      <div class="ty" style="padding-top:40px"><div style="font:700 88px/1 'Fraunces';font-variation-settings:'SOFT' 100;color:#0B1F4D">Fraunces</div><div style="font:400 28px/1.3 'DMSans';color:#3b4d78;margin:6px 0 26px">solo el logotipo</div>
        <div style="font:800 54px/1 'Bricolage';white-space:nowrap">Bricolage Grotesque</div><div style="font:400 28px/1.3 'DMSans';color:#3b4d78;margin:6px 0 26px">títulos de la interfaz</div>
        <div style="font:500 68px/1 'DMSans'">DM Sans</div><div style="font:400 24px/1.3 'DMSans';color:#3b4d78;margin-top:6px">texto</div></div></div>`,
  tw: [
    ...animCabecera(0.2, true, true),
    { s: '.sq', f: { opacity: 0, y: 50 }, t: { opacity: 1, y: 0 }, at: 1.3, d: 0.6, st: 0.3, e: 'back.out(1.4)' },
    { s: '.ty > div', f: { opacity: 0, x: 60 }, t: { opacity: 1, x: 0 }, at: 3.2, d: 0.6, st: 0.25 },
  ],
});
