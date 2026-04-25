---
name: aether-backend
description: >
  Usar cuando se trabaje en el backend de Aether Gacha. Cubre endpoints de Hono con Bun,
  schema de MongoDB, lógica de invocación con pity system, transacciones del Bazaar,
  cron job del Rift, webhooks de Clerk y Stripe. Activar ante cualquier tarea de 
  server, API, base de datos, lógica de negocio o integración de terceros en el proyecto.
---

# Aether Gacha — Backend Skill

## Stack
- **Runtime:** Bun
- **Framework:** Hono
- **Base de datos:** MongoDB (driver nativo de Bun o Mongoose)
- **Auth:** Clerk (webhook + JWT middleware)
- **Pagos:** Stripe (checkout hosted + webhook)

## Colecciones MongoDB

### `users`
```typescript
{
  _id: ObjectId,
  clerkId: string,           // ID de Clerk
  username: string,
  title: string,             // siempre "Aether Binder"
  shards: number,            // balance actual
  pityCounter: number,       // invocaciones sin Pulsar+ (reset en 90)
  pityMythicCounter: number, // invocaciones sin Eclipse/Singularity (reset en 180)
  inventory: ObjectId[],     // referencias a entities que posee
  createdAt: Date
}
```

### `entities`
```typescript
{
  _id: ObjectId,
  nombre: string,
  rareza: "dust" | "nebula" | "comet" | "nova" | "pulsar" | "eclipse" | "singularity",
  epoca: string,
  arquetipo: "Guerrero" | "Oráculo" | "Devorador" | "Guardián" | "Trickster",
  descripcionLore: string,
  imageUrl: string,
  descripcionOjos: string,
  disponibleGacha: boolean,
  disponibleRift: boolean
}
```

### `user_entities` (instancias del inventario)
```typescript
{
  _id: ObjectId,
  entityId: ObjectId,   // referencia al catálogo
  ownerId: string,      // clerkId del dueño actual
  obtainedAt: Date,
  obtainedVia: "gacha" | "rift" | "bazaar"
}
```

### `market_listings`
```typescript
{
  _id: ObjectId,
  sellerId: string,           // clerkId del vendedor
  userEntityId: ObjectId,     // referencia a user_entities
  entitySnapshot: object,     // copia de datos de la entidad al momento de listar
  priceShar ds: number,
  status: "active" | "sold" | "cancelled",
  createdAt: Date,
  soldAt?: Date
}
```

### `rift_rotation`
```typescript
{
  _id: ObjectId,
  date: string,              // "YYYY-MM-DD"
  slots: [{
    entityId: ObjectId,
    priceShards: number,
    sold: boolean
  }],
  expiresAt: Date
}
```

## Endpoints

### POST /invoke
Lógica:
1. Verificar JWT de Clerk en header
2. Validar que el usuario tiene suficientes Shards (160 para x1, 1600 para x10)
3. Descontar Shards
4. Para cada tirada: calcular rareza usando probabilidades + pity system
5. Seleccionar entidad aleatoria del catálogo con esa rareza y `disponibleGacha: true`
6. Crear documento en `user_entities` para cada entidad obtenida
7. Actualizar pity counters del usuario
8. Retornar array de entidades obtenidas

### Lógica del Pity System
```typescript
function calcularRareza(pityCounter: number, pityMythicCounter: number): Rareza {
  // Hard pity
  if (pityMythicCounter >= 179) return elegirMythic() // eclipse o singularity
  if (pityCounter >= 89) return "pulsar"
  
  // Soft pity (desde tirada 70, probabilidad de pulsar aumenta)
  let pulsarProb = 0.029
  if (pityCounter >= 69) {
    pulsarProb = 0.029 + (pityCounter - 69) * 0.06 // aumenta 6% por tirada
  }
  
  const roll = Math.random()
  // aplicar probabilidades en orden descendente
  // ...
}
```

### POST /market/buy
Usar transacción MongoDB para atomicidad:
1. Verificar que el listing existe y está "active"
2. Verificar que el comprador tiene suficientes Shards
3. En transacción:
   - Descontar Shards del comprador
   - Acreditar Shards al vendedor (95% del precio — 5% tributo se destruye)
   - Cambiar `ownerId` en `user_entities`
   - Marcar listing como "sold"

### POST /vault/webhook
Verificar firma de Stripe (`stripe.webhooks.constructEvent`).
En evento `checkout.session.completed`:
1. Extraer metadata (userId, packageId)
2. Mapear packageId a cantidad de Shards
3. `$inc` en shards del usuario

### Cron Job del Rift (Bun nativo)
```typescript
// Se ejecuta cada día a medianoche
Bun.cron("0 0 * * *", async () => {
  const entidades = await seleccionarEntidadesParaRift(6)
  await db.collection("rift_rotation").insertOne({
    date: hoy(),
    slots: entidades.map(e => ({ entityId: e._id, priceShards: calcularPrecio(e.rareza), sold: false })),
    expiresAt: mañanaMedianoche()
  })
})
```

## Middleware de Auth (Hono)
```typescript
const authMiddleware = async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "")
  const { userId } = await clerkClient.verifyToken(token)
  c.set("userId", userId)
  await next()
}
```

## Precios por rareza en el Rift
- Dust/Nebula: no disponibles en Rift
- Comet: 200 Shards
- Nova: 500 Shards
- Pulsar: 1,200 Shards
- Eclipse: 4,000 Shards
- Singularity: 8,000 Shards

## Onboarding (Webhook Clerk `user.created`)
Al crear usuario, acreditar 320 Shards (2 invocaciones x1).
Crear documento en `users` con pity counters en 0.
