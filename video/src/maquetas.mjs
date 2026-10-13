// Dibujos de las maquetas (SVG plano, colores de la marca). No son capturas: reproducen la interfaz de Madori con sus textos reales.

// La "foto" de un ambiente, con los cuadros que dibuja el reconocimiento de muebles (clase "bx").
export function salaFoto() {
  const caja = (x, y, w, h, t, dx = 0, abajo = false) => {
    const ly = abajo ? y + h + 2 : y - 30;
    return `<g class="bx"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="rgba(31,95,224,.08)" stroke="#1F5FE0" stroke-width="4" stroke-dasharray="9 6"/>
    <rect x="${x + dx}" y="${ly}" width="${t.length * 9.4 + 22}" height="30" rx="15" fill="#1F5FE0"/>
    <text x="${x + dx + 11}" y="${ly + 21}" font-family="DMSans" font-weight="700" font-size="17" fill="#fff">${t}</text></g>`;
  };
  return `<svg viewBox="0 0 480 360" width="480" height="360" role="img" aria-label="Foto de una sala con cuatro muebles reconocidos">
    <rect width="480" height="360" fill="#F3E4CC"/>
    <rect y="252" width="480" height="108" fill="#D9B98A"/>
    <path d="M0 292H480M0 330H480M120 252L90 360M250 252V360M380 252L410 360" stroke="#C9A573" stroke-width="2"/>
    <rect x="296" y="40" width="140" height="118" rx="6" fill="#CFE0FF" stroke="#fff" stroke-width="9"/>
    <path d="M366 40V158M296 99H436" stroke="#fff" stroke-width="6"/>
    <g stroke="#0B1F4D" stroke-width="5" stroke-linecap="round"><path d="M284 100V252"/><path d="M262 252H306"/></g>
    <path d="M262 62H306L296 100H272Z" fill="#FFB02E"/>
    <rect x="56" y="158" width="188" height="64" rx="16" fill="#3F78EA"/>
    <rect x="38" y="190" width="224" height="66" rx="16" fill="#1F5FE0"/>
    <rect x="38" y="178" width="34" height="78" rx="12" fill="#1A52C7"/><rect x="228" y="178" width="34" height="78" rx="12" fill="#1A52C7"/>
    <rect x="84" y="196" width="68" height="40" rx="10" fill="#4A82EE"/><rect x="156" y="196" width="68" height="40" rx="10" fill="#4A82EE"/>
    <rect x="112" y="276" width="132" height="14" rx="5" fill="#8A5A32"/><path d="M124 290V316M232 290V316" stroke="#6B4423" stroke-width="7" stroke-linecap="round"/>
    <path d="M394 236L450 236L444 272H400Z" fill="#0B1F4D"/>
    <g fill="#3E9B6B"><ellipse cx="422" cy="206" rx="13" ry="30"/><ellipse cx="402" cy="218" rx="11" ry="24" transform="rotate(-24 402 218)"/><ellipse cx="444" cy="218" rx="11" ry="24" transform="rotate(24 444 218)"/></g>
    ${caja(30, 148, 240, 116, 'Sofá 94 %')}
    ${caja(258, 54, 56, 206, 'Lámpara 88 %')}
    ${caja(104, 268, 150, 56, 'Mesa de centro 81 %', 0, true)}
    ${caja(380, 172, 80, 106, 'Planta 76 %', -48)}
  </svg>`;
}

// El mismo ambiente armado en 3D: perspectiva con la cámara en el muro cercano, mirando al muro del fondo.
export function sala3d(ancho = 500) {
  const caja = (x, y, w, h, fr, sup, lat) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fr}"/><path d="M${x} ${y}L${x + w * 0.1} ${y - h * 0.22}H${x + w * 1.1}L${x + w} ${y}Z" fill="${sup}"/><path d="M${x + w} ${y}L${x + w * 1.1} ${y - h * 0.22}V${y + h * 0.78}L${x + w} ${y + h}Z" fill="${lat}"/>`;
  return `<svg viewBox="0 0 480 360" width="${ancho}" height="${(ancho * 360) / 480}" role="img" aria-label="Ambiente en 3D visto desde el muro cercano">
    <path d="M0 0H480V360H0Z" fill="#EEF2F8"/>
    <path d="M0 0H480L370 70H110Z" fill="#FFFFFF" stroke="#C9D3E6" stroke-width="2"/>
    <path d="M0 0L110 70V230L0 360Z" fill="#E8D9C0" stroke="#C9B896" stroke-width="2"/>
    <path d="M480 0L370 70V230L480 360Z" fill="#E0CFB3" stroke="#C9B896" stroke-width="2"/>
    <rect x="110" y="70" width="260" height="160" fill="#F3E4CC" stroke="#C9B896" stroke-width="2"/>
    <path d="M110 230H370L480 360H0Z" fill="#D9B98A" stroke="#C9A573" stroke-width="2"/>
    <path d="M240 230V360M175 230L120 360M305 230L360 360M0 360L110 230M480 360L370 230" stroke="#C9A573" stroke-width="1.5" fill="none"/>
    <rect x="246" y="98" width="90" height="74" rx="4" fill="#CFE0FF" stroke="#fff" stroke-width="7"/><path d="M291 98V172M246 135H336" stroke="#fff" stroke-width="4"/>
    <rect x="122" y="150" width="60" height="80" rx="3" fill="#fff" stroke="#8A5A32" stroke-width="3"/><circle cx="170" cy="192" r="3" fill="#8A5A32"/>
    ${caja(132, 236, 120, 36, '#1F5FE0', '#4A82EE', '#1A52C7')}
    <rect x="132" y="214" width="120" height="30" rx="4" fill="#3F78EA"/>
    <path d="M292 232V196" stroke="#0B1F4D" stroke-width="3"/><path d="M280 172H304L300 196H284Z" fill="#FFB02E"/>
    ${caja(176, 300, 90, 20, '#8A5A32', '#A87445', '#6B4423')}
    <path d="M338 262H366L362 286H342Z" fill="#0B1F4D"/><g fill="#3E9B6B"><ellipse cx="352" cy="244" rx="9" ry="20"/><ellipse cx="340" cy="252" rx="7" ry="16" transform="rotate(-24 340 252)"/><ellipse cx="364" cy="252" rx="7" ry="16" transform="rotate(24 364 252)"/></g>
  </svg>`;
}

// Vista desde arriba: el ambiente, la cámara en el muro cercano (círculo Sol) y su campo de visión de 60°.
export function cono() {
  return `<svg viewBox="0 0 300 260" width="300" height="260" role="img" aria-label="Cámara en el muro cercano con 60 grados de campo de visión">
    <rect x="30" y="20" width="240" height="190" fill="#FFF4E2" stroke="#0B1F4D" stroke-width="9" stroke-linejoin="round"/>
    <path class="cn" d="M150 196L60 40H240Z" fill="rgba(31,95,224,.22)" stroke="#1F5FE0" stroke-width="3" stroke-dasharray="8 6"/>
    <circle class="cm" cx="150" cy="196" r="14" fill="#FFB02E" stroke="#0B1F4D" stroke-width="4" style="transform-box:fill-box;transform-origin:50% 50%"/>
    <text x="150" y="246" text-anchor="middle" font-family="DMSans" font-weight="700" font-size="21" fill="#0B1F4D">1,5 m de altura · 60°</text>
  </svg>`;
}

// Plano de una vivienda dentro de la hoja. modo: 'papel' (solo negro) o 'color' (ambientes y muebles). Incluye norte, escala y cajetín.
export function planoHoja(id, escala = '1:50', hoja = 'Hoja 1 de 2', nivel = 'Planta baja') {
  const m = 'stroke="#0B1F4D" stroke-width="9" stroke-linejoin="miter" fill="none"';
  return `<svg viewBox="0 0 500 354" width="500" height="354" role="img" aria-label="Hoja de plano con cajetín">
    <rect width="500" height="354" fill="#fff"/>
    <g class="co">
      <rect x="62" y="74" width="176" height="176" fill="#CFE0FF"/><rect x="242" y="74" width="86" height="86" fill="#FFF4E2"/><rect x="242" y="164" width="86" height="86" fill="#DCE6FF"/>
      <rect x="82" y="196" width="78" height="34" rx="6" fill="#1F5FE0"/><rect x="170" y="100" width="46" height="46" rx="6" fill="#8A5A32"/><rect x="256" y="90" width="56" height="40" rx="6" fill="#FFB02E"/><rect x="258" y="190" width="30" height="46" rx="8" fill="#fff" stroke="#0B1F4D" stroke-width="2"/>
    </g>
    <path d="M62 74H328V250H62Z" ${m}/><path d="M238 74V250M238 164H328" ${m} stroke-width="6"/>
    <path d="M110 74H150M238 120V150M238 200V226" stroke="#fff" stroke-width="12"/>
    <path d="M62 52H328M62 46V58M328 46V58" stroke="#0B1F4D" stroke-width="1.5"/><text x="195" y="42" text-anchor="middle" font-family="DMSans" font-size="13" fill="#0B1F4D">6,00 m</text>
    <g transform="translate(396 62)"><path d="M0 34L10-4L20 34L10 26Z" fill="#0B1F4D"/><text x="10" y="-12" text-anchor="middle" font-family="DMSans" font-weight="700" font-size="14" fill="#0B1F4D">N</text></g>
    <g transform="translate(28 300)"><rect width="30" height="6" fill="#0B1F4D"/><rect x="30" width="30" height="6" fill="#fff" stroke="#0B1F4D" stroke-width="1.5"/><rect x="60" width="30" height="6" fill="#0B1F4D"/><text y="-6" font-family="DMSans" font-size="12" fill="#0B1F4D">0         1         2 m</text></g>
    <g transform="translate(288 258)"><rect width="196" height="80" fill="#fff" stroke="#0B1F4D" stroke-width="2"/><path d="M0 28H196M118 28V80" stroke="#0B1F4D" stroke-width="1.2"/>
      <text x="8" y="21" font-family="Fraunces" font-weight="700" font-size="19" fill="#0B1F4D">Madori</text>
      <text x="8" y="46" font-family="DMSans" font-weight="700" font-size="12" fill="#0B1F4D">Casa Alvear</text><text x="8" y="60" font-family="DMSans" font-size="11" fill="#0B1F4D">${nivel}</text><text x="8" y="74" font-family="DMSans" font-size="11" fill="#3b4d78">Silvert Quispe</text>
      <text x="124" y="19" font-family="DMSans" font-weight="700" font-size="11" fill="#0B1F4D">${escala === 'Sin escala' ? 'Sin escala' : 'Escala ' + escala}</text><text x="124" y="50" font-family="DMSans" font-size="11" fill="#0B1F4D">${hoja}</text><text x="124" y="70" font-family="DMSans" font-size="11" fill="#3b4d78">12 oct 2026</text></g>
  </svg>`;
}
