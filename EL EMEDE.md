# EL EMEDE — Documentación Completa del Proyecto Aether Gacha

---

## 1. ¿Qué es Aether Gacha?

Aether Gacha es una aplicación web de tipo gacha (sistema de invocación aleatoria de personajes) ambientada en un universo de fantasía oscura llamado "El Aether". Los usuarios se registran, obtienen Shards (moneda interna), invocan entidades de distintas rarezas, las coleccionan, las compran/venden entre sí en un mercado P2P (El Bazar), y pueden conseguir entidades específicas en una tienda rotativa diaria (Las Fisuras).

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────┐
│                   CLIENTE (Browser)                  │
│         TanStack Start + React + Framer Motion       │
│              puerto 3000 (Docker)                    │
└────────────────────┬────────────────────────────────┘
                     │ HTTP / fetch con Bearer token
                     │
┌────────────────────▼────────────────────────────────┐
│                  API (Backend)                       │
│              Hono + Bun + Node                       │
│              puerto 3001 (Docker)                    │
└──────┬──────────┬──────────┬──────────┬─────────────┘
       │          │          │          │
  MongoDB      Clerk      Stripe    Firebase
  (datos)    (auth JWT)  (pagos)   (imágenes)
```

El proyecto es un **monorepo** con dos aplicaciones:

| App | Ruta | Rol |
|-----|------|-----|
| `apps/api` | puerto 3001 | Backend REST (Hono + Bun) |
| `apps/web` | puerto 3000 | Frontend SSR (TanStack Start) |

Ambas corren en **Docker** via `docker-compose.yml`. Nunca se instalan dependencias en el host — todo corre dentro de los contenedores.

---

## 3. Stack Tecnológico

### Backend (`apps/api`)
| Tecnología | Rol |
|------------|-----|
| **Bun** | Runtime JS/TS — reemplaza Node, más rápido en I/O |
| **Hono** | Framework HTTP minimalista, similar a Express pero tipado |
| **MongoDB** (mongo:7) | Base de datos principal (documentos) |
| **Clerk Backend SDK** | Verificación de JWT tokens de sesión |
| **Stripe SDK** | Creación de sesiones de pago y validación de webhooks |
| **Firebase Admin SDK** | Subida de imágenes al bucket de Storage |

### Frontend (`apps/web`)
| Tecnología | Rol |
|------------|-----|
| **TanStack Start** | Framework SSR sobre React (similar a Next.js) |
| **React** | UI library |
| **TanStack Router** | Enrutamiento file-based con type-safety |
| **TanStack Query** | Fetching, caché y sincronización de datos del servidor |
| **Clerk React SDK** | Autenticación — hooks, componentes, sesión |
| **Framer Motion** | Animaciones declarativas |
| **Anime.js** | Animaciones imperativas (entrada del layout) |
| **Vite** | Bundler y dev server |

### Infraestructura
| Servicio | Rol |
|----------|-----|
| **Docker Compose** | Orquesta mongo + api + web + stripe-cli |
| **Firebase Storage** | Almacena imágenes de entidades en producción |
| **Stripe** | Procesamiento de pagos reales |
| **Clerk** | Gestión de usuarios, sesiones y autenticación |

---

## 4. Estructura de Archivos

```
eather-gacha/
├── docker-compose.yml          ← orquestación de contenedores
├── .env                        ← variables de entorno (no commiteado)
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── index.ts        ← servidor Hono, registra rutas y cron
│   │       ├── config/
│   │       │   └── firebase.ts ← inicializa Firebase Admin SDK
│   │       ├── db/
│   │       │   ├── client.ts   ← conexión MongoDB (singleton)
│   │       │   ├── collections.ts ← helpers tipados por colección
│   │       │   └── seed.ts     ← poblar DB con entidades y demo data
│   │       ├── middleware/
│   │       │   ├── auth.ts     ← verifica JWT de Clerk
│   │       │   └── adminAuth.ts ← verifica rol "admin" en publicMetadata
│   │       ├── routes/
│   │       │   ├── clerk.ts    ← webhook de Clerk (crear usuario)
│   │       │   ├── user.ts     ← perfil del usuario
│   │       │   ├── invoke.ts   ← lógica de invocación gacha
│   │       │   ├── market.ts   ← bazar P2P
│   │       │   ├── rift.ts     ← tienda diaria rotatoria
│   │       │   ├── vault.ts    ← compra de shards con Stripe
│   │       │   └── admin.ts    ← CRUD de entidades (admin only)
│   │       ├── services/
│   │       │   ├── gacha.ts    ← algoritmo de rareza y pity
│   │       │   └── rift.ts     ← generación de rotación diaria
│   │       └── crons/
│   │           └── riftRotation.ts ← cron a medianoche UTC
│   └── web/
│       └── src/
│           ├── routes/
│           │   ├── __root.tsx  ← ClerkProvider, layout raíz, login
│           │   ├── index.tsx   ← The Altar (gacha)
│           │   ├── bazaar.tsx  ← El Bazar
│           │   ├── rift.tsx    ← Las Fisuras
│           │   ├── vault.tsx   ← La Bóveda (shards)
│           │   ├── collection.tsx ← Colección del usuario
│           │   ├── admin.tsx   ← Layout del panel admin
│           │   └── admin/
│           │       └── index.tsx ← gestión de entidades
│           ├── components/
│           │   ├── altar/      ← secuencia de invocación
│           │   ├── bazaar/     ← cards y modales del mercado
│           │   ├── rift/       ← slots y timer del rift
│           │   ├── vault/      ← paquetes de shards
│           │   └── ui/         ← Navbar, MasterLayout, AuthPanel...
│           ├── hooks/          ← useInvoke, useMarket, useInventory...
│           ├── config/
│           │   └── rarityConfig.ts ← colores, labels e íconos por rareza
│           └── styles.css      ← estilos globales + overrides de Clerk
```

---

## 5. Base de Datos — MongoDB

### Colecciones

#### `users`
```json
{
  "clerkId": "user_xxx",
  "username": "binder_name",
  "title": "Aether Binder",
  "shards": 9999,
  "pityCounter": 0,
  "pityMythicCounter": 0,
  "inventory": ["ObjectId", "..."],
  "createdAt": "Date"
}
```

#### `entities`
```json
{
  "_id": "ObjectId",
  "nombre": "Vael",
  "rareza": "dust",
  "epoca": "Era del Hielo",
  "arquetipo": "Guardián",
  "descripcionLore": "...",
  "descripcionOjos": "...",
  "imageUrl": "http://localhost:3000/assets/entities/vael.png",
  "disponibleGacha": true,
  "disponibleRift": false
}
```

#### `user_entities`
```json
{
  "_id": "ObjectId",
  "entityId": "ObjectId",
  "ownerId": "user_xxx",
  "obtainedAt": "Date",
  "obtainedVia": "gacha | rift | market"
}
```

#### `market_listings`
```json
{
  "sellerId": "user_xxx",
  "sellerUsername": "binder_name",
  "userEntityId": "ObjectId",
  "entitySnapshot": { ...copia de la entidad... },
  "priceShards": 450,
  "status": "active | sold",
  "createdAt": "Date"
}
```

#### `rift_rotation`
```json
{
  "date": "2026-04-30",
  "slots": [
    { "entityId": "ObjectId", "priceShards": 200, "sold": false }
  ],
  "expiresAt": "Date"
}
```

---

## 6. Casos de Uso

| # | Caso de Uso | Actor | Descripción |
|---|-------------|-------|-------------|
| CU-01 | Registrarse | Usuario anónimo | Crea cuenta con email + contraseña via Clerk SDK |
| CU-02 | Iniciar sesión | Usuario anónimo | Autentica con email/usuario + contraseña |
| CU-03 | Invocar x1 | Usuario autenticado | Gasta 160 shards, obtiene 1 entidad aleatoria |
| CU-04 | Invocar x10 | Usuario autenticado | Gasta 1600 shards, obtiene 10 entidades |
| CU-05 | Ver colección | Usuario autenticado | Lista todas sus user_entities con datos de entidad |
| CU-06 | Comprar shards | Usuario autenticado | Paga con tarjeta via Stripe, recibe shards |
| CU-07 | Listar en Bazar | Usuario autenticado | Pone una entidad en venta a precio definido |
| CU-08 | Comprar en Bazar | Usuario autenticado | Compra entidad de otro usuario con shards |
| CU-09 | Comprar en Rift | Usuario autenticado | Compra entidad específica del rift diario |
| CU-10 | Ver perfil | Usuario autenticado | Ve nombre, email y gestiona cuenta via Clerk |
| CU-11 | Gestionar entidades | Admin | CRUD de entidades desde panel `/admin` |

---

## 7. Autenticación — Clerk

### ¿Qué es Clerk?

Clerk es un servicio de autenticación que maneja registro, login, sesiones y gestión de usuarios. Provee SDKs para frontend y backend.

### Flujo completo de autenticación

```
1. Usuario completa formulario en CustomSignInForm / CustomSignUpForm
2. Frontend llama useSignIn().signIn.create({ identifier, password })
   o useSignUp().signUp.create({ emailAddress, password, username })
3. Clerk valida y devuelve un resultado con status
4. Si status === "complete" → clerk.setActive({ session: result.createdSessionId })
5. Clerk guarda la sesión en una cookie httpOnly
6. En cada request al API, el frontend envía: Authorization: Bearer <JWT>
7. El backend verifica el JWT con verifyToken() del SDK de Clerk
8. Si el token es válido, extrae el clerkId (payload.sub) y lo inyecta en el contexto
```

### SDK en el Frontend (`@clerk/tanstack-react-start`)

| Hook | Uso |
|------|-----|
| `useAuth()` | `isSignedIn`, `getToken()` para obtener JWT |
| `useUser()` | Datos del usuario (username, email, publicMetadata) |
| `useSignIn()` | Objeto `signIn` para login custom |
| `useSignUp()` | Objeto `signUp` para registro + verificación de email |
| `useClerk()` | `setActive()`, `signOut()` |

### Componentes usados
- `<ClerkProvider>` — envuelve toda la app, maneja la sesión globalmente
- `<UserButton>` — botón de perfil con popover (en `MasterLayout.tsx`)
- `<Show when="signed-in">` — renderizado condicional por estado de auth

### Verificación de email en registro
```
1. signUp.create({ emailAddress, password, username })
2. created.prepareVerification({ strategy: "email_code" })
3. Clerk envía email con código de 6 dígitos
4. signUp.attemptVerification({ strategy: "email_code", code })
5. Si completo → setActive({ session })
```

### Roles de Admin
- Los roles se guardan en `user.publicMetadata.role`
- Se asignan desde el dashboard de Clerk o via Clerk Backend SDK
- El frontend verifica: `user.publicMetadata?.role !== "admin"` → deniega acceso
- El backend tiene `adminMiddleware` que verifica el mismo campo en el JWT

### Webhook de Clerk (`/clerk`)
Cuando un usuario se registra, Clerk dispara un evento `user.created` al backend. Esto crea el documento en MongoDB con shards iniciales.

---

## 8. Pagos — Stripe

### ¿Qué es Stripe?

Stripe es un procesador de pagos. En este proyecto se usa para vender paquetes de Shards (moneda del juego).

### Paquetes disponibles

| ID | Nombre | Shards | Precio |
|----|--------|--------|--------|
| `spark_of_aether` | Spark of Aether | 100 | $1.99 |
| `astral_fragment` | Astral Fragment | 350 | $4.99 |
| `nova_surge` | Nova Surge | 850 | $9.99 |
| `singularity_core` | Singularity Core | 2000 | $19.99 |

### Flujo completo de pago

```
1. Usuario clickea "Buy" en un paquete (vault.tsx)
2. Frontend llama POST /vault/create-checkout { packageId }
   con Authorization: Bearer <JWT>
3. Backend crea Stripe Checkout Session con:
   - price_data (precio y nombre del paquete)
   - metadata: { clerkId, packageId }
   - success_url y cancel_url
4. Backend devuelve { url: "https://checkout.stripe.com/..." }
5. Frontend redirige al usuario a la URL de Stripe
6. Usuario paga con tarjeta en la página hosted de Stripe
7. Stripe redirige a success_url (/vault?success=true)
8. Stripe envía evento "checkout.session.completed" al webhook
9. POST /vault/webhook recibe el evento
10. Backend verifica la firma del webhook con STRIPE_WEBHOOK_SECRET
11. Extrae clerkId y packageId de session.metadata
12. Hace $inc en MongoDB: user.shards += pkg.shards
13. Usuario ve sus shards actualizados
```

### Stripe CLI (desarrollo local)
Stripe necesita una URL pública para enviar webhooks. En local, se usa la Stripe CLI para hacer un tunnel:

```
# Corre en docker-compose automáticamente:
stripe listen --forward-to http://api:3001/vault/webhook
```

Genera un `STRIPE_CLI_WEBHOOK_SECRET` que el backend usa para verificar eventos locales.

### Seguridad del Webhook
El backend intenta verificar la firma con dos secretos en orden: `STRIPE_CLI_WEBHOOK_SECRET` (local) y `STRIPE_WEBHOOK_SECRET` (producción). Si ninguno está configurado, acepta el evento sin verificar (solo para desarrollo).

---

## 9. Almacenamiento de Imágenes — Firebase Storage

### ¿Qué es Firebase Storage?

Google Cloud Storage expuesto via Firebase. Almacena las imágenes PNG de las entidades.

### Uso en este proyecto

El SDK de **Firebase Admin** (`firebase-admin`) se usa **solo en el backend** para subir imágenes cuando se crea una entidad desde el panel de admin:

```
1. Admin sube imagen desde /admin
2. Backend recibe el File via multipart/form-data
3. bucket.file(fileName).save(buffer, { public: true })
4. Genera URL pública: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media
5. Guarda la URL en MongoDB junto a la entidad
```

### Modo local (desarrollo)
Las imágenes están en `apps/web/public/assets/entities/` y el seed usa URLs locales (`http://localhost:3000/assets/entities/{nombre}.png`). En producción deberían subirse a Firebase.

### Credenciales necesarias en `.env`
```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
```

Si no están configuradas, Firebase Admin no se inicializa y el endpoint de crear entidades devuelve 500.

---

## 10. Sistema Gacha — Algoritmo de Rareza y Pity

### Rarezas y probabilidades base

| Rareza | Probabilidad | Color | Bazaar |
|--------|-------------|-------|--------|
| dust | ~60.9% | Gris | No |
| nebula | ~25% | Verde | No |
| comet | ~10% | Azul | Sí |
| nova | ~4% | Púrpura | Sí |
| pulsar | ~2.9% | Dorado | Sí |
| eclipse | ~0.09% | Rojo | Sí |
| singularity | ~0.01% | Violeta | No |

### Sistema de Pity
El pity garantiza que el jugador eventualmente obtenga rarezas altas:

- **`pityCounter`**: se incrementa en cada pull. Si llega a **89**, garantiza un Pulsar o superior.
- **`pityMythicCounter`**: se incrementa en cada pull. Si llega a **179**, garantiza un Eclipse o Singularity.
- **Soft pity**: desde el pull 70, la probabilidad de Pulsar aumenta 6% por cada pull adicional.
- Cuando se obtiene Pulsar+, `pityCounter` se resetea a 0.
- Cuando se obtiene Eclipse/Singularity, `pityMythicCounter` también se resetea.

### Flujo de invocación (x1)

```
1. POST /invoke { mode: "x1" }
2. Backend verifica shards suficientes con findOneAndUpdate atómico
3. calcularRareza(pityCounter, pityMythicCounter) → elige rareza
4. actualizarPity() → nuevos contadores
5. seleccionarEntidad(db, rareza) → entidad aleatoria de esa rareza
6. insertOne en user_entities
7. Actualiza pityCounter, pityMythicCounter e inventory en users
8. Devuelve array de resultados con entidad completa
```

---

## 11. El Bazar — Mercado P2P

Los usuarios pueden listar entidades de rareza comet, nova, pulsar o eclipse (dust y nebula no son comerciables).

### Flujo de venta
```
1. Usuario clickea "Listar en el Bazar" desde su colección
2. Modal pide precio en shards
3. POST /market/sell { userEntityId, priceShards }
4. Backend crea market_listing con entitySnapshot embebido
5. La entidad sigue en user_entities del vendedor (no se transfiere hasta la venta)
```

### Flujo de compra
```
1. Comprador ve listing en /bazaar
2. Clickea "Buy" → modal de confirmación
3. POST /market/buy { listingId }
4. Backend verifica shards del comprador
5. Transfiere shards: comprador - precio, vendedor + precio
6. Transfiere user_entity: ownerId cambia al comprador
7. listing.status → "sold"
```

---

## 12. Las Fisuras (Rift) — Tienda Diaria

Muestra 5 entidades específicas que se pueden comprar directamente con shards. Se renueva cada medianoche UTC.

### Generación de rotación
```
1. Al iniciar la API, se ejecuta getCurrentRiftRotation()
2. Si ya existe rotación para hoy → la devuelve
3. Si no → generateRiftRotation(): toma todas las entidades con disponibleRift: true,
   las mezcla aleatoriamente, toma las primeras 5, y las guarda con $setOnInsert (idempotente)
4. Un cron se dispara a medianoche UTC → genera la rotación del día siguiente
```

### Precios del Rift

| Rareza | Precio en Shards |
|--------|-----------------|
| comet | 200 |
| nova | 500 |
| pulsar | 1200 |
| eclipse | 4000 |
| singularity | 8000 |

---

## 13. Panel de Admin

Accesible en `/admin`. Requiere `user.publicMetadata.role === "admin"` en Clerk.

### Funcionalidades
- **Ver todas las entidades** del catálogo con imagen, rareza y arquetipo
- **Crear nueva entidad**: formulario con todos los campos + upload de imagen (sube a Firebase)
- **Eliminar entidad**: borra de MongoDB y elimina imagen del bucket

### Cómo asignarse rol de admin
Desde el dashboard de Clerk → Users → seleccioná el usuario → Public Metadata → agregar:
```json
{ "role": "admin" }
```

---

## 14. Variables de Entorno (`.env`)

```env
# MongoDB
MONGODB_URI=mongodb://root:root@mongo:27017/aether?authSource=admin

# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CLI_WEBHOOK_SECRET=whsec_...  # generado por stripe-cli en local

# Firebase
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_STORAGE_BUCKET=...firebasestorage.app

# URLs
APP_URL=http://localhost:3000
WEB_APP_URL=http://localhost:3000
VITE_API_URL=http://localhost:3001
```

---

## 15. Comandos Útiles

```bash
# Levantar todo
docker-compose up --build

# Levantar sin reconstruir
docker-compose up

# Bajar y limpiar volúmenes (node_modules y mongo)
docker-compose down -v

# Ejecutar el seed (poblar DB)
docker exec aether-api bun run src/db/seed.ts

# Ver logs de un servicio
docker-compose logs --tail=50 api
docker-compose logs --tail=50 web

# Limpiar colección específica
docker exec aether-api bun -e "
  const {MongoClient}=require('mongodb');
  const c=new MongoClient('mongodb://root:root@mongo:27017/aether?authSource=admin');
  c.connect()
    .then(()=>c.db('aether').collection('rift_rotation').deleteMany({}))
    .then(()=>c.close())
"
```

---

## 16. Flujo de Datos — Diagrama Resumido

```
Browser
  │
  ├─ /                → AltarScene → POST /invoke → gacha.ts → user_entities
  ├─ /collection      → useInventory → GET /user/inventory → user_entities + entities
  ├─ /bazaar          → useMarket → GET /market → market_listings
  ├─ /rift            → useRift → GET /rift → rift_rotation + entities
  ├─ /vault           → useVault → POST /vault/create-checkout → Stripe → webhook → shards
  └─ /admin           → fetch /admin/entities → entities (requiere rol admin)

Autenticación:
  Browser → Clerk SDK → JWT → Authorization: Bearer → authMiddleware → verifyToken → clerkId

Pagos:
  Browser → Stripe Checkout → Stripe Webhook → /vault/webhook → MongoDB $inc shards

Imágenes (producción):
  Admin Panel → POST /admin/entities (multipart) → Firebase Admin SDK → Firebase Storage → URL pública

Imágenes (local):
  apps/web/public/assets/entities/ → servidas por Vite → URL: http://localhost:3000/assets/entities/
```
