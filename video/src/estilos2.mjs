// Estilos de las escenas con maquetas de la interfaz (se suman a estilos.mjs).
export const CSS2 = `
.win{position:absolute;background:#fff;border-radius:30px;box-shadow:0 30px 70px rgba(11,31,77,.28),0 4px 14px rgba(11,31,77,.12);overflow:hidden}
.t2{position:absolute;background:#fff;border-radius:26px;box-shadow:0 18px 44px rgba(11,31,77,.18);padding:20px}
.t2 h4{font:800 30px/1.1 "Bricolage";color:#0B1F4D;display:flex;align-items:center;gap:12px;margin-bottom:14px}
.t2 h4 i{flex:none;width:40px;height:40px;border-radius:50%;background:#FFB02E;font:800 24px/40px "Bricolage";text-align:center;font-style:normal}
.t2 svg.dib{display:block;border-radius:16px}
.lbl{font:700 25px/1 "DMSans";color:#0B1F4D;margin:0 0 12px}
.pills{display:flex;gap:12px;margin-bottom:26px}
.pill{position:relative;display:inline-flex;align-items:center;justify-content:center;min-width:96px;height:58px;padding:0 24px;border-radius:999px;background:#fff;color:#0B1F4D;font:600 27px/1 "DMSans";box-shadow:0 3px 12px rgba(11,31,77,.14)}
.pill .hi{position:absolute;inset:0;border-radius:999px;background:#1F5FE0;color:#fff;display:flex;align-items:center;justify-content:center;opacity:0}
.pill.ink .hi{background:#0B1F4D}
.tg{display:flex;align-items:center;justify-content:space-between;background:#EEF2F8;border-radius:20px;padding:14px 20px;margin-bottom:12px}
.tg b{display:block;font:700 26px/1.1 "DMSans"}.tg span.s{display:block;font:400 21px/1.25 "DMSans";color:#3b4d78;margin-top:3px}
.sw2{position:relative;flex:none;width:64px;height:36px;border-radius:999px;background:#B9C6E2}
.sw2 .on{position:absolute;inset:0;border-radius:999px;background:#1F5FE0;opacity:0}
.sw2 .kn{position:absolute;left:4px;top:4px;width:28px;height:28px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(11,31,77,.3)}
.btn2{display:inline-flex;align-items:center;gap:8px;height:64px;padding:0 20px;border-radius:999px;white-space:nowrap;font:700 24px/1 "DMSans";background:#fff;color:#0B1F4D;box-shadow:0 4px 14px rgba(11,31,77,.16)}
.btn2.pri{background:#1F5FE0;color:#fff}
.btn2 svg{width:28px;height:28px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.pvbox{background:#EEF2F8;border-radius:24px;padding:22px}
.hojab{background:#fff;border-radius:6px;box-shadow:0 8px 24px rgba(11,31,77,.2);overflow:hidden}
.ok2{display:inline-flex;align-items:center;gap:10px;background:#E3F5EA;color:#14693A;font:600 22px/1 "DMSans";border-radius:999px;padding:11px 20px}
.ok2 svg{width:24px;height:24px;stroke:#14693A;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.cap{font:400 22px/1.3 "DMSans";color:#3b4d78;margin-top:14px}
.capw{position:relative;height:30px}.capw span{position:absolute;left:0;right:0;top:0;text-align:center}
.arch{position:absolute;display:flex;align-items:center;gap:12px;background:#FFF4E2;border:2px dashed #FFB02E;border-radius:999px;padding:12px 22px;font:600 26px/1 "DMSans";color:#0B1F4D}
.arch svg{width:28px;height:28px;stroke:#1F5FE0;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.hjh{position:absolute;top:470px;width:400px}
.hjh .hojab{width:400px;height:283px;position:relative}
.hjh .hojab svg{width:400px;height:283px;display:block}
.hjh b{display:block;font:700 28px/1.15 "Bricolage";margin-top:18px}
.hjh span.c{display:block;font:400 23px/1.3 "DMSans";color:#3b4d78;margin-top:4px}
.iso{position:relative;width:400px;height:283px;overflow:hidden;background:#EEF2F8}
.iso img{position:absolute;width:760px;max-width:none}
.iso .cj{position:absolute;right:10px;bottom:10px;width:200px;background:#fff;border:2px solid #0B1F4D;font:700 13px/1.25 "DMSans";color:#0B1F4D;padding:6px 8px}
.chip svg{flex:none}
.iso .cj em{display:block;font:700 17px/1 "Fraunces";font-style:normal;margin-bottom:4px}
.iso .cj span{font-weight:400;color:#3b4d78}
.seg{position:absolute;right:24px;bottom:104px;display:flex;gap:4px;background:#fff;border-radius:999px;padding:4px;box-shadow:0 10px 30px rgba(11,31,77,.22),0 2px 8px rgba(11,31,77,.12)}
.seg .pill{box-shadow:none;height:50px;font-size:23px;min-width:0;padding:0 24px}
.fchip{position:absolute;left:24px;top:24px;display:flex;align-items:center;gap:12px;background:#fff;border-radius:999px;padding:12px 22px 12px 16px;font:700 24px/1 "DMSans";color:#0B1F4D;box-shadow:0 10px 30px rgba(11,31,77,.22)}
.fchip svg{width:28px;height:28px;stroke:#1F5FE0;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.cfil{position:relative}.cfil span{display:block}
.url{display:inline-flex;align-items:center;gap:14px;background:#fff;border-radius:999px;padding:16px 30px 16px 22px;font:700 32px/1 "DMSans";color:#0B1F4D;box-shadow:0 10px 30px rgba(11,31,77,.18)}
.url svg{width:34px;height:34px;stroke:#1F5FE0;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.url i{display:inline-block;width:16px;height:16px;border-radius:50%;background:#FFB02E;margin-left:6px}
.file svg{width:30px;height:30px;stroke:#1F5FE0;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
`;
