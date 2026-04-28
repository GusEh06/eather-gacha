# DESIGN.md — Aether Gacha
**Versión:** 1.0  
**Referencia artística:** Cult of the Lamb · Hollow Knight · Hades · Darkest Dungeon  
**Estilo:** Cute-gore + Épica Fantástica Oscura  

---

## 1. Dirección Artística

### Concepto Central
La tensión visual entre lo adorable de las entidades y lo oscuro del mundo que las contiene. Los personajes pueden ser expresivos y semi-chibi, pero el universo que los rodea es antiguo, pesado y amenazante. Nada es inocente del todo.

### Palabras clave de diseño
`ritual` · `oscuridad funcional` · `peso visual` · `revelación` · `lo sagrado y lo profano`

### Referencias por elemento
- **Cult of the Lamb** → Ritualismo, símbolos, lo macabro que convive con lo cute
- **Hollow Knight** → Atmósfera de mundo olvidado, silencio antes del peligro
- **Hades** → Personajes expresivos con lore, paleta rica, energía de los colores
- **Darkest Dungeon** → Tipografía pesada, oscuridad como protagonista, tensión sostenida

---

## 2. Paleta de Colores

```css
:root {
  /* Base */
  --bg-void:        #0a0a0f;   /* Negro profundo — fondo absoluto */
  --bg-surface:     #1a1a2e;   /* Gris carbón — superficies de UI */
  --bg-elevated:    #16213e;   /* Azul-negro — cards, modales */

  /* Acentos primarios */
  --accent-aether:  #7b2fff;   /* Violeta Aether — color de marca */
  --accent-gold:    #f0a500;   /* Dorado — rareza Pulsar, UI premium */
  --accent-blood:   #c0392b;   /* Rojo sangre — rareza Eclipse, peligro */

  /* Acentos de rareza */
  --rarity-dust:    #8a8a8a;
  --rarity-nebula:  #4caf50;
  --rarity-comet:   #2196f3;
  --rarity-nova:    #9c27b0;
  --rarity-pulsar:  #f0a500;
  --rarity-eclipse: #c0392b;
  --rarity-singularity: /* gradient iridiscente — ver sección 7 */

  /* UI funcional */
  --text-primary:   #e8e8f0;
  --text-secondary: #8888aa;
  --text-muted:     #444466;
  --border-subtle:  rgba(123, 47, 255, 0.2);
  --border-active:  rgba(123, 47, 255, 0.6);
}
```

### Regla de uso de color
La base oscura es el 80% de cualquier pantalla. Los acentos existen para guiar la atención. El color de rareza de una entidad tiñe su carta, su glow y sus partículas — nunca la pantalla completa (excepto en el flash del reveal de Singularity).

---

## 3. Tipografía

### Display / Títulos: `Cinzel` o `MedievalSharp`
Para nombres de entidades, títulos de pantalla, nombres de paquetes. Evoca manuscrito mágico, inscripciones en piedra, pergamino antiguo. Pesos: 400 y 700.

### Body / UI funcional: `Rajdhani` o `Exo 2`
Para precios, cantidades, etiquetas, botones, descripciones cortas. Limpia, legible, con un toque técnico que contrasta bien con la display. Peso: 400 y 600.

### Regla tipográfica
Nunca usar Inter, Roboto, ni System UI. El contraste entre la fuente display (antigua, mágica) y la body (limpia, funcional) refuerza la dualidad del proyecto: mundo místico + plataforma de comercio.

---

## 4. Iconografía y Símbolos de Rareza

Los iconos de rareza son formas geométricas con el color correspondiente. Todos implementables como SVG inline o CSS shapes — no requieren assets externos.

| Rareza | Símbolo | Implementación |
|--------|---------|----------------|
| Dust | Punto · | CSS circle, 6px |
| Nebula | Nube difusa ☁ | SVG blob simple |
| Comet | Rombo ◇ | CSS rotated square |
| Nova | Estrella de 4 puntas ✦ | SVG path |
| Pulsar | Estrella radiante ✸ | SVG con rayos |
| Eclipse | Círculo con sombra parcial ◑ | CSS clip-path |
| Singularity | Espiral ⊛ | SVG animated |

El ícono de Singularity tiene una animación CSS de rotación lenta permanente.

---

## 5. Layout Maestro Global (Estructura Base)

Para lograr un diseño "espléndido" que emule la magia de los gachas premium sin perder nuestra arquitectura, todas las pantallas principales (Altar, Bazaar, Rift, Vault) seguirán este esquema de Layout Maestro:

- **Sidebar Izquierdo (Navegación):** Menú vertical con botones pesados/góticos (The Altar, The Bazaar, The Rift, The Vault, Collection).
- **Esquina Superior Derecha (HUD de Recursos):** Display prominente de Shards y Pity Counters, con barras de progreso estilizadas.
- **Centro (Escenario Principal):** El elemento visual foco (el portal del Rift, el círculo de invocación del Altar). 
- **Esquina Inferior Derecha (Llamados a la Acción):** Botones de acción principal (ej. "Invocar x1", "Invocar x10") gigantes, asimétricos y con efectos de partículas animadas.
- **Esquina Inferior Izquierda (Contexto):** Banners de eventos (ej. "Evento: Corazones Cósmicos") o detalles del ítem actual.

---

## 6. Diseño por Pantalla

### 6.1 The Altar

**Lo que requiere asset diseñado:**
- Las entidades (imágenes generadas con IA, estilo consistente)
- Los ojos de las entidades para la secuencia de oscuridad (pueden ser variantes del mismo asset recoloreado)
- La luna (SVG simple o PNG con transparencia)

**Lo que se hace en código:**
- Fondo completo: CSS gradient oscuro con capas
- Lápidas: CSS shapes o SVG inline, sin detalle excesivo
- Niebla: elementos `<div>` semitransparentes con `filter: blur()` y `animation: translateX` en loop
- Runas del altar: caracteres unicode de runas o SVG inline con `filter: drop-shadow` pulsante
- El altar mismo: CSS box con gradient, border-radius suave, glow violeta
- Eclipse de luna: overlay `<div>` con `border-radius: 50%` y `clip-path` que crece

**Composición:**
```
[luna top-right]
[niebla layer 1 — lenta]
[lápidas izquierda/derecha — estáticas]
[altar centro — con runas]
[niebla layer 2 — más rápida]
[UI overlay — Shards | Botones]
```

---

### 6.2 The Hollow Bazaar

**Lo que requiere asset diseñado:**
- Las imágenes de entidades (las mismas del catálogo)

**Lo que se hace en código:**
- Fondo: CSS gradient de cueva oscura con venas de color violeta tenue
- Jaulas de luz: `border: 1px solid` con color de rareza + `box-shadow` interior semitransparente
- Velas: CSS gradient vertical naranja-transparente con animación de flicker (opacity oscilante rápida)
- Hongos luminiscentes: círculos CSS pequeños con `filter: blur()` y glow verde tenue
- Grid de cards: CSS Grid responsive

**Card de entidad en el Bazaar:**
```
┌─────────────────────────────┐
│  [imagen entidad — idle]    │  ← float animation CSS
│                             │
│  Nombre Entidad      [★4]   │  ← rareza con color
│  Aether Binder user         │  ← vendedor
│                             │
│  1,200 ◈ Shards             │  ← precio con ícono
│  [  Comprar  ]              │  ← botón primario
└─────────────────────────────┘
```
El border de la card usa el color de rareza. El glow en hover es el mismo color pero más intenso.

---

### 6.3 The Rift

**Lo que requiere asset diseñado:**
- Imágenes de entidades

**Lo que se hace en código:**
- Portal: CSS `radial-gradient` animado con `border-radius: 50%` y una rotación lenta de capas
- Marco del portal: CSS border con constelaciones grabadas (SVG inline con puntos y líneas tenues)
- Efecto de "llegando del portal": entidad aparece con un scale desde 0 + opacity 0, animejs
- Contador regresivo: lógica JavaScript + fuente display grande

**Layout:**
```
[Portal visual — fondo]
  "El Rift se cierra en  02:14:33"
  
  [card] [card] [card]
  [card] [card] [card]
```

---

### 6.4 The Aether Vault

**Lo que requiere asset diseñado:**
- Nada. Completamente en código.

**Lo que se hace en código:**
- Fondo: paredes de piedra CSS con venas de cristal (gradients lineales en tonos violeta-azul)
- Pedestales: CSS box con sombra inferior y glow desde abajo
- Los frascos/relicarios de Shards: CSS shapes con gradient interno y animación de brillo
- El agujero negro del Singularity Core: `conic-gradient` rotando + `border-radius: 50%`

**Cards de paquete:**
```
┌───────────────────────┐
│   [visual del pack]   │  ← CSS/SVG, no imagen
│                       │
│  Singularity Core     │  ← display font
│  ████████████████     │  ← barra de valor visual
│                       │
│  1,600 + 400 bonus    │
│  $19.99               │
│  [ Adquirir ]         │
└───────────────────────┘
```
El paquete "Singularity Core" tiene una border animada con el gradient iridiscente para destacarse visualmente de los demás.

---

## 7. Secuencia de Invocación — Especificación de Animación

Esta es la pantalla más importante. Cada frame importa.

### Timeline completo (x1)

```
0ms      → Click en "Invocar"
0-50ms   → Validación + descuento de Shards (silencioso)
50ms     → FASE 1: Activación
  50-300ms   Runas se iluminan (animejs, stagger 50ms entre runas)
  200ms      Screen shake CSS arranca (suave, 2-3px amplitude)
  300ms      Nubes se aceleran (CSS transition en animation-duration)
  500ms      Eclipse de luna inicia (clip-path crece, 1000ms duration)
1500ms   → FASE 2: Colapso
  1500ms     Fade a negro (opacity 0 en 300ms)
  1800ms     HIT STOP — todo se pausa 100ms
1900ms   → FASE 3: Ojos
  1900ms     Primer par de ojos aparece (animejs fade in)
  2000ms     Segundo par (si rareza ≥ Nebula)
  ...        Escalonado por rareza
  
  [ECLIPSE]
  2400ms     Ojos muestran animación de miedo (scale down + shake)
  2600ms     Algunos ojos se desplazan hacia bordes
  
  [SINGULARITY]  
  2400ms     Flash negro total (200ms)
  2600ms     Silencio absoluto 200ms
  2800ms     Dos ojos enormes aparecen (scale desde 0, animejs spring)

3500ms   → FASE 4: Reveal
  3500ms     Squash (scale X 1.3, scale Y 0.7, 80ms)
  3580ms     HIT STOP 80ms
  3660ms     Stretch — entidad explota hacia espectador (scale 0.1 → 1.1 → 1.0)
  3660ms     tsParticles burst con preset de rareza
  3900ms     Entidad settle en posición final
  4000ms     Nombre + rareza aparecen (fade in animejs)
  4200ms     Botones de acción aparecen
```

### Presets de tsParticles por rareza

```javascript
const particlePresets = {
  dust:        { count: 15,  color: "#8a8a8a", speed: 1,   size: 2 },
  nebula:      { count: 25,  color: "#4caf50", speed: 1.5, size: 3 },
  comet:       { count: 40,  color: "#2196f3", speed: 2,   size: 3 },
  nova:        { count: 60,  color: "#9c27b0", speed: 2.5, size: 4 },
  pulsar:      { count: 80,  color: "#f0a500", speed: 3,   size: 4 },
  eclipse:     { count: 120, color: "#c0392b", speed: 4,   size: 5 },
  singularity: { count: 200, color: "random",  speed: 5,   size: 5 }
}
```

### Función de Screen Shake (CSS)
```css
@keyframes screenShake {
  0%   { transform: translate(0, 0); }
  20%  { transform: translate(-2px, 1px); }
  40%  { transform: translate(2px, -1px); }
  60%  { transform: translate(-1px, 2px); }
  80%  { transform: translate(1px, -2px); }
  100% { transform: translate(0, 0); }
}

.shake {
  animation: screenShake 0.08s ease-in-out infinite;
}
```
Se activa añadiendo la clase `.shake` al container y se remueve después de la fase de activación.

---

## 8. El Gradient Iridiscente (Singularity)

Para todo lo relacionado con rareza Singularity se usa este gradient animado:

```css
.singularity-gradient {
  background: linear-gradient(
    90deg,
    #ff0080, #ff8c00, #ffe100, #00ff88, #00cfff, #7b2fff, #ff0080
  );
  background-size: 300% 300%;
  animation: iridescent 3s linear infinite;
}

@keyframes iridescent {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

---

## 9. Idle Animation de Entidades

Las entidades en el Bazaar y en el Rift tienen una animación idle de "respiración" implementada en CSS:

```css
@keyframes entityFloat {
  0%, 100% { transform: translateY(0px);   }
  50%       { transform: translateY(-6px);  }
}

@keyframes entityGlow {
  0%, 100% { filter: drop-shadow(0 0 8px var(--rarity-color)); }
  50%       { filter: drop-shadow(0 0 16px var(--rarity-color)); }
}

.entity-idle {
  animation: 
    entityFloat 3s ease-in-out infinite,
    entityGlow  3s ease-in-out infinite;
}
```
`--rarity-color` se setea inline según la rareza de la entidad.

---

## 10. Guía de Generación de Entidades con IA

### Prompt base de estilo (aplicar a todas las entidades)
```
Semi-chibi character design, dark fantasy aesthetic, 
expressive glowing eyes as the defining visual trait, 
cute-gore style (adorable design in a dark world), 
transparent background, centered composition, 
2D illustration, vibrant colors against dark, 
[DESCRIPCIÓN ESPECÍFICA DE LA ENTIDAD]
```

### Variables por entidad
- `época/origen`: "Ancient Mesopotamian deity", "Victorian ghost", "Far-future cosmic entity", etc.
- `arquetipo`: Guerrero / Oráculo / Devorador / Guardián / Trickster
- `rasgo visual clave`: el elemento que la hace única e identificable
- `rareza visual`: Dust → diseño simple y monocromático. Singularity → diseño complejo y multicolor

### Los ojos (elemento unificador)
Cada entidad DEBE tener ojos visualmente memorables y distintos a otras. Los ojos son lo que aparece primero en la oscuridad durante la invocación. Describir en `descripcionOjos` del schema.

Ejemplos:
- `"ojos como estrellas muertas, grises, sin luz"`
- `"pupilas en forma de luna creciente, doradas"`
- `"múltiples ojos pequeños distribuidos por el cuerpo, todos rojos"`

### Dimensiones sugeridas
- Canvas: 512x512px o 1024x1024px, fondo transparente (PNG)
- Las entidades de rareza mayor pueden tener más detalle y mayor resolución

---

## 11. Qué Requiere Asset vs Qué es Código

### Assets obligatorios (generados con IA)
| Asset | Cantidad | Notas |
|-------|----------|-------|
| Imágenes de entidades | Todas las que se poblen | PNG, fondo transparente |
| Ojos para secuencia de oscuridad | 1 set por rareza (7 sets) | PNG, fondo negro o transparente |
| Luna para el altar | 1 | SVG o PNG |

### Completamente en código (sin assets)
| Elemento | Técnica |
|----------|---------|
| Fondo del altar | CSS gradient + layers |
| Niebla | CSS animation en divs semitransparentes |
| Runas | Unicode/SVG + CSS glow |
| Portal del Rift | CSS radial-gradient animado |
| Fondo del Bazaar | CSS gradient de cueva |
| Velas | CSS gradient + flicker animation |
| Pedestales del Vault | CSS box + sombras |
| Agujero negro del Singularity Core | CSS conic-gradient rotando |
| Bordes de cards por rareza | CSS border + box-shadow con variable de rareza |
| Todos los efectos de partículas | tsParticles con presets JSON |
| Todos los screen shakes | CSS keyframes |
| Iconos de rareza | SVG inline |
| Idle animation de entidades | CSS keyframes |
