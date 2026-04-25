# Aether Gacha — Frontend

Leer ../../.opencode/SKILL-aether-frontend.md antes de cualquier tarea.
Leer ../../DESIGN.md para dirección artística, animaciones y paleta.
Leer ../../PRD.md para flujos de cada pantalla.

## Stack
- Framework: TanStack Start (file-based routing + data loaders)
- Animaciones: Framer Motion + tsParticles + CSS keyframes
- Estado del servidor: TanStack Query
- Auth: Clerk React SDK

## Rutas
- /            → The Altar (pantalla principal)
- /bazaar      → The Hollow Bazaar
- /rift        → The Rift
- /vault       → The Aether Vault
- /collection  → Colección personal

## Estructura de este workspace
- app/routes/       → páginas (file-based routing)
- app/components/   → componentes por dominio (altar/, entity/, bazaar/, rift/, vault/, ui/)
- app/hooks/        → lógica reutilizable (useInvoke, useShards, useParticles)
- app/config/       → rarityConfig.ts y particles.ts (nunca hardcodear colores de rareza)
- app/styles/       → globals.css / animations.css / rarities.css
