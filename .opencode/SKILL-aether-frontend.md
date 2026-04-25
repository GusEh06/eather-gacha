---
name: aether-frontend
description: >
  Usar cuando se trabaje en el frontend de Aether Gacha. Cubre componentes de TanStack Start,
  la secuencia de animación del altar, efectos de juice (screen shake, hit stop, squash & stretch),
  sistema de partículas, diseño de cards de entidad, y todas las pantallas del proyecto.
  Activar ante cualquier tarea de UI, componente, pantalla o animación.
---

# Aether Gacha — Frontend Skill

## Stack
- **Framework:** TanStack Start (file-based routing + data loaders)
- **Animaciones:** Framer Motion + tsParticles + CSS keyframes
- **Estado del servidor:** TanStack Query
- **Auth:** Clerk React SDK
- **Estilos:** CSS Modules o Tailwind (sin utility-first puro — usar clases semánticas)

## Paleta de Colores (CSS Variables)
Siempre usar variables CSS definidas en `:root`. Ver DESIGN.md para la lista completa.
Las variables de rareza se aplican inline: `style={{ "--rarity-color": "var(--rarity-nova)" }}`

## Tipografía
- Display: `Cinzel` (Google Fonts) — nombres, títulos
- UI: `Rajdhani` (Google Fonts) — precios, botones, etiquetas

## Estructura de Rutas (TanStack Start)
```
/                  → The Altar (pantalla principal post-login)
/bazaar            → The Hollow Bazaar
/rift              → The Rift
/vault             → The Aether Vault
/collection        → Colección personal del Aether Binder
```

## Componentes Clave

### `<EntityCard />` 
Props: `entity`, `price`, `sellerName`, `onClick`
- Border color = `var(--rarity-{rareza})`
- Box-shadow exterior = color de rareza al 40% opacity
- Idle animation: `entityFloat` + `entityGlow` CSS keyframes
- En hover: glow se intensifica, scale 1.02 con Framer Motion

### `<RarityBadge />`
Props: `rareza`
- Muestra el ícono SVG de la rareza + el nombre
- Color de texto = `var(--rarity-{rareza})`

### `<ShardsDisplay />`
Props: `amount`
- Siempre visible en el header/navbar
- Muestra el ícono ◈ + cantidad formateada con separador de miles
- Animación de "increment" cuando los Shards aumentan (Framer Motion `animate`)

## Secuencia de Invocación — Implementación

### Estado de la animación
```typescript
type InvokePhase = 
  | "idle"
  | "activating"    // runas + screen shake
  | "collapsing"    // fade a negro
  | "eyes"          // ojos en la oscuridad
  | "revealing"     // squash & stretch + partículas
  | "complete"      // entidad visible + botones
```

### Screen Shake
```typescript
// Añadir/remover clase en el container principal
const triggerShake = (duration: number) => {
  document.getElementById("altar-container")?.classList.add("shake")
  setTimeout(() => {
    document.getElementById("altar-container")?.classList.remove("shake")
  }, duration)
}
```

### Hit Stop
```typescript
// Pausar animaciones por N milisegundos
const hitStop = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
// Usar con await dentro de la secuencia async de la invocación
```

### Squash & Stretch con Framer Motion
```typescript
const entityRevealVariants = {
  hidden:  { scale: 0.1, opacity: 0 },
  squash:  { scaleX: 1.4, scaleY: 0.6, transition: { duration: 0.08 } },
  stretch: { scaleX: 0.8, scaleY: 1.2, transition: { duration: 0.1 } },
  settle:  { scale: 1,   opacity: 1,  transition: { type: "spring", stiffness: 300 } }
}
```

### tsParticles — Inicialización por rareza
```typescript
import { rarityParticleConfig } from "@/config/particles"

const triggerRevealParticles = (rareza: string) => {
  tsParticles.load("particles-container", rarityParticleConfig[rareza])
  setTimeout(() => tsParticles.domItem(0)?.destroy(), 3000)
}
```

## Data Loaders (TanStack Start)

### The Altar
```typescript
export const loader = async ({ context }) => {
  const userId = context.auth.userId
  const user = await fetchUserProfile(userId) // shards + pity counters
  return { shards: user.shards, pityCounter: user.pityCounter }
}
```

### The Hollow Bazaar
```typescript
export const loader = async ({ request }) => {
  const url = new URL(request.url)
  const rareza = url.searchParams.get("rareza")
  const sort = url.searchParams.get("sort") || "price_asc"
  const listings = await fetchListings({ rareza, sort })
  return { listings }
}
```

### The Rift
```typescript
export const loader = async () => {
  const rotation = await fetchCurrentRift()
  return { slots: rotation.slots, expiresAt: rotation.expiresAt }
}
```

## Reglas de UI

1. **Nunca mostrar el fondo blanco** — si un componente no tiene background definido, hereda el `--bg-void`
2. **Los botones primarios** usan `--accent-aether` como background con texto `--text-primary`
3. **Los botones de rareza alta** (Eclipse, Singularity) usan el gradient iridiscente en el border, no en el background
4. **Confirmaciones destructivas** (vender, confirmar compra) siempre tienen un modal intermedio — nunca acción directa
5. **Los Shards nunca muestran decimales** — siempre entero, siempre con separador de miles
6. **El precio en el Bazaar** muestra dos líneas: precio total y "Recibes: X Shards" (precio - 5% tributo)

## Idle Animation CSS (aplicar a todas las entidades en Bazaar y Rift)
```css
@keyframes entityFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}
@keyframes entityGlow {
  0%, 100% { filter: drop-shadow(0 0 8px var(--rarity-color)); }
  50%       { filter: drop-shadow(0 0 16px var(--rarity-color)); }
}
.entity-idle {
  animation: entityFloat 3s ease-in-out infinite, entityGlow 3s ease-in-out infinite;
}
```

## Gradient Iridiscente (Singularity)
```css
.singularity-gradient {
  background: linear-gradient(90deg, #ff0080, #ff8c00, #ffe100, #00ff88, #00cfff, #7b2fff, #ff0080);
  background-size: 300% 300%;
  animation: iridescent 3s linear infinite;
}
@keyframes iridescent {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```
