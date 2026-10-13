---
name: verificar-cambio
description: Úsala antes de decir que una tarea terminó o de abrir un PR en este repo. Obliga a correr pnpm verify y a pegar la salida real.
---

# Verificar un cambio

1. Corre `pnpm verify` desde la raíz y espera a que termine.
2. Si falla, **no** digas que terminó: arregla la causa o informa la falla con la salida literal.
3. Pega en el PR las últimas líneas de la salida (suites y pruebas pasadas).
4. Confirma que el primer test de la tarea se vio en rojo antes del verde (pega ese fragmento).
5. Si tocaste el editor, comprueba `git grep -l "@pascal-app/" -- '*.ts' '*.tsx'`: solo debe listar `apps/web/src/editor/`.
