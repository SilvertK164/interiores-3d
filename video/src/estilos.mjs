// Hoja de estilos compartida por los dos videos (marca Madori: Noche, Cobalto, Sol, Cielo, Crema).
export const CSS = `
@font-face{font-family:"Fraunces";src:url("fonts/Fraunces-soft.woff2") format("woff2");font-weight:100 900;font-style:normal}
@font-face{font-family:"Bricolage";src:url("fonts/Bricolage-wght.woff2") format("woff2");font-weight:200 800;font-style:normal}
@font-face{font-family:"DMSans";src:url("fonts/DMSans-wght.woff2") format("woff2");font-weight:100 1000;font-style:normal}
*{margin:0;padding:0;box-sizing:border-box}
:root{--noche:#0B1F4D;--cobalto:#1F5FE0;--sol:#FFB02E;--cielo:#CFE0FF;--crema:#FFF4E2;--alba:#DCE6FF;--canvas:#EEF2F8}
html,body{width:1920px;height:1080px;overflow:hidden;background:#FFF4E2;font-family:"DMSans",sans-serif;color:var(--noche)}
.scene{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden;background:var(--bg);color:var(--fg)}
.bg-crema{--bg:#FFF4E2;--fg:#0B1F4D;--ac:#1F5FE0;--soft:#FFFFFF;--mut:#3b4d78}
.bg-cielo{--bg:#CFE0FF;--fg:#0B1F4D;--ac:#1F5FE0;--soft:#FFFFFF;--mut:#2c4276}
.bg-canvas{--bg:#EEF2F8;--fg:#0B1F4D;--ac:#1F5FE0;--soft:#FFFFFF;--mut:#3b4d78}
.bg-cobalto{--bg:#1F5FE0;--fg:#FFFFFF;--ac:#CFE0FF;--soft:#FFFFFF;--mut:#DCE6FF}
.kick{font:600 26px/1 "DMSans";letter-spacing:.14em;text-transform:uppercase;color:var(--ac);display:flex;align-items:center;gap:14px}
.kick i{display:inline-block;width:14px;height:14px;border-radius:50%;background:var(--sol)}
h2{font:800 66px/1.06 "Bricolage";letter-spacing:-.02em;margin-top:26px}
h2.xl{font-size:96px;line-height:1.04}
h2 .w{display:inline-block}
.sub{font:400 36px/1.38 "DMSans";color:var(--mut);margin-top:28px;max-width:100%}
.col{position:absolute;left:110px;top:0;height:1080px;width:620px;display:flex;flex-direction:column;justify-content:center}
.col.wide{width:1300px}
.chips{display:flex;flex-wrap:wrap;gap:14px;margin-top:36px}
.chip{display:flex;align-items:center;gap:12px;background:var(--soft);color:#0B1F4D;border-radius:999px;padding:12px 24px 12px 18px;font:600 26px/1 "DMSans";box-shadow:0 6px 18px rgba(11,31,77,.10)}
.chip svg,.ico svg{width:30px;height:30px;stroke:#1F5FE0;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.chip.soon{background:#FFF4E2;border:2px dashed #FFB02E}
.fr{position:absolute;left:770px;top:208px;width:1040px;height:650px}
.fr.crop{top:240px;height:586px}
.fr-in{position:absolute;inset:0;border-radius:28px;overflow:hidden;background:#fff;box-shadow:0 30px 70px rgba(11,31,77,.28),0 4px 14px rgba(11,31,77,.12)}
.fr-in img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:center top;transform-origin:50% 50%}
.fr.wide{left:110px;top:300px;width:1700px;height:700px}
.sun{position:absolute;border-radius:50%;background:var(--sol)}
.logo{font:700 150px/1 "Fraunces";font-variation-settings:"SOFT" 100;letter-spacing:-.02em;color:#0B1F4D;display:inline-block;white-space:nowrap}
.logo .lt{display:inline-block}
.logo .o{display:inline-block;height:calc(.468em + 1.7px);width:calc(.48em + 3px);margin:0 -.01em 0 .008em;vertical-align:-.014em}
.logo .o svg{width:100%;height:100%;display:block;overflow:visible}
.tiles{position:absolute;left:110px;right:110px;top:330px;display:flex;gap:30px}
.tile{flex:1;background:#fff;border-radius:26px;padding:14px 14px 22px;box-shadow:0 18px 44px rgba(11,31,77,.18)}
.tile img{display:block;width:100%;height:292px;object-fit:cover;border-radius:16px;background:#EEF2F8}
.tile b{display:block;font:700 30px/1.15 "Bricolage";margin:18px 8px 4px}
.tile span{display:block;font:400 24px/1.3 "DMSans";color:#3b4d78;margin:0 8px}
.rows{display:flex;flex-direction:column;gap:20px;margin-top:40px}
.row{display:flex;align-items:center;gap:26px;background:var(--soft);color:#0B1F4D;border-radius:24px;padding:22px 32px;box-shadow:0 8px 22px rgba(11,31,77,.10)}
.row .ico{flex:none;width:64px;height:64px;border-radius:18px;background:#DCE6FF;display:flex;align-items:center;justify-content:center}
.row b{font:700 34px/1.1 "Bricolage";display:block}
.row span{font:400 26px/1.3 "DMSans";color:#3b4d78;display:block;margin-top:4px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px 28px}
.stat{background:#fff;color:#0B1F4D;border-radius:30px;padding:34px 38px;box-shadow:0 14px 36px rgba(11,31,77,.14)}
.stat .n{font:800 110px/1 "Bricolage";letter-spacing:-.03em;color:#1F5FE0}
.stat .l{font:600 30px/1.2 "DMSans";margin-top:10px}
.stat .d{font:400 25px/1.3 "DMSans";color:#3b4d78;margin-top:6px}
.nota{position:absolute;left:110px;bottom:46px;font:400 24px/1.3 "DMSans";color:var(--mut);max-width:1500px}
.node{position:absolute;background:#fff;color:#0B1F4D;border-radius:26px;padding:18px 24px;box-shadow:0 14px 34px rgba(11,31,77,.16)}
.node small{display:block;font:600 19px/1 "DMSans";letter-spacing:.12em;text-transform:uppercase;color:#1F5FE0}
.node b{display:block;font:700 30px/1.12 "Bricolage";margin-top:8px}
.node span{display:block;font:400 22px/1.3 "DMSans";color:#3b4d78;margin-top:6px}
.node.in{background:#DCE6FF;box-shadow:none;padding:14px 22px;border-radius:18px}
.node.in b{font-size:29px;margin-top:2px}
.node.in span{font-size:21px}
.node.sb{background:#0B1F4D;color:#fff}
.node.sb span{color:#CFE0FF}.node.sb small{color:#FFB02E}
.lab{position:absolute;font:600 22px/1 "DMSans";color:#0B1F4D;background:#FFF4E2;border-radius:999px;padding:8px 16px;white-space:nowrap}
.step{position:absolute;background:#fff;color:#0B1F4D;border-radius:26px;padding:20px 22px;box-shadow:0 14px 34px rgba(11,31,77,.16)}
.step .num{width:46px;height:46px;border-radius:50%;background:#FFB02E;color:#0B1F4D;font:800 26px/46px "Bricolage";text-align:center}
.step b{display:block;font:700 34px/1.1 "Bricolage";margin-top:14px}
.step span{display:block;font:400 24px/1.3 "DMSans";color:#3b4d78;margin-top:6px}
.sw{display:flex;gap:20px;margin-top:40px}
.sw div{width:205px}
.sw i{display:block;height:170px;border-radius:22px;box-shadow:0 8px 20px rgba(11,31,77,.14)}
.sw b{display:block;font:700 32px/1 "Bricolage";margin-top:12px}
.sw span{display:block;font:400 24px/1.2 "DMSans";color:var(--mut);margin-top:4px}
.tag{display:inline-block;background:#FFB02E;color:#0B1F4D;font:700 24px/1 "DMSans";border-radius:999px;padding:10px 20px;letter-spacing:.04em}
.center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.names{font:700 52px/1.2 "Bricolage";margin-top:50px}
.names em{font-style:normal;color:#1F5FE0}
`;
