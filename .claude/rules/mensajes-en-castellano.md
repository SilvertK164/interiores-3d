---
paths:
  - "apps/**"
---

# Mensajes en castellano

- Todo texto visible y todo mensaje de error: castellano neutro, tuteo ("tú").
- Los mensajes de error se traducen en una sola capa por origen: `apps/web/src/lib/api/errors.ts` (errores de la API propia, en la web), `apps/web/src/lib/auth-errors.ts` (errores de Supabase Auth: ingreso y registro) y `apps/api/src/errors.ts` (API). Nunca se muestra el texto del servidor tal cual.
- Al ingresar, ningún mensaje revela si un correo existe: siempre "El correo o la contraseña no coinciden".
- Sin lenguaje técnico en pantalla: "ambiente" y no "zona"; "versión" y no "etag".
