---
paths:
  - "apps/**"
---

# Mensajes en castellano

- Todo texto visible y todo mensaje de error: castellano neutro, tuteo ("tú").
- Los mensajes de error se traducen en una sola capa: `apps/web/src/lib/api/errors.ts` (web) y `apps/api/src/errors.ts` (API).
- Sin lenguaje técnico en pantalla: "ambiente" y no "zona"; "versión" y no "etag".
