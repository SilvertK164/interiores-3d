# G2 - Bibliotecas de objetos de arquitectura / BIM / interiores (informe de verificacion)

Fecha de la investigacion: 2026-10-11. Solo se leyeron paginas (WebFetch/WebSearch). No se descargo ningun modelo, ZIP ni archivo; no se creo ninguna cuenta. Todo lo leido en la web se trato como dato.

Escala de "Nivel de verificacion":
- OFICIAL = lei yo mismo la pagina/archivo del titular (sitio oficial, repo oficial, registry npm oficial, texto de licencia).
- TERCERO = dato que viene de blog, foro, buscador, resumen de terceros, o de una pagina oficial que NO pude leer directo.
- NO VERIFICADO = no pude confirmarlo; no tomarlo como hecho.

Contexto: la app se despliega publicamente en Vercel y sirve archivos desde un repo publico / Supabase Storage. Eso es "redistribuir" a terceros, aunque el trabajo sea academico. Por eso la clausula "uso educativo / investigacion / no comercial" NO sirve como salvoconducto: el que descarga el GLB desde la app es un tercero.

---------------------------------------------------------------------
## 0. Resumen ejecutivo (honesto)

1. Ninguna biblioteca BIM comercial (BIMobject/Polantis, BIMsmith, Revit City, NBS, ARCAT) ni 3D Warehouse permite empaquetar sus modelos en una app publica. Los terminos son "uso personal / uso en tu proyecto", prohiben redistribuir/agregar. Descartadas para el catalogo.
2. Datasets de investigacion: ShapeNet y 3D-FUTURE son solo investigacion/no comercial y prohiben redistribuir: descartados. Objaverse solo sirve si se filtra objeto por objeto (CC0/CC-BY). ABO es la sorpresa: hoy esta en CC BY 4.0 (cambio de licencia en 2023, antes era NC) con ~7.9 mil modelos GLB con PBR, pero pesados y de productos de marca.
3. Las fuentes realmente utiles y limpias: (a) Sweet Home 3D (bibliotecas con licencia por biblioteca: CC-BY, CC0, Free Art), (b) Poly Haven (CC0, 85 modelos de mobiliario), (c) los nodos parametricos NATIVOS de Pascal (shelf, cabinet, door, window, curtain wall, procedural-item) y @pascal-app/geometry-script (MIT) para generar piezas propias sin ningun problema de licencia.
4. Para COMERCIOS no existe un set libre listo de mostradores/gondolas/cajas/vitrinas con licencia clara. Lo mejor es generar con Pascal (shelf = gondola/estanteria, cabinet con encimera = mostrador, curtain wall = vidriera/escaparate, geometry-script = lo demas) y complementar con Poly Haven (estanterias metalicas, carrito de cafe, taburetes, mesas).

---------------------------------------------------------------------
## 1. Sweet Home 3D (sweethome3d.com)

URLs oficiales consultadas:
- https://www.sweethome3d.com/license.jsp
- https://www.sweethome3d.com/freeModels.jsp
- https://www.sweethome3d.com/import-models/  (tabla de bibliotecas con licencia y cantidad)
- https://www.sweethome3d.com/importModels.jsp
- https://www.sweethome3d.com/download.jsp
- https://sourceforge.net/projects/sweethome3d/files/SweetHome3D-models/ (32 carpetas "3DModels-x.y"; ultima 1.9.3, 2024-08-21)
- Foro oficial (hilo 10825): https://www.sweethome3d.com/support/forum/viewthread_thread,10825

### 1.1 Catalogo por defecto
- Licencia (license.jsp, OFICIAL): "3D models and textures available in the catalogs of the free version are distributed under GNU GPL or CC-BY License." La pagina dice que se pueden "use and redistribute the 3D models and the textures available in the default catalogs" para uso personal o comercial, y que "If you include some of these 3D models and textures in your documents, you should attribute the author of the ones that are distributed under Free Art License or CC-BY License." El usuario elige GPL o CC-BY: elegir CC-BY (la GPL sobre assets es ambigua).
- Titularidad: una respuesta del desarrollador (foro) cita que desde la v6.0 reemplazo 24 modelos aportados bajo LAL por modelos propios en GPL/CC-BY y que eTeks es el unico titular. Y confirma (19-feb-2021) que CC-BY 3.0 / GPL aplican tambien a las texturas por defecto. Nivel: OFICIAL (foro del proyecto; el detalle v6.0 lo vi resumido por el buscador, la cita de texturas la lei directo).
- Cantidad (download.jsp, OFICIAL): instalador gratuito Windows "100 pieces of furniture and 26 textures"; macOS gratuito "929 pieces of furniture and 26 textures"; versiones de pago: 10,836 (Windows Store) / 10,894 (Mac App Store) piezas. (Esa diferencia 100 vs 929 es lo que dice la pagina; no la pude explicar.) OJO: de las ~10 mil piezas del paquete completo, import-models/ dice "Included library: Over 10,000 models and 400 textures ... No license stated" -> NO usar ese paquete masivo para redistribuir.
- Calidad: residencial generico; puertas, ventanas, banos, cocinas y muebles son el uso clasico de la app (NO VERIFICADO el listado exacto del catalogo por defecto en esta sesion).

### 1.2 Bibliotecas adicionales (import-models/, OFICIAL; cantidades y licencias tal cual la tabla oficial)
| Biblioteca | Modelos | Licencia |
|---|---|---|
| Contributions 1.9.3 | 511 | Free Art License |
| LucaPresidente 1.9.3 | 64 | Free Art License |
| Trees 1.9.3 | 10 | Free Art License |
| Scopia 1.9.3 | 500 | CC-BY (freeModels.jsp: Creative Commons Attribution 3.0 Unported; credito solo al redistribuir) |
| KatorLegaz 1.9.3 | 90 | CC-BY |
| BlendSwap CC-0 1.9.3 | 175 | Dominio publico (CC0) |
| BlendSwap CC-BY 1.9.3 | 135 | CC-BY |
| Reallusion 1.9.3 | 25 (personas) | CC-BY |

Total util aprox. 1,500 modelos (la pagina freeModels.jsp habla de "1602 ZIP files" y 585 aportes de la comunidad bajo Free Art License; texto: "use them, modify them or even redistribute them, as long as you respect their Free Art license or Creative Commons Attribution license").

Licencia Free Art License 1.3 (artlibre.org, OFICIAL): es copyleft. Si distribuis copias modificadas, debes "distribute the subsequent work under the same license or any compatible license"; hay que incluir la licencia, nombrar autores y decir donde esta el original; no se puede sublicenciar (Sec. 10); incumplir pierde los derechos (Sec. 8). Convertir OBJ a GLB cuenta como modificacion/obra derivada: tendrias que publicar el GLB bajo FAL y dar credito. Es posible pero genera obligaciones; preferir CC0/CC-BY.

Excluir (license.jsp, OFICIAL): "3D models available at Archibit are distributed under the Creative Commons BY-NC-SA license which forbids to use a work for commercial purposes." Tampoco los modelos de 3D Warehouse: la misma pagina dice que los terminos "forbid to aggregate any content obtained from the Site for redistribution".

### 1.3 Formato y conversion
- Importa OBJ, DAE (Collada), KMZ y 3DS (importModels.jsp). Un .sh3f es un archivo que agrupa varios modelos con sus descripciones; se crea con el Furniture Library Editor. Internamente es un ZIP (TERCERO: foro/ayuda de terceros; la descarga oficial de freeModels es ZIP con "OBJ + MTL (Wavefront) format").
- Conversion a GLB con herramientas libres:
  - Blender (OBJ/DAE -> glTF 2.0/GLB): el addon glTF viene activado y exporta GLB (manual de Blender, resumido por buscador: TERCERO).
  - obj2gltf (CesiumGS, Apache-2.0, OFICIAL en GitHub): `obj2gltf -i model.obj -o model.glb` / flag `-b`.
  - assimp (BSD de 3 clausulas): importa OBJ, DAE, 3DS (Fileformats.md, OFICIAL); su lista de exportacion dice "glTF 2.0 (partial)" y no lista GLB explicitamente -> usar con cuidado.
  - gltf-transform (MIT): optimiza/comprime GLB (draco, meshopt, KTX2, resize de texturas); NO importa OBJ (la pagina solo habla de glTF/GLB).
- Redistribuible en repo publico/Supabase: SI para CC0 y CC-BY (con archivo de creditos por modelo); SI con obligaciones (copyleft) para Free Art License; NO para Archibit (NC-SA) ni modelos de 3D Warehouse.

### 1.4 Riesgos
- Licencia heterogenea por biblioteca (y por modelo dentro de "Contributions": cada modelo tiene su autor). Hay que llevar un CREDITS.json por modelo.
- Escalas/orientaciones/pivotes distintos (cm, eje Y), materiales MTL con texturas pesadas; hay que normalizar.
- No encontre una biblioteca especifica de mobiliario comercial (mostradores, gondolas, cajas): la busqueda no mostro ninguna (NO VERIFICADO que no exista dentro de las 1,500 piezas).
- Calidad "de comunidad": variable y estetica algo anticuada (NO VERIFICADO visualmente).

Nivel de verificacion: OFICIAL (licencias, cantidades, formatos). Calidad visual: NO VERIFICADO.

---------------------------------------------------------------------
## 2. Trimble / SketchUp 3D Warehouse

URLs: https://embed-3dwarehouse-classic.sketchup.com/tos/ (Terms of Use, "last updated April 1, 2017"; General Model License, "March 18, 2015"); https://help.sketchup.com/en/3d-warehouse/3d-warehouse-terms-use-faq; https://help.sketchup.com/en/3d-warehouse/understanding-terms-use. (La pagina https://3dwarehouse.sketchup.com/tos solo devolvio el titulo y sketchup.trimble.com/.../terms devolvio "Page Not Found": la version que lei puede estar desactualizada; las paginas de ayuda llevan fecha 2026.)

Terminos exactos (OFICIAL, texto leido):
- Terms of Use Sec. 10: no se puede "Modify 3D Warehouse Materials" (salvo contenido propio), ni "Redistribute or transfer 3D Warehouse Materials to another person except as expressly authorized", ni scraping.
- General Model License Sec. 1 (usos autorizados): crear obras derivadas; "Incorporating or including Models and Creations into a larger work or a deliverable for a third party" siempre que la obra combinada tenga "substantial additional content"; "Distributing Models, Creations, and Combined Works to third parties for your business purposes".
- GML Sec. 2 (restricciones): no se puede "sell, offer to sell, make or distribute any individual Model on a standalone basis"; no usarlos de forma que compita con 3D Warehouse; no "aggregate any content (including Models) obtained from 3D Warehouse for redistribution".
- FAQ oficial: se pueden usar para poblar escenas de construccion y vender disenos "as long as the models ... are not transferred or sold as stand-alone items"; sitio web de miembros = "impermissible aggregation"; publicacion de investigacion = agregacion que requiere aprobacion de cada desarrollador; logos de empresas: "No". El desarrollador conserva sus derechos de propiedad intelectual.
- Uso fuera de SketchUp: los documentos NO lo tratan explicitamente (solo dicen que se necesita "software that is compatible with the Model"); cualquier uso no autorizado expresamente requiere consentimiento escrito de Trimble.

Formato: SKP (y KMZ/Collada para descarga desde otras apps; Sweet Home 3D dice que requiere iniciar sesion con Trimble ID). Convertible a GLB tecnicamente (DAE/KMZ -> Blender/assimp), pero legalmente no.
Redistribuible en repo publico/Supabase: NO. Servir modelos a usuarios de una app/catalogo es "aggregate ... for redistribution" y "distribute individual Model on a standalone basis". Ademas muchos modelos son de marcas con logos.
Cantidad/calidad: millones; calidad muy variable.
Riesgo: ALTO / bloqueante.
Nivel de verificacion: OFICIAL (texto de ToU y GML y FAQ), con la salvedad de la fecha (2015/2017).

---------------------------------------------------------------------
## 3. Bibliotecas BIM comerciales

### 3.1 BIMobject (hoy bim.com)
URL: https://business.bimobject.com/terms-of-service-eula (EULA vigente desde 2024-09-27). bimobject.com/en/terms-of-use devolvio 403.
- Sec. 4.1: "access to and use of certain basic Services is currently provided free of charge" (puede cambiar con aviso). Sec. 12.2: contenido "free of charge", "as is".
- Sec. 4.4(b): el contenido descargado se puede usar "solely for your own personal use (and not for any commercial purposes or to make a profit)". Sec. 4.4(c): arquitectos/ingenieros pueden usarlo "for inclusion in any drawing, material(s) or project documents used or intended to be used in a construction".
- Sec. 4.7(f)-(g): prohibido "distribute, sell, sublicense, transfer ..." e "incorporate any Services into a product or service you provide to a third party". Sec. 8.1: sin derechos de modificacion/derivados; Sec. 4.7(j): prohibido usar el contenido para entrenar IA.
- Formatos: segun fuentes de terceros incluye IFC, 3DS, CAD, PDF (TERCERO); GLB NO VERIFICADO.
- Mobiliario generico: se menciona "generic objects" (TERCERO); la mayoria es de marcas.
- Convertible: tecnicamente si, legalmente no.
Redistribuible: NO. Riesgo: bloqueante. Nivel: OFICIAL (EULA).

### 3.2 Polantis
- polantis.com redirige a https://www.bimobject.com/ (302, OFICIAL observado). BIMobject adquirio Polantis (anuncio 2019-03-29; TERCERO: prensa; ~14.7 mil objetos y 150 fabricantes en ese momento).
- No pude leer terminos propios de Polantis (la URL de terminos tambien redirige a bimobject.com). Gratis con registro y limite diario de descargas (TERCERO, SketchUcation; puede estar desactualizado). Formatos: Revit, IFC, SKP, OBJ, etc. (TERCERO; una pagina de un fabricante lista .ifc, .rfa, .3dm...).
- Mobiliario de marcas (fabricantes). Redistribuible: NO (se rige por EULA de BIMobject). Nivel: NO VERIFICADO (terminos), TERCERO (resto).

### 3.3 BIMsmith (Market)
URL: https://bimsmith.com/legal/terms-and-conditions
- Es una licencia de uso del software/sitio: Sec. 1.01 "non-exclusive, nontransferable non-sublicensable license to use the BIMsmith software via the BIMsmith Site"; Sec. 1.03 prohibe "transmit, distribute, rent, lease, sell, give away, export modify, alter ..." el sitio o sus partes; Sec. 1.02 "content is provided by manufacturers"; Sec. 2.01 lo que genera el licenciatario es suyo. No trata el uso comercial ni la redistribucion de las familias. Hace referencia a "License Fee" (los terminos no dicen si descargar es gratis; el marketing propio dice "completely free for building professionals": TERCERO/marketing).
- Formatos: principalmente Revit (RFA/plugin); SketchUp/IFC NO VERIFICADO.
- Mobiliario: contenido de fabricantes (productos de construccion principalmente). Redistribuible: NO (y terminos de cada fabricante pueden ser mas estrictos). Nivel: OFICIAL (terminos del sitio, sin clausula sobre el contenido) / NO VERIFICADO (terminos del contenido).

### 3.4 Revit City
URL: https://www.revitcity.com/tos.php
- Familias aportadas por usuarios (cuenta gratuita necesaria: TERCERO). Sec. 8: RevitCity no reclama la propiedad del contenido enviado; el autor le concede una licencia perpetua sublicenciable. No hay licencia para quien descarga. Sec. 10: no "reproduce, duplicate, copy, sell, resell or exploit for any commercial purposes any portion of the Service". Sec. 6: descargas "at your own discretion and risk".
- Formato: RFA (propietario de Revit). NO hay conversor libre fiable RFA->GLB (requiere Revit). 
- Redistribuible: NO. Nivel: OFICIAL (ToS). Riesgo: bloqueante.

### 3.5 NBS National BIM Library (ahora dentro de NBS Source)
URLs: https://source.thenbs.com/en-us/gb/bimlibrary ; https://www.thenbs.com/legal/nbs-id-licence-agreement
- Pagina oficial (OFICIAL): "All are free to download and use in your projects." Objetos genericos y de fabricantes; la pagina oficial solo nombra Revit (familias y plantillas). IFC: lo dicen fabricantes y un foro (TERCERO), no la pagina oficial. Cantidad: "tens of thousands" de familias Revit (TERCERO via buscador); la pagina no da cifra.
- Los objetos genericos (los creados por expertos NBS) son lo mas parecido a "mobiliario generico", pero el unico texto de licencia que encontre es el NBS ID Licence Agreement (OFICIAL): licencia no exclusiva e intransferible (1.4); "The Licensee may not reproduce in any form, any part of the Products or Services or the Content" (2.1); no "licence, sell, rent, lease, transfer, assign, distribute, display, disclose or otherwise commercially exploit" (2.2.5); no "copy, modify, duplicate, create derivative works from ... republish, download" (2.2.2) sin permiso escrito. NO pude confirmar si ese acuerdo rige las descargas gratuitas (esta redactado para clientes de pago).
- Conclusion: "gratis para usar en tus proyectos" != redistribuir como parte de una app. Redistribuible: NO (o pedir permiso escrito a NBS). Nivel: OFICIAL (pagina) + TERCERO (formatos) + NO VERIFICADO (licencia de descarga gratuita).

### 3.6 ARCAT
URLs: https://arcat.com/terms y https://www.arcat.com/search/furniture/bim devolvieron 403 a mi lector.
- Solo tengo extractos de buscador (TERCERO): contenido BIM/CAD gratis en RFA/RVT, SKP, DWG/IFC; las paginas de descarga dicen "by downloading and using any ARCAT content you agree to the following license agreement"; los ToU dicen que todos los materiales/productos son propiedad con copyright de ARCAT y que el usuario "is permitted to view and download material from Website as long as the use of such materi..." (texto cortado). Contenido de fabricantes (con marca), orientado a EE.UU.
- Redistribuible: NO VERIFICADO (muy probablemente no). Nivel: NO VERIFICADO.

Conclusion de la seccion 3: gratis para descargar, SI; reutilizable/redistribuible dentro de tu app, NO. Su valor real es como referencia de dimensiones.

---------------------------------------------------------------------
## 4. IFC abiertos y compatibilidad con Pascal

### 4.1 Lo que importa Pascal (OFICIAL)
Fuente: registro npm https://registry.npmjs.org/@pascal-app/ifc-converter (version latest 1.0.3, publicada 2026-09-24; licencia MIT; depende de web-ifc ^0.0.77 y @pascal-app/core ^1.0.3; "IFC -> Pascal scene-graph conversion. Pure logic - no DOM, no React.").
- Nodos nativos (cuando se recuperan los parametros): sites, buildings, levels, walls, doors, windows, slabs, columns, e IfcSpace -> zonas.
- IFCBEAM/IFCBEAMSTANDARDCASE -> nodos `block`; escaleras -> mallas exactas.
- "Railings, coverings, furnishings, proxies, curtain walls, plates, members, footings" y todo lo que no se pueda parametrizar -> `imported-mesh` (conservan triangulos y color). Los "furnishings" caen aqui: "seleccionables pero solo-importacion, no aparecen en la paleta del editor".
=> Consecuencia: importar un IFC con IfcFurniture trae el mueble como malla estatica seleccionable, NO como item de catalogo colocable/pintable. Para tener catalogo hay que convertir a GLB (IfcConvert) y registrarlo como item.

### 4.2 IfcConvert -> GLB
Docs de IfcOpenShell (OFICIAL, https://docs.ifcopenshell.org/ifcconvert/usage.html): IfcConvert soporta salida ".glb  glTF  Binary glTF v2.0" (ademas de obj, dae, stp, igs, xml, svg, ifc, json, rdb, ttl). Licencia de IfcOpenShell: LGPL-3.0-or-later (README del repo, OFICIAL); Bonsai: GPL-3.0-or-later.

### 4.3 buildingSMART Sample-Test-Files
URL: https://github.com/buildingSMART/Sample-Test-Files (LICENSE leida, OFICIAL): "(C) buildingSMART International Ltd. This work is licensed under the Creative Commons Attribution 4.0 International License."
- Contenido (README): "simple models and files used for educational, implementation and certification purposes". Carpetas IFC 2x3, IFC4, IFC4.3 con "Simple-Scene" e "ISO Spec - ReferenceView_V1.2". En los listados que pude ver no hay muebles (solo vi parte; "View all files").
- Valor para el proyecto: pruebas del importador IFC, no catalogo. Redistribuible (CC BY). Nivel: OFICIAL.

### 4.4 Biblioteca de objetos de Bonsai/IfcOpenShell ("IFC4 Furniture Library.ifc")
URL (carpeta, OFICIAL): https://github.com/IfcOpenShell/IfcOpenShell/tree/v0.8.0/src/bonsai/bonsai/bim/data/libraries
Archivos: IFC2X3 Demo Library, IFC4 Demo Library, IFC4X3 Demo Library, IFC4 AU/EU/US Steel, IFC4 Entourage Library, IFC4 Furniture Library, IFC4 Landscape Library.
- Lei el archivo "IFC4 Furniture Library.ifc" (~735 KB de texto) via raw.githubusercontent: proyecto "Non-structural assets library", IFC4, unidades mm, generado con IfcOpenShell (diciembre 2024).
- Contenido (nombres de IfcFurnitureType/etc. que vi; la lista puede ser incompleta): camas (cuna, single, long single, king single, double, queen, king, super king), roperos (ADG Main Bedroom Wardrobe, Neufert Single Person Wardrobe), mesas de luz (Generic Large/Medium/Small Bedside Table), mesas ratonas, "Neufert Retail Dining Chair", "Neufert Retail Bar Stool", mesas COMERCIALES/restaurante (Retail 2/4/6/8/12-Seater rectangulares y 2,3,4,5,6,...,14-Seater circulares), mesas residenciales de 4 plazas, escritorios (Commercial Writing Desk and Chair, Commercial Office Desk and Chair), bancos y alacenas de cocina (Small/Medium/Large Kitchen Bench; Full Height Cupboard; islas), electrodomesticos (IfcElectricApplianceType: lavavajillas, 3 hornallas, lavarropas, secadora, "Fridge Zone"), piletas (IfcSanitaryTerminalType: Sink 86x44, 110x44, 124x44, Generic Small/Medium/Large) y 36 tipos de plazas de estacionamiento (IfcSpaceType). Del orden de ~100 tipos.
- Geometria: IfcExtrudedAreaSolid con perfiles cerrados + curvas 2D de planta (IfcIndexedPolyCurve). Es decir son volumenes extruidos esquematicos tipo "caja" con dimensiones Neufert/AU, no muebles fotorealistas. Sin IfcDoorType/IfcLightFixtureType en lo leido.
- "IFC4 Entourage Library.ifc" (IFC4, marzo 2024): figuras humanas como IfcBuildingElementProxyType con malla teselada (IfcPolygonalFaceSet) ("Man Standing with Turban", "Woman Dancing"...).
- Licencia: el archivo no trae licencia propia (autor "Nobody"); vive en un repo con LGPL-3.0 (IfcOpenShell) y Bonsai GPL-3.0-or-later. Presumiblemente hereda GPL (NO VERIFICADO el texto especifico para estos archivos). Si se convierten a GLB y se sirven, tratarlos como datos GPL-3: poner aviso y atribucion, y mantenerlos separados del codigo MIT; o consultar a los mantenedores.
- Convertible a GLB: IfcConvert (OFICIAL). Pascal: los IfcFurniture quedarian como imported-mesh; mejor pasar por GLB.
- Valor: dimensiones reales (Neufert) y clases IFC correctas para mesas de restaurante/cafe y escritorios de oficina; poca calidad visual. Nivel: OFICIAL (existencia, contenido, formato); licencia especifica NO VERIFICADO.

### 4.5 Otras fuentes IFC
- Steptools lista "Tabel_Chairs.ifc" (IFC4, Autodesk, ~716 KB) y apunta al Open IFC Model Repository de la Univ. de Auckland: licencia no indicada (TERCERO). El sitio de Auckland (openifcmodel.cs.auckland.ac.nz) solo me devolvio el titulo: NO VERIFICADO.
- "150 free IFC files" (blender3darchitect.com, blog): "most of the models have a creative commons license ... commercial projects with a credit"; no nombra autores ni licencias por archivo; no menciona muebles (TERCERO / NO VERIFICADO).
- BIMcollab ZOOM example project: 9 IFC de un mismo edificio (disciplinas), sin licencia encontrada; no es mobiliario (TERCERO / NO VERIFICADO).
- Hilo de OSArch "open / free Ifc repository for building components" (https://community.osarch.org/discussion/685, TERCERO): lista repos con IFC (NBS, Hilti, BIM&Co, MEP Content, Bimetica, BCB-online...) sobre todo MEP/construccion; ninguno de muebles; Herman Miller y Steelcase solo RFA/SKP/DWG; varios exigen registro o limitan el uso para evitar duplicacion masiva.
- Conclusion: no existe (que yo haya podido verificar) una libreria IFC de mobiliario generico con licencia abierta explicita, salvo la de Bonsai/IfcOpenShell (en repo GPL/LGPL).

---------------------------------------------------------------------
## 5. Datasets academicos

### 5.1 3D-FUTURE (Alibaba/Taobao)
URL del contrato (OFICIAL): https://terms.aliyun.com/legal-agreement/terms/suit_bu1_ali_cloud/suit_bu1_ali_cloud202004171628_60052.html ("3D-FUTURE Data Sets Use License Agreement"). La pagina de Tianchi devolvio 404.
- Sec. 3.2: licencia "[worldwide], revocable, non-exclusive, non-transferable and royalty-free" limitada "for scientific research purpose only" (descargar, reproducir, uso interno, modificar, obras derivadas).
- Sec. 3.3: "You shall not commercialize the data sets"; "You shall not distribute, disseminate or otherwise make available the data sets to any third party"; no usar datasets, derivados ni resultados "for commercialization or providing external services"; hay que citar la fuente; no quitar la licencia ni los avisos de copyright; no demandar a Taobao.
- Cantidad/calidad (arXiv 2009.09633, OFICIAL del paper): 9,992 instancias 3D de mobiliario con texturas de alta resolucion, modelos CAD industriales (de calidad alta).
- Uso aqui: NO. Una app publica en Vercel es "make available to any third party" y "providing external services". Aunque el trabajo sea academico. Riesgo: bloqueante/legal.
Nivel: OFICIAL.

### 5.2 ABO (Amazon Berkeley Objects)
URL oficial: https://amazon-berkeley-objects.s3.amazonaws.com/index.html (OFICIAL).
- Licencia ACTUAL (OFICIAL): "This work is licensed under the Creative Commons Attribution 4.0 International Public License (CC BY 4.0)"; condiciones: Attribution (credito, enlace a la licencia, indicar cambios) y "No additional restrictions". Copia de la licencia en el archivo (LICENSE-CC-BY-4.0.txt, que NO descargue). Se debe dar credito a "Amazon.com" por los datos "including all images and 3D models" y citar el paper CVPR 2022.
- Historial: eso cambio en 2023. El registro de datos abiertos de AWS lista hoy CC BY 4.0 (OFICIAL: https://registry.opendata.aws/amazon-berkeley-objects/); su PR #3339 (fusionado 2026-09-22) dice "The license was changed from CC BY-NC to CC BY in 2023" (OFICIAL). La autora, Jasmine Collins, lo anuncio en X ("dropped the commercial use restrictions", TERCERO). Pero el paper CVPR 2022, el blog de Amazon Science y resultados de buscador siguen diciendo CC BY-NC 4.0: son versiones viejas. Si alguien cita NC, esta desactualizado.
- Contenido: 147,702 productos (576 tipos); "more than 7,900 products have high-quality 3D models with 4K texture maps" (7,953 en el paper), glTF 2.0 (.glb), PBR (base color, metallic, roughness). Segun el paper son modelos creados por artistas ("artist-created"). Categorias de los 3D: ~63 (TERCERO, alphaxiv); incluyen sillas, sofas, mesas, lamparas, gabinetes, bancos (TERCERO, benchmarks del paper); no pude obtener el conteo por categoria.
- Archivos: abo-3dmodels.tar = 154 GB; abo-listings.tar = 83 MB; la pagina muestra descarga individual de un GLB de ejemplo de 44 MB. El bucket S3 es publico (s3://amazon-berkeley-objects/) asi que se podrian tomar modelos sueltos sin bajar 154 GB (inferido, NO VERIFICADO el esquema de rutas por modelo).
- Convertible: ya es GLB; hay que optimizar muchisimo con gltf-transform (reducir texturas de 4K a 1K/2K, WebP/KTX2, meshopt, simplify) para web.
- Redistribuible en repo/Supabase: SI con atribucion (CC BY 4.0). Riesgos: (1) archivos enormes; (2) son productos reales de marcas con posibles logos/diseno protegido: CC BY cubre el derecho de autor del dataset, no marcas ni derechos de diseno de terceros (razonamiento general, no asesoria legal; los metadatos traen "brand"); (3) hay que verificar el LICENSE dentro del archivo; (4) mayormente residencial (no mobiliario comercial).
Nivel: OFICIAL (licencia, formatos, conteos); TERCERO (categorias).

### 5.3 ShapeNet
URL oficial: shapenet.org/terms redirige a https://huggingface.co/ShapeNet (OFICIAL, organizacion de ShapeNet en HF; el acceso esta bloqueado/"gated").
- README del repo (HF, OFICIAL): licencia "other"; terminos: "Researcher shall use the Database only for non-commercial research and educational purposes."; "You are only allowed to redistribute the data to your research associates and colleagues"; el acceso se aprueba caso por caso; hay que marcar "I agree to use this dataset for non-commercial use ONLY"; si el usuario trabaja para una empresa con fines de lucro, esta tambien queda obligada; pueden terminar el acceso en cualquier momento.
- Buscador (TERCERO): el usuario asume el riesgo de copyright y debe indemnizar a Princeton/Stanford; los modelos individuales provienen de repositorios en linea y pueden tener copyright propio de sus autores (NO VERIFICADO).
- Uso aqui: NO (no comercial + prohibe redistribuir + requiere pedir acceso). Riesgo: bloqueante. Nivel: OFICIAL.

### 5.4 Objaverse y Objaverse-XL
URLs (OFICIAL): https://huggingface.co/datasets/allenai/objaverse ; https://huggingface.co/datasets/allenai/objaverse-xl ; https://github.com/allenai/objaverse-xl
- Objaverse 1.0: "The use of the dataset as a whole is licensed under the ODC-By v1.0 license." "Individual objects in Objaverse are all licensed as creative commons distributable objects": CC-BY 4.0 (~721K), CC-BY-NC 4.0 (25K), CC-BY-NC-SA 4.0 (52K), CC-BY-SA 4.0 (16K), CC0 1.0 (3.5K); "The metadata will provide the license for each object." 800K+ objetos, 8.9 TB. La pagina no dice nada sobre uso comercial ni sobre atribucion practica.
- Objaverse-XL: 10,850,997 filas (>10 M); "Individual objects in Objaverse-XL are licensed under different licenses" (42 valores distintos, p. ej. MIT y GPL-3.0 para los de GitHub); los datos de Polycam solo "to academic researchers for non-commercial use upon request".
- Origen: en su mayoria subidas de usuarios de Sketchfab (TERCERO; la pagina HF no nombra la fuente). Controversia etica sobre scraping (blog Flipped Normals, TERCERO). Sketchfab (OFICIAL, guias Download API): modelos descargables bajo CC o licencia estandar, el credito debe acompanar al asset, "your app must clearly mention that downloadable models are provided by Sketchfab" (cuando se usa su API), descarga requiere autenticacion.
- Uso aqui: SOLO como indice para encontrar candidatos y SOLO objetos CC0 o CC-BY individualmente verificados (idealmente abriendo la pagina original del modelo), con credito al autor. NO usar CC-BY-NC / -SA. Calidad muy dispar; incluye contenido de franquicias y escaneos; mucho trabajo manual de curaduria. Eficiencia baja frente a otras fuentes. Riesgo: medio-alto (cuenta tambien que un subidor puede haber puesto CC sobre contenido que no es suyo: NO VERIFICADO aqui, pero es el riesgo conocido de contenido de usuarios).
Nivel: OFICIAL (licencias y cifras); TERCERO (origen Sketchfab/controversia).

---------------------------------------------------------------------
## 6. Mobiliario COMERCIAL generico gratuito

Conclusion previa: no encontre ninguna coleccion libre y bien licenciada con mostradores, gondolas, vitrinas, cajas registradoras y percheros listos. Lo disponible es parcial:

### 6.1 Poly Haven (OFICIAL, CC0) - la mejor fuente limpia
- Licencia (https://polyhaven.com/license, OFICIAL): "Our assets are all licensed as CC0"; se pueden usar "for any purpose, including commercial work", redistribuir ("You can redistribute them", incluso dentro de un producto que vendas) y no se exige credito. Los logos, avatares, renders de ejemplo y textos del sitio NO son CC0. Los ToS del sitio prohiben "Web scraping or data mining without express permission": descargar a mano o con la API publica documentada para los items elegidos, sin raspar masivamente.
- Cantidad (API https://api.polyhaven.com/assets?type=models&categories=furniture, consultada el 2026-10-11, OFICIAL): 85 modelos en la categoria furniture. Utiles para comercios: Steel Frame Shelves 01/02/03, Wooden Display Shelves 01, Worn Metal Rack, Painted Wooden Shelves, Wooden Bookshelf Worn, Coffee Cart 01, Barber Shop Chair 01, Bar Chair Round 01, Metal Stool 01-03, Industrial Storage Cart, Tool Cart, Metal Office Desk, Industrial Coffee Table, mesas de madera, sofas, etc. No hay caja registradora, mostrador, vitrina ni percha.
- Calidad/peso (ejemplo steel_frame_shelves_01, API info/files, OFICIAL): polycount 4,348; 8K maximo; tag "commercial"; gltf + .bin de 142 KB y texturas jpg: 1K = 318,836 + 477,882 + 655,560 bytes (aprox. 1.6 MB en total con el .bin), 2K aprox. 5.6 MB, 4K aprox. 20 MB. Formatos: blend, gltf, usd, fbx; resoluciones 1k/2k/4k/8k. Con gltf-transform se empaqueta en GLB y se reduce.
- Estetica: fotogrametria/estilo "desgastado-vintage" en buena parte; algunos modernos. Riesgo: bajo. Redistribuible: SI.

### 6.2 Otras
- Khronos glTF-Sample-Assets (OFICIAL, https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/Models.md; lei solo parte de la pagina): "Commercial Refrigerator" CC-BY 4.0 (Eric Chadwick, DGG, Sean Thomas); Chair Damask Purplegold, GlamVelvetSofa, lamparas de Wayfair CC-BY 4.0; Glass Vase CC0. Son muy pocos (cuestan 4-10 items utiles) pero licencia clara y ya son GLB.
- OpenGameArt (OFICIAL, una pagina): ej. "Furniture Pack" de Zsky, CC-BY 4.0, "credit ... is mandatory" (enlace a Patreon). Hay paquetes CC0 de muebles low-poly (TERCERO via buscador), pero sin comercio especifico verificado. (Kenney/Quaternius los cubre otro companero.)
- Sketchfab: >700,000 modelos descargables bajo CC (Download API Guidelines, OFICIAL) pero cada uno hay que verificarlo; descargar exige cuenta (no hecho). Busque "cash register": el unico resultado visible tenia licencia "Free Standard" y aviso NoAI, no CC (TERCERO); no vi un CC0/CC-BY confirmado.
- Sweet Home 3D: ver seccion 1; no se verifico que haya items comerciales.
- FreeCAD-library (OFICIAL, https://github.com/FreeCAD/FreeCAD-library): "All Parts in this repository are licensed under CC-BY 3.0"; "Each Part is copyrighted by and should be attributed to its respective author(s)"; ~5 GB; formatos FCStd y STEP (no IFC); carpeta "Architectural Parts" con subcarpetas Bathroom, Bedroom, Doors, Doors_Windows, Kitchen, Lighting, Living room, Windows, Wikihouse, etc. Conversion a GLB: STEP/FCStd -> malla con FreeCAD/OCCT -> GLB (ruta no probada, NO VERIFICADO; tesselacion pesada y calidad dispar). Riesgo medio (autoria por pieza). Prioridad baja.
- FurniMesh (furnimesh.com, OFICIAL pero ambiguo): dice que sus modelos tienen "a license that permits commercial use without requiring attribution", ofrece GLB/OBJ gratis (141 modelos solo en shelving), pero sus Terminos (actualizados 2025-01-29) NO contienen una licencia para los modelos de la biblioteca; el sitio describe "AI-generated replicas of real products"; titular legal poco claro. -> NO usar (riesgo de copia de productos reales y licencia no formalizada).
- BlenderKit: NO VERIFICADO (la URL de licencias redirigio a otro dominio, blendkit.com, que no segui).
- 3D Warehouse tiene muchas gondolas y vitrinas gratuitas pero: ver seccion 2 (no redistribuible).

---------------------------------------------------------------------
## 7. Generadores parametricos y lo que ya trae Pascal

Fuentes: https://github.com/pascalorg/editor (README: "An open-source, local-first 3D building editor built with React Three Fiber and WebGPU"; licencia MIT; paquetes core, viewer, editor, nodes, cli, mcp, ui; los videos demo son CC BY 4.0); carpeta packages/ (cli, core, editor, eslint-config, geometry-script, ifc-converter, mcp, nodes, typescript-config, ui, viewer). Todo OFICIAL, leido de GitHub (rama main) y del registry npm. IMPORTANTE: lo leido es la rama main; puede estar por delante de las versiones publicadas en npm (geometry-script 1.0.3, ifc-converter 1.0.3). Hay que verificar la version instalada en el proyecto.

### 7.1 @pascal-app/geometry-script
- package.json (OFICIAL): v1.0.3, licencia MIT (LICENSE: "Copyright (c) 2026 Pascal Group Inc."), "Compiles AI-authored three.js geometry scripts into GLB artifacts with a Pascal manifest. It runs in a browser worker, Bun, or Node, with no DOM or React." Dependencias: @pascal-app/core ^1.0.3, three-bvh-csg ^0.0.18; peer three ^0.186; exports ".", "./compile", "./sandbox".
- Que es (wiki/architecture/authored-objects.md, OFICIAL): un "authored object" es un `item` cuya geometria se escribe en three.js plano. Su `source` guarda el hash del modulo (`script`), sus `params`, el hash del GLB compilado (`artifact`) y un `manifest` leido del GLB. El codigo vive en un artefacto text/javascript, no en la escena: publicar la geometria no publica el codigo.
- Contrato del modulo: exporta `params` (cada uno con default, min, max, step, unit), `mount` ('floor' | 'wall' | 'wall-side' | 'ceiling') y una funcion `build({ params, THREE })` que devuelve un grupo. Imports permitidos: `three`, algunos `three/addons` (BufferGeometryUtils, RoundedBoxGeometry, ConvexGeometry, LoftGeometry, ParametricGeometry) y `three-bvh-csg` (booleanas CSG). Sandbox: sin red, DOM, eval, import dinamico ni process.
- Convenciones de nombres: material `slot_<id>` = slot de pintura; `part:<id>` = parte direccionable; `light:<id>` = luz conmutable; mallas `cutout`/`cut:wall`/`cut:ceiling`/`cut:slab` = cortadores (huecos); `anchor:<id>` = enchufe; `collider` = proxy de colision; clips `open`/`loop` = animaciones (open/close). El compilador deriva superficies de apoyo ("surfaces") y "undersides".
- Puertas/ventanas/columnas parametricas: `add_window`/`add_door` aceptan `code` y `params`; el muro recorta el `cutout` del artefacto, el panel de parametros reemplaza los campos nativos del marco, ancho/alto salen de los limites compilados y conservan comportamiento (planilla, simbolo en planta, clase IfcWindow/IfcDoor). `add_column` igual.
- Limitaciones documentadas: manifiesto limitado a 24 KiB; el almacen de artefactos por defecto esta en memoria y dura una sesion; MCP/editor local usa un almacen en disco junto a SQLite (`<database-path>.artifacts/<sha256>`); la compilacion local es opt-in con PASCAL_SERVER_SCRIPT_COMPILE=1; al pegar/forkear/guardar la escena en otro proyecto hay que llevar los artefactos; los objetos con script solo se cambian reconstruyendo por su herramienta.
- Aplicacion al proyecto: es EL generador parametrico abierto relevante. Permite crear objetos propios (y publicables, MIT, sin riesgo de licencia) en three.js con CSG, parametros con sliders y pintura por slots. Se llama "AI-authored" porque el flujo previsto es que un agente escriba el modulo via MCP, pero el contrato es un modulo JavaScript: se puede escribir a mano o con IA (inferencia; la doc no dice que sea obligatorio IA).
- Riesgos: (1) en Vercel (serverless, sin disco persistente) el almacen por defecto no persiste: habria que persistir los artefactos (p. ej. Supabase Storage); como se enchufa un almacen propio NO VERIFICADO; (2) la compilacion en el servidor esta desactivada por defecto; en el navegador corre en worker; (3) la API puede cambiar (paquete joven, v1.0.x).

### 7.2 Nodos parametricos nativos en packages/nodes/src (OFICIAL)
Directorios: block, box-vent, building, cabinet, ceiling, chimney, column, construction-dimension, cupola, door, dormer, downspout, duct-fitting/segment/terminal, elevator, eyebrow-vent, fence, fence-feature, floor-opening, guide, gutter, hvac-equipment, imported-mesh, item, level, lineset, liquid-line, measurement, pipe-fitting/segment/trap, procedural-item, ridge-vent, roof, roof-segment, scan, separator, shared, shelf, site, skylight, slab, solar-panel, spawn, stair, stair-segment, structural-grid, turbine-vent, unit, wall, window, zone.
- `shelf` (definition.ts): "A configurable shelving unit. Items host on each row." Estilos: wall-shelf, bookshelf, open-rack, cubby (default). Parametros: width 1, depth 0.5, height 1.8, thickness 0.05, rows 3, columns 2, withBack/withSides/withBottom, bracketStyle 'minimal', material/slots de pintura; se pueden apoyar items y procedural-items en cada fila; redimensionable; planta 2D. => Cubre estanterias, gondolas/exhibidores abiertos y libreros comerciales (inferencia de uso para retail).
- `cabinet` (definition.ts/presets.ts): "A configurable parametric base cabinet with plinth, carcass, front panels, optional countertop, and editable dimensions." Modulos en "runs" (tier base/wall, islas, esquinas en L). 9 presets: base-door, drawer-base, dishwasher, cooktop-gas, cooktop-induction, sink-base, tall-pantry, oven-tower, fridge-single. La definicion no dice "cocina" explicitamente; usable como cocina y, por inferencia, como mostrador/barra con encimera (NO VERIFICADO que sirva bien para mostrador comercial).
- `door` / `window` (con parametrics.ts) y curtain walls (wiki/curtain-walls.md, OFICIAL): muro tipo "Curtain wall" con grilla de columnas/filas parametricas (por cantidad de paneles, espaciado maximo o fijo; hasta 32 paneles por eje), relleno vidrio/solido/vacio por panel, puertas rectangulares con jambas y dintel de entrada ("storefront"), aberturas arqueadas con marco. Cubre vidrieras/escaparates y puertas de local.
- `procedural-item` (definition.ts, OFICIAL): kind 'procedural-item', category 'furnish', etiqueta "Procedural item", descripcion literal "Experimental editable recipe" / MCP: "Experimental procedural item with a validated recipe." Su geometria sale de una "recipe" editable (parts, parameters {id, part, axis, min, max, default}, slots de color, mounting attachTo ceiling/wall-side, surfaces, shapes {primitive, position, rotation, size, partId}, lights) mas parametros; handles de redimension lineal por parametro, rotacion con snaps, tecla E activa mecanismo/luces, R voltea items de pared. La unica receta que aparece en el archivo es `shelfRecipe` (por defecto). Es experimental: no depender de ello para lo critico.
- `item` + `imported-mesh`: items de catalogo (GLB con asset.src) y mallas importadas desde IFC.

### 7.3 Otros generadores abiertos (todos TERCERO)
- three.js: sin libreria de mobiliario parametrico mantenida (foro de three.js: "Procedural/Parametric furniture in Threejs" apunta a geometria a medida). Proyectos sueltos (ej. threejs-sims-house-builder MIT, product-configurator starters) son referencias, no catalogos.
- JSCAD (MIT; JS, CSG parametrico): sirve para generar geometria; conversion a GLB no verificada.
- OpenSCAD: librerias BOSL2 (BSD-2-Clause) y otras; no encontre una biblioteca de muebles con licencia clara (NO VERIFICADO); no exporta GLB nativo.
- CadQuery: no investigado a fondo (no encontre libreria de muebles verificada) -> NO VERIFICADO.
- Bonsai (Blender): puertas/ventanas parametricas guardadas en pset BBIM_Door y solo regenerables dentro de Bonsai (foro OSArch/docs-unstable, TERCERO). No necesario si se usan los nodos de Pascal.

---------------------------------------------------------------------
## 8. Herramientas de conversion (resumen)

| Herramienta | Licencia | Entrada -> salida | Nivel |
|---|---|---|---|
| Blender (add-on glTF 2.0) | GPL (la salida es tuya) | OBJ/DAE/3DS/FBX/... -> GLB | TERCERO (manual via buscador) |
| obj2gltf (CesiumGS) | Apache-2.0 | OBJ(+MTL) -> glTF/GLB (-b) | OFICIAL (README GitHub) |
| assimp | BSD 3 clausulas modificada | importa OBJ, DAE, 3DS; exporta "glTF 2.0 (partial)" | OFICIAL (Fileformats.md); GLB export no explicito |
| gltf-transform | MIT | optimiza GLB: draco, meshopt, KTX2, resize | OFICIAL (gltf-transform.dev); no importa OBJ |
| IfcConvert (IfcOpenShell) | LGPL-3.0-or-later | IFC -> .glb | OFICIAL (docs.ifcopenshell.org) |

---------------------------------------------------------------------
## 9. Tabla comparativa por fuente

| Fuente | Licencia / terminos | Redistribuible en repo/Supabase | Formato | Cantidad / calidad | Riesgo | Verificacion |
|---|---|---|---|---|---|---|
| Sweet Home 3D (cat. por defecto) | GPL o CC-BY a eleccion; uso y redistribucion comercial permitidos con atribucion | SI | OBJ/MTL en .sh3f | ~100 (Win gratis) a ~929 (macOS gratis) piezas; residencial | Bajo | OFICIAL |
| Sweet Home 3D (libs: Scopia, KatorLegaz, BlendSwap CC0/CC-BY) | CC-BY 3.0 / CC-BY / CC0 | SI (credito) | OBJ/MTL | ~900 | Bajo-medio (credito por modelo) | OFICIAL |
| Sweet Home 3D (Contributions, LucaPresidente, Trees) | Free Art License (copyleft) | SI con obligaciones | OBJ/MTL | ~585 | Medio | OFICIAL |
| 3D Warehouse | GML: prohibe agregar para redistribuir y distribuir modelos sueltos | NO | SKP/KMZ/DAE | millones, calidad variable | Alto | OFICIAL (texto 2015/2017) |
| BIMobject/bim.com | uso personal, sin comercial ni redistribucion | NO | IFC/RFA/etc. | muchos, de marcas | Alto | OFICIAL |
| Polantis | pertenece a BIMobject | NO | varios | n/d | Alto | NO VERIFICADO |
| BIMsmith | licencia de software; contenido de fabricantes | NO | Revit | de marcas | Alto | OFICIAL (sin clausula de contenido) |
| Revit City | contribuido por usuarios; sin licencia de reuso | NO | RFA | variable | Alto | OFICIAL |
| NBS National BIM Library | gratis "en tus proyectos"; NBS ID Licence restringe reproducir/distribuir | NO (o permiso escrito) | Revit (IFC segun terceros) | decenas de miles | Alto | OFICIAL + TERCERO |
| ARCAT | licencia al descargar; propiedad ARCAT | probablemente NO | RFA, SKP, DWG/IFC | de fabricantes | Alto | NO VERIFICADO |
| buildingSMART samples | CC BY 4.0 | SI | IFC | modelos de prueba, sin muebles | Bajo | OFICIAL |
| Bonsai "IFC4 Furniture Library" | sin licencia propia; repo GPL/LGPL | probablemente SI con aviso GPL | IFC4 (extrusiones) | ~100 tipos, esquematicos | Medio | OFICIAL (contenido) / NO VERIFICADO (licencia) |
| 3D-FUTURE | solo investigacion; no comercial; no redistribuir | NO | OBJ/texturas | 9,992 CAD de alta calidad | Bloqueante | OFICIAL |
| ABO | CC BY 4.0 (desde 2023) | SI con credito a Amazon.com | GLB (glTF 2.0) PBR | ~7,953 modelos; pesados | Medio (marcas, peso) | OFICIAL |
| ShapeNet | no comercial; solo a colegas; acceso aprobado | NO | OBJ/glTF | 51K aprox. (no verificado) | Bloqueante | OFICIAL |
| Objaverse(-XL) | ODC-By del conjunto; licencia por objeto (CC0..CC-BY-NC-SA) | solo CC0/CC-BY filtrado | GLB | 800K+ / 10M+, calidad dispar | Medio-alto | OFICIAL |
| Poly Haven | CC0 | SI, sin credito | glTF/FBX/blend/USD | 85 mueble (1-8K) | Bajo | OFICIAL |
| FreeCAD-library | CC-BY 3.0 (autoria por pieza) | SI con credito | FCStd/STEP | ~5 GB; pesada | Medio | OFICIAL |
| FurniMesh | licencia no formalizada; replicas IA de productos reales | NO recomendable | GLB/OBJ | 141 en shelving | Alto | OFICIAL (ambiguo) |
| Pascal geometry-script / nodos | MIT (repo Pascal) | SI (tu propio contenido) | genera GLB | ilimitado, parametrico | Bajo (persistencia/version) | OFICIAL |

---------------------------------------------------------------------
## 10. RECOMENDACION

1. Para puertas, ventanas, vidrieras, estanterias, gondolas y cocinas: usar lo NATIVO de Pascal (door, window, curtain wall, shelf, cabinet) antes que cualquier GLB descargado. Es parametrico (dimensiones editables, slots de pintura, clase IFC correcta, planta 2D) y no tiene ningun problema de licencia (MIT). Ninguna biblioteca de GLB estaticos compite con eso para estos casos, ni Kenney/Quaternius.
2. Para objetos a medida (caja registradora esquematica, mostrador, percheros, vitrina, mesa de cafe): @pascal-app/geometry-script (modulos three.js con `params`, `mount`, CSG, slots). Es la forma mas barata de cubrir "mobiliario comercial generico" sin depender de licencias, a costa de tiempo de desarrollo. Antes de apostar por esto: confirmar la version del paquete en el proyecto y resolver donde persisten los artefactos en Vercel/Supabase (el almacen por defecto es en memoria; dato NO VERIFICADO como enchufar uno propio). `procedural-item` es experimental: no basar lo critico en el.
3. Para volumen de mobiliario realista residencial: ordenar por claridad legal. (a) Poly Haven CC0 (85 piezas, ~1.6 MB por item a 1K, sin credito), (b) Sweet Home 3D: Scopia (500, CC-BY 3.0), BlendSwap CC0 (175) y CC-BY (135), KatorLegaz (90), y el catalogo por defecto (CC-BY); evitar Archibit, 3D Warehouse y el paquete masivo "10,000 models" sin licencia. Pipeline: OBJ/MTL -> Blender u obj2gltf -> gltf-transform; mantener un CREDITS por modelo. (c) ABO como piloto: CC BY 4.0 con GLB PBR listo, pero 154 GB y modelos de 40 MB: solo vale curar 30-100 piezas y optimizarlas; atribuir a Amazon.com; cuidar logos/marcas; abrir el LICENSE del archivo antes de publicar.
4. Frente a Kenney/Quaternius/Poly Pizza (CC0, ligeros, estilo homogeneo): lo mas probable es que ESAS sean mejores como base del catalogo por consistencia estetica y peso. Sweet Home 3D y ABO valen la pena solo para llenar huecos "mas arquitectonicos/realistas" (sanitarios, cocinas, puertas, sofas realistas) y Poly Haven para estanterias metalicas, carritos, taburetes. Si el estilo del catalogo de Pascal (111 GLB) es low-poly homogeneo, mezclar ABO/Poly Haven fotorrealistas va a desentonar.
5. Descartar para el catalogo publico: 3D Warehouse, BIMobject/Polantis, BIMsmith, Revit City, NBS, ARCAT (validos solo como referencia de dimensiones), ShapeNet, 3D-FUTURE, FurniMesh y Objaverse-XL en bloque. Si alguien insiste en usar NBS o ARCAT, pedir permiso por escrito.
6. IFC: la biblioteca de Bonsai "IFC4 Furniture Library" sirve de fuente de DIMENSIONES y clases IFC (mesas de restaurante 2-14 plazas, escritorios, bancos de cocina) y para probar el importador, no como catalogo visual (son extrusiones). Pascal importa IFC pero los muebles quedan como `imported-mesh` estaticos; para tener items colocables hay que pasar por IfcConvert->GLB. Los archivos de buildingSMART (CC BY 4.0) sirven para tests del importador.

---------------------------------------------------------------------
## 11. Lo que NO pude confirmar (no tomarlo como hecho)
- Texto de ARCAT (403), terminos de Polantis, terminos de BIMobject en su dominio (403), licencia de descarga gratuita de NBS, Open IFC Model Repository (Auckland), Blender docs (404 en la URL probada; dato via buscador), BlenderKit (redirige a otro dominio), pagina Tianchi de 3D-FUTURE (404).
- Contenido exacto del catalogo por defecto de Sweet Home 3D (listado de puertas/ventanas/banos) y calidad visual de sus bibliotecas.
- Licencia especifica de los archivos .ifc dentro de Bonsai (heredan GPL, presumiblemente).
- Contenido del LICENSE dentro del archivo de ABO (no descargado) y esquema de rutas por modelo en S3.
- Conteos por categoria de ABO y de Objaverse (mobiliario).
- Si el almacen de artefactos de geometry-script se puede cambiar por Supabase Storage; si las capacidades de main (nodos, wiki) estan en las versiones de npm que usa el proyecto.
- Terminos de uso de la API de Poly Haven (la pagina de licencia solo prohibe scraping del sitio).
- Cualquier cuestion de marcas/diseno de los productos reales de ABO: no es asesoria legal.

## 12. Fuentes principales (URLs)
- https://www.sweethome3d.com/license.jsp ; /import-models/ ; /freeModels.jsp ; /importModels.jsp ; /download.jsp
- https://www.artlibre.org/licence/lal/en/
- https://embed-3dwarehouse-classic.sketchup.com/tos/ ; https://help.sketchup.com/en/3d-warehouse/3d-warehouse-terms-use-faq
- https://business.bimobject.com/terms-of-service-eula ; https://bimsmith.com/legal/terms-and-conditions ; https://www.revitcity.com/tos.php ; https://source.thenbs.com/en-us/gb/bimlibrary ; https://www.thenbs.com/legal/nbs-id-licence-agreement
- https://github.com/buildingSMART/Sample-Test-Files ; https://github.com/IfcOpenShell/IfcOpenShell (v0.8.0, src/bonsai/bonsai/bim/data/libraries) ; https://docs.ifcopenshell.org/ifcconvert/usage.html
- https://registry.npmjs.org/@pascal-app/ifc-converter ; https://github.com/pascalorg/editor (packages/geometry-script, packages/nodes/src/{shelf,cabinet,procedural-item,door}, wiki/architecture/authored-objects.md, wiki/curtain-walls.md)
- https://terms.aliyun.com/legal-agreement/terms/suit_bu1_ali_cloud/suit_bu1_ali_cloud202004171628_60052.html ; https://arxiv.org/abs/2009.09633
- https://amazon-berkeley-objects.s3.amazonaws.com/index.html ; https://registry.opendata.aws/amazon-berkeley-objects/ ; https://github.com/awslabs/open-data-registry/pull/3339
- https://huggingface.co/ShapeNet ; https://huggingface.co/datasets/ShapeNet/ShapeNetSem-archive/blob/main/README.md
- https://huggingface.co/datasets/allenai/objaverse ; https://huggingface.co/datasets/allenai/objaverse-xl
- https://polyhaven.com/license ; https://api.polyhaven.com/assets?type=models&categories=furniture ; https://api.polyhaven.com/info/steel_frame_shelves_01 ; https://api.polyhaven.com/files/steel_frame_shelves_01
- https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/Models.md ; https://github.com/FreeCAD/FreeCAD-library ; https://furnimesh.com/terms/
- https://github.com/CesiumGS/obj2gltf ; https://github.com/assimp/assimp ; https://gltf-transform.dev/
