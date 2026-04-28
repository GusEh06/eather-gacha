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
- **Animaciones:** animejs + tsParticles + CSS keyframes (Framer Motion ha sido reemplazado por animejs para mayor "magia" y precisión en timelines)
- **Estado del servidor:** TanStack Query
- **Auth:** Clerk React SDK
- **Estilos:** CSS Modules o Tailwind (sin utility-first puro — usar clases semánticas)

## Paleta de Colores (CSS Variables)
Siempre usar variables CSS definidas en `:root`. Ver DESIGN.md para la lista completa.
Las variables de rareza se aplican inline: `style={{ "--rarity-color": "var(--rarity-nova)" }}`

## Tipografía
- Display: `Cinzel` (Google Fonts) — nombres, títulos
- UI: `Rajdhani` (Google Fonts) — precios, botones, etiquetas

## Estructura de Rutas y Layout Maestro
Todas las rutas comparten un **Layout Maestro** inspirado en la estética de los gachas premium (magia, fantasía oscura):
- **Sidebar Izquierdo:** Navegación principal (Altar, Bazaar, Rift, Vault, Collection) con botones de aspecto pesado/gótico.
- **Arriba Derecha:** HUD de recursos (Shards, Pity) con estilo visual temático.
- **Centro:** Escenario principal donde ocurre la acción.
- **Abajo Derecha:** Botones de acción principales (ej. Invocar).
- **Abajo Izquierda:** Contexto y Banners de eventos actuales.

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
- Idle animation: `entityFloat` + `entityGlow` CSS keyframes (o con `animejs` en direction 'alternate')
- En hover: glow se intensifica, scale 1.02 animado con `animejs`

### `<RarityBadge />`
Props: `rareza`
- Muestra el ícono SVG de la rareza + el nombre
- Color de texto = `var(--rarity-{rareza})`

### `<ShardsDisplay />`
Props: `amount`
- Siempre visible en el header/navbar
- Muestra el ícono ◈ + cantidad formateada con separador de miles
- Animación de "increment" cuando los Shards aumentan (usar interpolación con `animejs` sobre el valor de texto)

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

### Screen Shake con animejs
```typescript
const triggerShake = () => {
  anime({
    targets: '#altar-container',
    translateX: [
      { value: -2, duration: 20 },
      { value: 2, duration: 20 },
      { value: -1, duration: 20 },
      { value: 1, duration: 20 },
      { value: 0, duration: 20 }
    ],
    loop: 3,
    easing: 'easeInOutSine'
  });
}
```

### Animación de Invocación (Timeline con animejs)
```typescript
// Usando anime.timeline para sincronizar la aparición con gran detalle
const invocationTimeline = anime.timeline({
  easing: 'easeOutExpo',
  autoplay: false
});

invocationTimeline
  .add({
    targets: '.runes',
    opacity: [0, 1],
    delay: anime.stagger(50) // stagger mágico para las runas
  })
  .add({
    targets: '.moon-eclipse',
    clipPath: ['circle(0% at 50% 50%)', 'circle(100% at 50% 50%)'],
    duration: 1000,
    easing: 'linear'
  }, '+=300'); // offset para dar tiempo al shake
```

### Squash & Stretch con animejs
```typescript
const revealEntity = () => {
  anime({
    targets: '.entity-container',
    scaleX: [
      { value: 0.1, duration: 0 },
      { value: 1.4, duration: 80, easing: 'easeOutQuad' }, // Squash
      { value: 0.8, duration: 100, easing: 'easeInQuad' }, // Stretch
      { value: 1, duration: 300, easing: 'spring(1, 80, 10, 0)' } // Settle
    ],
    scaleY: [
      { value: 0.1, duration: 0 },
      { value: 0.6, duration: 80, easing: 'easeOutQuad' },
      { value: 1.2, duration: 100, easing: 'easeInQuad' },
      { value: 1, duration: 300, easing: 'spring(1, 80, 10, 0)' }
    ],
    opacity: { value: [0, 1], duration: 100 }
  });
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
