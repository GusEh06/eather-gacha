# Aether Gacha — Shared Types

Este paquete contiene los tipos TypeScript compartidos entre `apps/web` y `apps/api`.

## Regla única
Cualquier tipo que se use en más de un workspace vive aquí.
Nunca duplicar tipos entre el frontend y el backend.

## Tipos principales
- Rareza (enum)
- Entity
- UserProfile (shards, pity counters)
- MarketListing
- RiftSlot
- ShardPackage
