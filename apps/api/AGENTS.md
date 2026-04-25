# Aether Gacha — Backend

Leer ../../.opencode/SKILL-aether-backend.md antes de cualquier tarea.
Leer ../../PRD.md para contexto de endpoints y schema.

## Stack
- Runtime: Bun
- Framework: Hono
- Base de datos: MongoDB
- Auth: Clerk (JWT middleware)
- Pagos: Stripe (checkout hosted + webhook)

## Estructura de este workspace
- src/routes/     → handlers HTTP, sin lógica de negocio
- src/services/   → lógica de negocio (gacha, market, rift)
- src/db/         → conexión y colecciones tipadas
- src/crons/      → cron job del Rift (medianoche)
- src/middleware/ → auth JWT de Clerk
