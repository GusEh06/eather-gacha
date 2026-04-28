# Aether Gacha — Web

Frontend del proyecto. TanStack Start (SSR) + React + Clerk.

## Desarrollo local (Docker)

```powershell
docker compose up --build -d
```

La app queda en `http://localhost:3000`.

## Clerk — errores comunes en TanStack Start SSR

| Síntoma | Causa | Fix |
|---------|-------|-----|
| `useSignUp()` no funciona, `.create()` retorna `undefined` | El hook devuelve un stub en SSR | Usar `window.Clerk.client.signUp` como fallback via `getClerk()` |
| `prepareEmailAddressVerification` no existe | API v1 de `@clerk/tanstack-react-start` | Usar `prepareVerification({ strategy: "email_code" })` en el objeto retornado por `.create()` |
| Sign-up no dispara request de red, retorna `undefined` silenciosamente | Bot Protection (Turnstile) bloqueando desde localhost | Deshabilitar Bot Protection en Clerk Dashboard para desarrollo |
| `getToken()` devuelve null | SSR no hidrata el token | El helper `src/lib/auth.ts → getAuthToken()` hace fallback a `window.Clerk.session.getToken()` |

## Imágenes de entidades

Las imágenes viven en `public/assets/entities/` y se referencian como `/assets/entities/nombre.png`.

Componentes que muestran imágenes de entidades (con fallback al ícono de rareza si no hay imagen):
- `src/components/altar/EntityReveal.tsx` — reveal x1
- `src/components/altar/X10Reveal.tsx` — cards del reveal x10
- `src/routes/collection.tsx` — grilla de colección
- `src/components/bazaar/ListingCard.tsx` — cards del mercado

## Estructura

```
src/
├── routes/        # páginas (file-based routing de TanStack)
├── components/
│   ├── altar/     # invocación: AltarScene, EntityReveal, X10Reveal, EyesSequence
│   ├── bazaar/    # mercado: ListingCard, BuyModal, SellModal, ListingFilters
│   ├── rift/      # rift: RiftSlot, RiftTimer
│   ├── vault/     # compra de shards: PackageCard, ConfirmModal
│   └── ui/        # compartidos: Navbar, AuthPanel, ShardsDisplay
├── hooks/         # React Query: useInvoke, useInventory, useMarket, useUserProfile
├── config/        # rarityConfig, particles
└── lib/           # auth.ts (helper getAuthToken)
```
