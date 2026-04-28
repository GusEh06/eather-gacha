# Clerk — Implementación en Aether Gacha

## Stack
- `@clerk/tanstack-react-start` — frontend (TanStack Start + SSR)
- `@clerk/backend` — API (Bun + Hono)

---

## Variables de entorno

En `.env` (raíz del proyecto):

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

Todas deben pertenecer a la **misma instancia** de Clerk. Verificar en Clerk Dashboard → API Keys.

> Los comentarios en `.env` deben usar `#`, no `//`. Docker rechaza `//` y falla al iniciar.

---

## Configuración en Clerk Dashboard

### User & Authentication → Email, Phone, Username
- Habilitar **Username**, **Email address** y **Password**

### Attack Protection → Bot Protection
- **Deshabilitar en desarrollo local** — el CAPTCHA de Cloudflare Turnstile falla en localhost/Docker y bloquea el registro silenciosamente (`create()` retorna `undefined` sin hacer request)
- Reactivar en producción

### Webhooks
- Crear endpoint apuntando a `https://tu-dominio/clerk/webhook`
- Evento requerido: **user.created**
- En desarrollo local el endpoint no aplica; insertar el usuario manualmente si es necesario (ver abajo)

---

## Flujo de registro custom (AuthPanel.tsx)

### Problema: hooks stub en TanStack Start SSR

`useSignUp()`, `useSignIn()` y `useAuth()` retornan objetos stub cuando `isLoaded` es `undefined`. Sus métodos existen pero son no-ops que devuelven `undefined`. No se puede usar `??` para hacer fallback porque el stub no es `null`.

**Solución**: chequear `isLoaded` explícitamente y caer a `window.Clerk`:

```ts
const clerkClient = typeof window !== "undefined" ? (window as any).Clerk : undefined
const activeSignUp = (signUpLoaded ? signUp : null) ?? clerkClient?.client?.signUp
```

### Paso a paso del registro

```
1. activeSignUp.create({ emailAddress, password, username })
   → retorna objeto con status: "missing_requirements"

2. created.prepareVerification({ strategy: "email_code" })
   → Clerk envía email con código de 6 dígitos

3. activeSignUp.attemptVerification({ strategy: "email_code", code })
   → status: "complete"

4. setActive({ session: result.createdSessionId })
   → sesión iniciada
```

### Métodos correctos en @clerk/tanstack-react-start v1.x

| ❌ Incorrecto | ✅ Correcto |
|---|---|
| `prepareEmailAddressVerification()` | `prepareVerification({ strategy: "email_code" })` |
| `attemptEmailAddressVerification()` | `attemptVerification({ strategy: "email_code", code })` |

---

## Autenticación en el API (auth middleware)

```ts
import { verifyToken } from "@clerk/backend"

const payload = await verifyToken(token, {
  secretKey: process.env.CLERK_SECRET_KEY ?? "",
  authorizedParties: ["http://localhost:3000", process.env.APP_URL ?? ""].filter(Boolean),
})
```

- **No usar** `createClerkClient().verifyToken` — ese método no existe.
- `authorizedParties` es **obligatorio**: Clerk valida el claim `azp` del JWT. Sin esto, todos los tokens son rechazados con 401.

---

## Obtener el token en los hooks del frontend

`useAuth().getToken()` también puede retornar `null` en TanStack Start. Usar el helper centralizado:

```ts
// src/lib/auth.ts
export async function getAuthToken(getToken: () => Promise<string | null>) {
  return await getToken() ?? await (window as any).Clerk?.session?.getToken() ?? null
}
```

Usado en todos los hooks: `useUserProfile`, `useInvoke`, `useInventory`, `useMarket`, `useRift`, `useVault`.

---

## Creación del usuario en MongoDB

El usuario se crea cuando Clerk dispara `user.created` al endpoint `POST /clerk/webhook`. Si el webhook nunca llegó, insertar manualmente:

```bash
docker exec -it aether-mongo mongosh -u root -p root \
  --authenticationDatabase admin aether \
  --eval "db.users.insertOne({
    clerkId: 'user_XXXX',
    username: 'nombre',
    title: 'Aether Binder',
    shards: 320,
    pityCounter: 0,
    pityMythicCounter: 0,
    inventory: [],
    createdAt: new Date()
  })"
```

El `clerkId` (prefijo `user_`) se obtiene del claim `sub` del JWT o desde Clerk Dashboard → Users.

---

## Tabla de errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `prepareEmailAddressVerification is not a function` | Método inexistente en v1.x | Usar `prepareVerification` |
| `create()` retorna `undefined` sin request de red | Bot Protection activo + CAPTCHA fallando | Deshabilitar Bot Protection en dashboard |
| 401 en todas las rutas del API | `verifyToken` mal importado o sin `authorizedParties` | Importar de `@clerk/backend`; pasar `authorizedParties` |
| 404 en `/user/profile` | Usuario no existe en MongoDB | Verificar webhook `user.created` o insertar manualmente |
| Docker falla al leer `.env` | Comentarios con `//` | Reemplazar `//` por `#` |
