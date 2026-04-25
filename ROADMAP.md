# ROADMAP.md — Aether Gacha
**MVP Deadline:** Martes  
**Días disponibles:** 4  
**Modo:** Colaborativo — entorno reproducible via Docker  

---

## Fase 0 — Setup, Instalación y Dockerización
**Objetivo:** Cualquier colaborador clona el repo y levanta el proyecto con un solo comando.

### 0.1 Prerequisitos en la máquina local
- Node.js 20+
- Bun 1.x (`curl -fsSL https://bun.sh/install | bash`)
- Docker Desktop (o Docker Engine + Docker Compose)
- Git

### 0.2 Estructura de carpetas a crear
```
aether-gacha/
├── apps/
│   ├── web/        ← TanStack Start
│   └── api/        ← Hono + Bun
└── packages/
    └── shared/     ← tipos TypeScript compartidos
```

### 0.3 Inicializar el monorepo
```bash
# En la raíz
bun init -y
```

`package.json` raíz con workspaces:
```json
{
  "name": "aether-gacha",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "docker compose up",
    "dev:web": "bun --cwd apps/web dev",
    "dev:api": "bun --cwd apps/api dev"
  }
}
```

### 0.4 Inicializar cada workspace
```bash
# Frontend
cd apps/web
bunx create-tsrouter-app@latest . --framework=react --target=start

# Backend
cd apps/api
bun init -y
bun add hono
bun add -d @types/bun

# Shared types
cd packages/shared
bun init -y
```

### 0.5 Dependencias por workspace

**apps/api:**
```bash
bun add hono @hono/node-server mongodb @clerk/backend stripe
bun add -d typescript @types/bun
```

**apps/web:**
```bash
bun add @tanstack/react-router @tanstack/start @tanstack/react-query
bun add framer-motion @tsparticles/react @tsparticles/slim
bun add @clerk/tanstack-react-start
bun add -d typescript vite
```

### 0.6 Variables de entorno

**`.env`** en la raíz (nunca se commitea):
```env
# MongoDB
MONGODB_URI=mongodb://root:root@mongo:27017/aether?authSource=admin

# Clerk
CLERK_SECRET_KEY=
VITE_CLERK_PUBLISHABLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
API_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001
```

**`.env.example`** en la raíz (sí se commitea — guía para colaboradores):
```env
MONGODB_URI=mongodb://root:root@mongo:27017/aether?authSource=admin
CLERK_SECRET_KEY=sk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
API_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001
```

### 0.7 Dockerización

**`docker-compose.yml`** en la raíz:
```yaml
version: "3.9"

services:
  mongo:
    image: mongo:7
    container_name: aether-mongo
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
      MONGO_INITDB_DATABASE: aether
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    container_name: aether-api
    restart: unless-stopped
    env_file: .env
    ports:
      - "3001:3001"
    depends_on:
      - mongo
    volumes:
      - ./apps/api/src:/app/src   # hot reload en desarrollo

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    container_name: aether-web
    restart: unless-stopped
    env_file: .env
    ports:
      - "3000:3000"
    depends_on:
      - api
    volumes:
      - ./apps/web/app:/app/app   # hot reload en desarrollo

volumes:
  mongo_data:
```

**`apps/api/Dockerfile`:**
```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bunfig.toml* ./
RUN bun install

COPY . .

EXPOSE 3001
CMD ["bun", "run", "src/index.ts"]
```

**`apps/web/Dockerfile`:**
```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .

EXPOSE 3000
CMD ["bun", "run", "dev"]
```

**`.dockerignore`** (uno por cada app):
```
node_modules
.env
dist
.turbo
```

### 0.8 Seed de base de datos
Crear `apps/api/src/db/seed.ts` con al menos:
- 5 entidades Dust
- 3 entidades Nebula
- 2 entidades Comet
- 1 entidad Nova
- 1 entidad Pulsar
- 1 entidad Eclipse
- 1 entidad Singularity

Script ejecutable con:
```bash
bun run src/db/seed.ts
```

### 0.9 Verificación de la fase
```bash
# Clonar el repo en una máquina limpia y ejecutar:
docker compose up

# Debe levantar:
# ✓ MongoDB en localhost:27017
# ✓ API en localhost:3001
# ✓ Web en localhost:3000
```

**Criterio de éxito:** Un colaborador nuevo clona el repo, copia `.env.example` a `.env`, completa las keys de Clerk y Stripe, ejecuta `docker compose up` y el proyecto corre sin pasos adicionales.

---

## Fase 1 — Fundación del Proyecto
**Objetivo:** Tipos compartidos, conexión a MongoDB, auth de Clerk funcionando, estructura de rutas lista.

### Tareas
- [ ] Definir todos los tipos en `packages/shared/src/types.ts` (Rareza, Entity, UserProfile, MarketListing, RiftSlot, ShardPackage)
- [ ] Conexión a MongoDB en `apps/api/src/db/client.ts`
- [ ] Referencias tipadas a colecciones en `apps/api/src/db/collections.ts`
- [ ] Middleware de auth Clerk en `apps/api/src/middleware/auth.ts`
- [ ] Webhook `user.created` de Clerk → crear documento en `users` con 320 Shards
- [ ] Estructura de rutas TanStack Start con layouts vacíos (las 5 rutas)
- [ ] Navbar con `<ShardsDisplay />` y navegación entre pantallas
- [ ] Ejecutar seed de entidades de prueba

### Criterio de éxito
Un usuario puede registrarse con Clerk, el backend crea su documento en MongoDB con 320 Shards, y puede navegar entre las 4 pantallas (vacías) sin errores.

---

## Fase 2 — The Altar (Invocación)
**Objetivo:** La pantalla más importante del proyecto, completamente funcional con animación.

### Tareas
- [ ] Endpoint `POST /invoke` con lógica de probabilidades + pity system completo
- [ ] `AltarScene.tsx` — escenario visual (fondo, niebla CSS, altar, luna)
- [ ] `InvokeSequence.tsx` — máquina de estados de la animación (idle → activating → collapsing → eyes → revealing → complete)
- [ ] `EyesSequence.tsx` — ojos en la oscuridad con comportamiento por rareza
- [ ] Screen shake CSS activado en fase de activación
- [ ] tsParticles burst en el reveal con preset por rareza
- [ ] Squash & Stretch de la entidad con Framer Motion
- [ ] Hit Stop en colapso y en el peak del reveal
- [ ] `EntityReveal.tsx` — entidad post-reveal con nombre, rareza y botones de acción
- [ ] Flujo x10 con flip de cartas escalonado
- [ ] Restricción: Dust y Nebula no muestran el botón "Vender en Bazaar"

### Criterio de éxito
La secuencia completa de invocación funciona de principio a fin. El pity counter se actualiza correctamente en MongoDB. La animación responde visualmente diferente para cada rareza.

---

## Fase 3 — The Hollow Bazaar + The Rift
**Objetivo:** Los dos modelos de comercio secundario funcionando.

### Tareas — Bazaar
- [ ] Endpoint `GET /market/list` con filtros por rareza y orden por precio
- [ ] Endpoint `POST /market/sell` — crear listing
- [ ] Endpoint `POST /market/buy` — transacción atómica en MongoDB
- [ ] `ListingCard.tsx` con idle animation de entidad, rareza, vendedor y precio
- [ ] `ListingFilters.tsx` — filtro por rareza y ordenamiento
- [ ] `SellModal.tsx` — formulario de precio + confirmación
- [ ] Modal de compra con precio final y "Recibes: X Shards" visible para el vendedor
- [ ] Pantalla de colección personal (`/collection`) con opción de listar

### Tareas — Rift
- [ ] Cron job en Bun (`src/crons/riftRotation.ts`) que corre a medianoche
- [ ] Endpoint `GET /rift/current` — entidades del día actual
- [ ] Endpoint `POST /rift/buy` — compra directa
- [ ] `RiftSlot.tsx` — card con animación de "llegando del portal" al entrar
- [ ] `RiftTimer.tsx` — contador regresivo HH:MM:SS
- [ ] Layout visual del portal (CSS radial-gradient animado)

### Criterio de éxito
Un usuario puede listar una entidad en el Bazaar, otro usuario puede comprarla, y los Shards se transfieren correctamente con el 5% de tributo destruido. El Rift muestra entidades distintas cada día.

---

## Fase 4 — The Aether Vault + Polish
**Objetivo:** Integración Stripe completa y pulido general para la demo.

### Tareas — Vault
- [ ] Endpoint `POST /vault/create-checkout` — sesión de Stripe Checkout
- [ ] Endpoint `POST /vault/webhook` — verificar firma + acreditar Shards
- [ ] `PackageCard.tsx` — los 4 paquetes con sus visuales CSS
- [ ] Animación del agujero negro en Singularity Core (CSS conic-gradient)
- [ ] Modal de confirmación con desglose antes de ir a Stripe
- [ ] Stripe en modo test (usar claves `sk_test_` y `pk_test_`)

### Tareas — Polish para demo
- [ ] Loading states en todas las acciones async (invocar, comprar, vender)
- [ ] Manejo de errores visible al usuario (Shards insuficientes, listing ya vendido)
- [ ] Animación de incremento de Shards cuando se acreditan (Framer Motion)
- [ ] Revisar que todos los colores usen variables CSS (ningún hex hardcodeado)
- [ ] Probar el flujo completo: registro → onboarding → invocar → listar → comprar → comprar Shards
- [ ] Preparar datos de demo en seed (entidades variadas en el Bazaar, Rift activo)

### Criterio de éxito
Los 9 criterios de éxito del PRD están cumplidos. El flujo completo B2C + C2C es demostrable sin errores visibles.

---

## Resumen de Fases

| Fase | Nombre | Foco | Prioridad |
|------|--------|------|-----------|
| 0 | Setup + Docker | Entorno reproducible | 🔴 Crítica |
| 1 | Fundación | Tipos, DB, Auth, rutas | 🔴 Crítica |
| 2 | The Altar | Core del producto | 🔴 Crítica |
| 3 | Bazaar + Rift | Comercio C2C y B2C | 🟡 Alta |
| 4 | Vault + Polish | Stripe y demo lista | 🟡 Alta |

**Si el tiempo aprieta:** Fase 0, 1 y 2 son innegociables. La Fase 3 puede presentarse con funcionalidad básica. La Fase 4 puede mostrarse con Stripe en modo test sin polish visual.
