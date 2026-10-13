import { ANALYSES_PER_HOUR } from '@interiores/contract'

/** Textos del análisis de fotos que repiten el diálogo «Muebles desde una foto» y la página /escena-desde-foto: se escriben una sola vez. */
export const ANALYSIS_TEXT = {
  privacy:
    'Tu foto se envía a Google (Gemini) para reconocer los muebles y no la guardamos. En el nivel gratuito, Google puede usar las fotos para mejorar sus productos: evita las privadas o con personas.',
  limit: `Puedes analizar hasta ${ANALYSES_PER_HOUR} fotos por hora.`,
} as const
