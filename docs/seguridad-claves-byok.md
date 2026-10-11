# Claves de API de render (BYOK): diseño de seguridad y documentación

> Fecha: 2026-10-11 · Estado: **diseño preliminar**; se convierte en el spec "Render con IA" cuando llegue su slice. Etiquetas: **[decisión]** del equipo · **[inferencia]** estimación o propuesta nuestra sin verificar.
> Relacionado: [`investigacion-renders-exportaciones-diseno.md`](investigacion-renders-exportaciones-diseno.md) (qué proveedores) y el [spec 1](superpowers/specs/2026-10-11-fundacion-y-persistencia-design.md) (base de datos, API y auth).

## 1. Decisión del equipo

**[decisión]** Cada persona usuaria **conecta su propia clave de API** del proveedor de render. La interfaz explica cómo crearla, la maneja de forma segura y todo queda documentado. Los proveedores candidatos se limitan a los que tienen **nivel gratuito real** para una persona individual (comparativa en la investigación).

Por qué lo defendemos: el costo y el riesgo de abuso no recaen en el equipo; se practica el manejo de secretos que enseña la clase 06 (credenciales, alcance, supply chain); y el producto no depende de una cuenta paga nuestra.

**Proveedor soportado en esta versión:** solo **Cloudflare Workers AI** (modelo `flux-2-klein-4b`; pide *token* y *Account ID*). La interfaz `RenderProvider` y la columna `provider` quedan listas para sumar otros más adelante. Detalle y condiciones en la [investigación](investigacion-renders-exportaciones-diseno.md).

**Costo asumido y mitigación:** quien evalúa no verá un render si no tiene una clave. Mitigación: el equipo crea su propia clave gratuita y la carga en la **cuenta de demostración por el mismo flujo** que usa cualquier persona; además, el proyecto de demo trae renders previos guardados por si el proveedor falla en vivo.

## 2. Principios

1. **La clave no vuelve al navegador** una vez guardada: la API solo devuelve los últimos 4 caracteres.
2. **Solo `apps/api` la descifra, en el momento de usarla.**
3. **Nunca** en logs, mensajes de error, URLs, métricas ni respuestas.
4. **Mínimo privilegio:** la interfaz recomienda crear la clave con el menor alcance posible y, si el proveedor lo permite, con límite de gasto.
5. La persona puede **probar, reemplazar y borrar** su clave en cualquier momento.
6. El cifrado en reposo usa una clave maestra que **no vive en la base de datos**.

## 3. Cómo se maneja la clave (dos modos)

| Modo | Qué ocurre | Cuándo |
|---|---|---|
| **M1 · Guardada cifrada** (por defecto) | La API cifra con AES-256-GCM (formato `v1.<iv>.<tag>.<texto cifrado>`), con una clave maestra `INTEGRATIONS_ENC_KEY` de 32 bytes guardada como secreto de Vercel. Se guarda el texto cifrado y los últimos 4 caracteres. | Uso normal. |
| **M2 · Solo esta sesión** | La clave vive en memoria del navegador (nunca en `localStorage`), viaja en el encabezado `X-Provider-Key` por HTTPS en cada render y la API **no la persiste ni la registra**. | Quien no quiere que se guarde. |
| ~~M3 · Llamar al proveedor desde el navegador~~ | **Descartado:** la mayoría de los proveedores no habilita CORS y la clave quedaría expuesta a cualquier script de la página (XSS). | — |

El prefijo `v1` permite rotar la clave maestra o cambiar de algoritmo sin romper lo guardado. Detrás de una interfaz `SecretStore` se podría reemplazar por otro almacén (p. ej. Supabase Vault, que **no verificamos**); elegimos cifrado en la aplicación porque se puede probar con TDD y explicar línea por línea.

## 4. Datos y permisos [inferencia, a confirmar en el spec del slice]

```
user_integrations(
  id uuid pk, owner_id uuid → auth.users on delete cascade,
  provider text not null check (provider in (…)),
  secret_ciphertext text not null,        -- v1.<iv>.<tag>.<ct> (solo el secreto)
  config jsonb not null default '{}',     -- datos NO secretos del proveedor, p. ej. {"accountId": "…"} de Cloudflare
  key_last4 text not null,
  status text not null default 'unverified' check (status in ('unverified','valid','invalid')),
  validated_at timestamptz, created_at, updated_at,
  unique (owner_id, provider)
)
```
- **RLS activado** y **sin permisos** para `anon` ni `authenticated` (`revoke all`): el navegador **no puede ni listar** la tabla. Solo accede `service_role` desde un módulo acotado de la API que siempre filtra por `owner_id = sub` del JWT verificado.
- **Excepción documentada a la decisión D5 del spec 1** (la API usa el JWT de la persona): este módulo usa `service_role` porque el texto cifrado no debe ser legible desde el cliente. Es la única excepción y tiene tests propios.
- Tabla `renders(id, project_id, owner_id, status, provider, prompt, image_path, created_at)` con RLS por dueño, y cuota diaria por usuario.

## 5. Contrato de la API (se suma a `openapi.yaml` en el slice)

| Método | Ruta | Éxito | Errores |
|---|---|---|---|
| `GET` | `/v1/integrations` | `200` `[{provider, keyLast4, status, validatedAt}]` — **nunca** la clave | `401` |
| `PUT` | `/v1/integrations/{provider}` | `200` `{provider, keyLast4, status}`; body `{apiKey}` | `401`, `422` formato |
| `POST` | `/v1/integrations/{provider}/validate` | `200` `{status}`; hace la llamada más barata del proveedor | `401`, `404`, `502` |
| `DELETE` | `/v1/integrations/{provider}` | `204` sin cuerpo | `401`, `404` |
| `POST` | `/v1/projects/{id}/renders` | `201` `{id, status}`; header opcional `X-Provider-Key` (modo M2) | `401`, `404`, `409` sin integración, `413`, `422`, `429` cuota o límite del proveedor, `502` error del proveedor (mensaje sanitizado) |
| `GET` | `/v1/projects/{id}/renders` | `200` lista | `401`, `404` |

## 6. Modelo de amenazas

| Amenaza | Mitigación | Cómo se demuestra |
|---|---|---|
| Un script malicioso (XSS) roba la clave | La clave no vuelve al navegador; modo sesión solo en memoria; CSP estricta | Test de contrato: ninguna respuesta contiene la clave; test del encabezado CSP |
| Se filtra la base de datos o un backup | Texto cifrado con AES-GCM; clave maestra fuera de la base | Test de ida y vuelta, de manipulación (el *tag* falla) y de clave equivocada |
| La clave aparece en logs o errores | `redact` de Fastify sobre `authorization`, `x-provider-key` y `apiKey`; errores del proveedor sanitizados | Test que fuerza un error y verifica la ausencia de la clave en la salida |
| Abuso de nuestra API (render masivo) | Límite de peticiones por usuario y cuota diaria; límite de tamaño y tipo MIME de la captura | Tests de `429` y `413` |
| SSRF por URL de imagen arbitraria | La entrada es una ruta de Storage del propio proyecto, nunca una URL libre | Test que rechaza URLs externas |
| Respuesta inesperada del proveedor | Validar tipo y tamaño, guardar en nuestro bucket y servir con URL firmada | Test con proveedor simulado |
| Clave con permisos de más | La interfaz guía a crearla con alcance mínimo y límite de gasto | Revisión de la guía por proveedor |
| Nivel gratuito que entrena con los datos | Aviso por proveedor en la interfaz, tomado de la comparativa | Revisión de la tarjeta de cada proveedor |
| Cambio de clave maestra | Prefijo de versión y procedimiento de re-cifrado documentado | Test de lectura `v1` con soporte `v2` |

## 7. Requisitos de la interfaz (a diseñar en Pencil)

**Ajustes → Integraciones**, una tarjeta por proveedor con:
- Nombre, si es gratis y sus límites, y el **aviso de privacidad** del nivel gratuito.
- Guía **"Cómo crear tu clave"** en acordeón, con 4 a 6 pasos, enlaces a las páginas oficiales y capturas.
- Campos por proveedor: **Cloudflare** pide *token* (secreto) y *Account ID* (no secreto, se guarda en `config`); **Stability** pide solo la clave. Cada formulario se declara en un esquema por proveedor, no a mano.
- Campo de clave tipo contraseña con mostrar/ocultar, botón **Probar clave**, estado (válida, inválida, sin probar) y selector **Guardar cifrada / Solo esta sesión**.
- Botones **Reemplazar** y **Eliminar**, con confirmación.
- Mensajes en castellano, accesibles (etiquetas, `aria-live` para el resultado de la prueba) y responsivos.

Las guías viven en `apps/web/content/integrations/<proveedor>.md` y se **reutilizan en la documentación** del repositorio, para que la ayuda de la interfaz y el README digan lo mismo.

## 8. Documentación que exige este diseño

- `README.md`: sección "Cómo conectar tu API de render" y "Seguridad de las claves" (modelo de amenazas resumido).
- Esta página, actualizada con lo realmente construido y con las diferencias explicadas.
- *Qué decidí yo*: BYOK frente a clave del equipo, con alternativas y costo asumido (§1).
- *Qué salió mal*: cualquier incidente real con proveedores (cuota, formato de respuesta, claves inválidas).

## 9. Pruebas

Unitarias del cifrado (ida y vuelta, manipulación, clave equivocada, formato); de contrato (la clave nunca aparece en una respuesta); de permisos (`authenticated` no puede leer la tabla); de redacción de logs; de límites (`413`, `429`); y del adaptador de proveedor contra un servidor simulado. **Ninguna prueba usa claves reales.**

## 10. Impacto en el alcance [inferencia]

BYOK suma del orden de **3–4 h** al slice de render (cifrado, tabla, pantalla de integraciones, guías y pruebas), que pasa a ≈ 7–9 h en total. Si el tiempo aprieta, el orden de recorte sigue siendo: subida de muebles y modos de recorrido primero; el render con BYOK y el PDF se defienden mejor ante el curso porque muestran manejo de secretos y contratos.
