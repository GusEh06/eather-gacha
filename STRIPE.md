# Stripe — Implementación en Aether Gacha

## Stack
- `stripe` v22 — API (Bun + Hono)
- Stripe Checkout (hosted) — frontend redirige a la página de pago de Stripe
- Stripe CLI — forwarding de webhooks en desarrollo local

---

## Variables de entorno

En `.env` (raíz del proyecto):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

> `VITE_STRIPE_PUBLISHABLE_KEY` es opcional con Checkout redirect — el frontend no carga Stripe.js directamente.

---

## Flujo completo

```
1. Usuario hace click en "Adquirir" en /vault
2. Frontend llama POST /vault/create-checkout con { packageId }
3. API crea una Checkout Session en Stripe y retorna { url }
4. Frontend redirige a esa URL (window.location.href = url)
5. Usuario paga en la página de Stripe con tarjeta de prueba
6. Stripe redirige a /vault?success=true
7. Stripe CLI forwarding llama POST /vault/webhook con el evento
8. API verifica la firma, acredita los shards al usuario en MongoDB
```

---

## Paquetes de shards disponibles

Definidos en `apps/api/src/routes/vault.ts` y `apps/web/src/routes/vault.tsx`:

| ID | Nombre | Shards | Precio |
|----|--------|--------|--------|
| `spark_of_aether` | Spark of Aether | 100 | $1.99 |
| `astral_fragment` | Astral Fragment | 350 | $4.99 |
| `nova_surge` | Nova Surge | 850 | $9.99 |
| `singularity_core` | Singularity Core | 2000 | $19.99 |

---

## Datos de prueba para desarrollo

### Tarjeta de prueba (pago exitoso)

| Campo | Valor |
|-------|-------|
| Número | `4242 4242 4242 4242` |
| Fecha | Cualquier fecha futura (ej: `12/29`) |
| CVV | Cualquier 3 dígitos (ej: `123`) |
| ZIP | Cualquier número (ej: `12345`) |

### Otras tarjetas de prueba útiles

| Tarjeta | Comportamiento |
|---------|----------------|
| `4000 0000 0000 0002` | Pago declinado |
| `4000 0025 0000 3155` | Requiere autenticación 3D Secure |
| `4000 0000 0000 9995` | Fondos insuficientes |

---

## Setup del Stripe CLI (desarrollo local)

El CLI corre en **Windows** (no en WSL ni en Docker). Instalación:

```powershell
# En PowerShell como administrador
winget install Stripe.StripeCLI
```

Autenticación:
```powershell
stripe login
```

Forwarding de webhooks:
```powershell
stripe listen --forward-to localhost:3001/vault/webhook
```

Esto imprime el `whsec_...` que debe ir en `STRIPE_WEBHOOK_SECRET` del `.env`. Reiniciar el contenedor del API después de actualizar el `.env`.

> La terminal con `stripe listen` debe permanecer abierta mientras se prueba el flujo de pago.

---

## Webhook en el API

### Gotcha crítico: Bun usa SubtleCrypto (async)

`stripe.webhooks.constructEvent()` usa crypto síncrono y falla en Bun con:
```
SubtleCryptoProvider cannot be used in a synchronous context
```

**Solución**: usar la versión async:

```ts
event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret)
```

### Endpoint: POST /vault/webhook

- Lee el body como texto crudo (`c.req.text()`)
- Verifica la firma con `constructEventAsync`
- En el evento `checkout.session.completed` acredita los shards al usuario:

```ts
await users.updateOne({ clerkId }, { $inc: { shards: pkg.shards } })
```

El `clerkId` y el `packageId` viajan en `session.metadata` — se pasan al crear la Checkout Session.

---

## Verificar que el webhook llegó

En la terminal de PowerShell con `stripe listen`:
- `[200]` — webhook procesado correctamente, shards acreditados
- `[400]` — fallo en verificación de firma (secret incorrecto o `constructEvent` sync)
- `[500]` — error interno del API

También en los logs del contenedor:
```powershell
docker logs aether-api --tail 20
```

---

## Tabla de errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| Webhook retorna 400 | `constructEvent` sync falla en Bun | Usar `constructEventAsync` |
| Webhook retorna 400 | `STRIPE_WEBHOOK_SECRET` incorrecto | Copiar el `whsec_` que imprime `stripe listen` |
| Shards no se acreditan | Contenedor no tiene el `.env` actualizado | `docker compose restart api` |
| `stripe` command not found en WSL | CLI instalado en Windows, no en WSL | Correr en PowerShell |
| Checkout Session falla | `STRIPE_SECRET_KEY` no cargado | Verificar con `docker exec aether-api env \| findstr STRIPE` |
