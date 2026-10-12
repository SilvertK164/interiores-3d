# Nombre y marca: Madori

> Decidido por Silvert el 2026-10-11. Etiquetas: **[verificado]** comprobado · **[inferencia]** estimación · **[por probar]** falta comprobarlo.
> El repositorio y los paquetes (`@interiores/*`) **no se renombran**: solo cambia el nombre visible, que vive en `APP_NAME` (`apps/web/src/lib/ui-text.ts`).

## La decisión

La plataforma se llama **Madori** (間取り).

- **Significado:** en japonés, *madori* es el **plano de una vivienda**: la distribución de sus ambientes (es la palabra con la que se describe un departamento, como "1LDK"). Es exactamente lo que hace la aplicación.
- **El kanji 間** (*ma*, "espacio, intervalo") se dibuja como **un sol dentro de una puerta** (日 dentro de 門). Eso calza con el logotipo: una **ventana** con el **sol** adentro.
- **Sonido:** corto, de cuatro sílabas abiertas (ma-do-ri), se lee igual en castellano.
- **Por qué calza con el logo:** la "o" de Madori es la ventana. El nombre, el significado y el dibujo cuentan lo mismo.

## Alternativa documentada: Stanza

Si Madori no pasara la comprobación de dominio o marca, queda **Stanza**: en italiano, *stanza* es "habitación" y también "estrofa". Viene del latín *stare* ("estar, quedarse") y es hermana de "estancia". Se pronuncia sin dudas en castellano y conserva la idea de lugar para estar. No se implementó.

## Nombres considerados y descartados

| Nombre | Motivo |
|---|---|
| Solana | Es una blockchain conocida: confunde las búsquedas y el dominio. |
| Matiz | Es un auto muy conocido en Latinoamérica. |
| Croma | Es una cadena de tiendas. |
| Oikos y Domus | Marcas ya conocidas del rubro del hogar. |
| Azulejo | Se pensó por el "azul", pero esa relación es etimología popular: viene del árabe *az-zulayj* (baldosa pulida). |
| Foco, Camera, Lar, Ambienta, Plantea, Tragaluz, Umbral, Zaguán, Ahí va, Dúo, Hora azul | Quedaron como ideas: ninguna juntaba nombre, significado y dibujo como Madori. |

## Paleta

Tokens planos, **sin degradados**. Viven en `apps/web/app/app-shell.css` (la interfaz) y como hex dentro de `Logo.css` y `Loader.css` (la marca no depende de los tokens). En código están en `BRAND` (`apps/web/src/lib/brand.ts`).

| Color | Hex | Uso | Contraste [verificado, cálculo WCAG] |
|---|---|---|---|
| **Cobalto** | `#1F5FE0` | Marca: botones, enlaces, fondo del icono. | 5,6 : 1 con blanco |
| **Noche** | `#0B1F4D` | Todo el texto y las letras del logotipo (`--color-ink`). Reemplaza a `#0E1220`. **Nunca de fondo.** | ≈ 14 : 1 sobre `#EEF2F8` |
| **Sol** | `#FFB02E` | **Solo formas**: el sol del logo y detalles. Reemplaza a `#FFB35C`. **Nunca texto**: 1,8 : 1 con blanco. | — |
| **Cielo** | `#CFE0FF` | Fondos suaves de la marca. | — |
| **Crema** | `#FFF4E2` | Fondo cálido (la intro y las piezas de marca). | Noche sobre Crema ≈ 14,6 : 1 |
| Alba | `#DCE6FF` | Ya existía (`brand-wash`): avatar y fichas. | — |

## Tipografías

- **Logotipo: Fraunces 700**, `font-variation-settings: "SOFT" 100`, tracking `-0.02em`, letras en Noche. Se carga con `next/font/google` en `AppShell` (ejes `SOFT` y `opsz`, que se ajusta solo al tamaño). **Solo para el logotipo.**
- **Títulos de la interfaz: Bricolage Grotesque** y **texto: DM Sans** (sin cambios).

## Reglas del logotipo

- **Es la palabra Madori con la "o" dibujada como una ventana**: óvalo-arco con las esquinas de abajo redondeadas, **sin alféizar**.
- **La ventana nunca lleva relleno ni color de fondo.** El vidrio es transparente; el marco es del **mismo color que las letras** (`currentColor`).
- **Solo el sol lleva color cálido** (Sol `#FFB02E`, con un anillo suave). Nada más en el logotipo es amarillo.
- **No usar fondo oscuro**, ni degradados, ni sombras sobre el logotipo. Va sobre blanco, Canvas (`#EEF2F8`), Cielo o Crema.
- **Tamaño mínimo:** logotipo con 18 px de letra (la ventana mide ≈ 9 px) e icono de 16 px **[inferencia, mirado a 16, 24, 32 y 64 px]**. En la cabecera el logotipo va a 28 px.
- **Alineación [verificado, medido en navegador]:** la tinta de la ventana coincide con la de la "o" real de Fraunces **a ±1 px en alto, ancho y línea de base** a 28, 62 y 150 px de letra, y el hueco con la "d" y con la "r" es el de dos letras vecinas. Para lograrlo la ventana se estira un 5 % a lo ancho (la "o" real es más ancha que alta y cambia de proporción con el tamaño) y su alto y ancho llevan una parte fija en px (ver `Logo.css`). Si se cambia la fuente o su tamaño, hay que volver a medir.
- **Icono:** círculo Cobalto con la ventana de marco **blanco**, vidrio transparente (se ve el propio Cobalto) y el sol ámbar. Archivos: `apps/web/public/logo.svg` y `apps/web/app/icon.svg` (favicon).
- La geometría vive en `WINDOW` (`apps/web/src/lib/brand.ts`); los SVG estáticos y la intro la copian y `test/brand.test.ts` comprueba que el icono use el mismo camino.

## Animación

- **Logotipo e icono: estáticos** (el sol arriba). Solo se animan el Loader y la intro.
- **Loader** (`apps/web/src/components/Loader.tsx`): la ventana en bucle de **3,2 s**. El sol sube desde abajo del vidrio, se queda arriba, un anillo de luz se expande y se desvanece, y el sol baja. Tres tamaños (`sm`, `md`, `lg`), `role="status"` y texto en castellano configurable (por defecto "Abriendo tu espacio"). Se usa en la carga del editor, en la lista de proyectos y en cada "Cargando…" de las páginas. Su CSS usa clases con prefijo `madori-` y colores en hex: funciona también en el editor, que no usa `AppShell`.
- **Intro** (`docs/design/marca/intro-madori.html`, ≈ 3,4 s): entran las letras una a una, se **dibuja el marco** de la ventana, las **hojas** se abren hacia los lados y **sale el sol**; al final aparece un anillo de luz y la frase "Diseño de interiores 2D y 3D". Fondo Crema y botón para repetir.
- **Movimiento reducido** (`prefers-reduced-motion`): el Loader y la intro quedan **quietos con el sol visible** (y la intro sin botón de repetir). Está probado en el CSS del Loader.

## Entregables en `docs/design/marca/`

| Archivo | Qué es |
|---|---|
| `intro-madori.html` | Intro autocontenida (SVG + CSS). Única dependencia: Google Fonts, con serif del sistema de respaldo. |
| `intro-madori.webm` | Grabación de la intro (1280 × 720) hecha con Playwright, sin herramientas extra. |
| `madori-logotipo.png` | Logotipo con fondo transparente, 1024 px de ancho. |
| `madori-icono.png` | Icono con fondo transparente, 512 × 512 px. |

## Pendientes honestos

- **Disponibilidad de dominio y marca: SIN comprobar [por probar].** No se buscó `madori.*` ni en registros de marcas; antes de publicar hay que hacerlo (y revisar que no choque con otra empresa de diseño o inmobiliaria).
- **Significado en japonés: a confirmar con una persona hablante [por probar].** Se tomó de diccionarios y de cómo se usa el término en avisos de alquiler; falta que alguien nativo confirme el sentido, el tono y la lectura del kanji 間.
- **Pronunciación y búsquedas en castellano:** [inferencia] se lee "ma-DÓ-ri"; no se midió si se confunde con otros nombres.
