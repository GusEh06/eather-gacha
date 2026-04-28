# Aether Gacha — API

Backend del proyecto. Corre en Bun + Hono, base de datos MongoDB, auth con Clerk, pagos con Stripe.

## Desarrollo local (Docker)

Todo corre dentro de Docker. No instalés dependencias en el host.

```powershell
# Levantar todo
docker compose up --build -d

# Ver logs
docker logs aether-api -f

# Correr el seed (poblar/resetear la DB)
docker exec aether-api bun run src/db/seed.ts
```

## Stripe — pruebas locales

Stripe necesita una URL pública para enviar webhooks. En local usás el Stripe CLI para hacer forward.

**Requisito**: Stripe CLI instalado en Windows (no en WSL).

```powershell
# En una terminal separada, dejar corriendo durante toda la sesión de pruebas
stripe listen --forward-to localhost:3001/vault/webhook
```

El CLI imprime un `whsec_...` al arrancar. Ese valor debe coincidir con `STRIPE_WEBHOOK_SECRET` en el `.env`.

### Síntomas y fixes comunes

| Síntoma | Causa | Fix |
|---------|-------|-----|
| Pago exitoso pero shards no se acreditan | Webhook no llega — Stripe CLI no está corriendo | Abrir terminal y correr `stripe listen --forward-to localhost:3001/vault/webhook` |
| `Invalid signature` en logs del API | `STRIPE_WEBHOOK_SECRET` en `.env` no coincide con el que imprime el CLI | Copiar el `whsec_...` del CLI al `.env` y rebuildar |
| No aparece `POST /vault/webhook` en logs | El forward no está activo | Mismo fix que el primero |

Verificar con: `docker logs aether-api --tail 50` — si no hay `/vault/webhook` es problema de forward.

## Clerk — errores comunes

| Síntoma | Causa | Fix |
|---------|-------|-----|
| `verifyToken` falla | Método incorrecto o `authorizedParties` ausente | Importar `verifyToken` de `@clerk/backend` directamente, pasar `authorizedParties: [APP_URL, "http://localhost:3000"]` |
| `getToken()` devuelve null en SSR | TanStack Start no hidrata el token en SSR | Usar el helper `getAuthToken(getToken)` en `src/lib/auth.ts` que hace fallback a `window.Clerk.session.getToken()` |
| Usuario no existe en MongoDB (404 en `/user/profile`) | Webhook `user.created` de Clerk no llegó al momento del registro | Registrar el endpoint del webhook en Clerk Dashboard, o insertar el usuario manualmente con `mongosh` |

## Gacha — síntomas comunes

| Síntoma | Causa | Fix |
|---------|-------|-----|
| Invocación no muestra entidades (pantalla vacía) | La DB no tiene entidades para alguna rareza | Correr el seed: `docker exec aether-api bun run src/db/seed.ts` |
| `[invoke] No entity found for rareza: X` en logs | Seed desactualizado o rareza sin entidades asignadas | Revisar `src/db/seed.ts` y asegurarse de que todas las rarezas tienen al menos 1 entidad con `disponibleGacha: true` |

## Seed

El seed resetea y repuebla: entidades, usuario demo (`VoidKeeper`), listings del mercado y rotación del Rift.

Distribución actual de entidades:

| Rareza | Entidades |
|--------|-----------|
| dust | Vael, Morr |
| nebula | Cendra |
| comet | Pyk, Grael |
| nova | Fyssen |
| pulsar | Keth |
| eclipse | Solen |
| singularity | Ixar |

Las imágenes están en `apps/web/public/assets/entities/` y se sirven como `/assets/entities/nombre.png`.

## Estructura

```
src/
├── routes/      # handlers HTTP (sin lógica de negocio)
├── services/    # lógica: gacha, market, rift
├── db/          # conexión MongoDB y colecciones tipadas
├── crons/       # cron del Rift (medianoche UTC)
└── middleware/  # auth JWT Clerk
```
