# Aether Gacha — Presentación de 5 minutos (borrador, Avance 2)

> Guion para la demo en clase. Cada sección indica quién podría presentarla,
> el tiempo sugerido y qué se muestra en pantalla.

---

## 1. El problema y la idea (≈45 s)

**Qué decir:**
El coleccionismo digital (cartas, figuras gacha) suele ser una caja negra:
probabilidades opacas, sin mercado entre jugadores y sin protección de pagos.
**Aether Gacha** es un juego de invocación de entidades con economía completa:

- **Ritual (gacha)** con probabilidades públicas y sistema de *pity* verificable
  (garantía a 89/179 tiradas — el motor tiene tests unitarios que lo prueban).
- **Hollow Bazaar**: mercado P2P entre jugadores con tributo del 5%.
- **The Rift**: tienda rotativa diaria (5 slots, cron a medianoche UTC).
- **The Vault**: compra de Shards con dinero real vía Stripe.

**En pantalla:** la URL de producción en Railway, pantalla del Altar.

## 2. Stack (≈30 s)

**Qué decir:** monorepo Bun con tres piezas:
- **Frontend:** React 19 + TanStack Start/Router (SSR), TailwindCSS, Clerk para auth.
- **Backend:** Bun + Hono, MongoDB, Stripe (webhooks), Firebase Storage para imágenes.
- **Infra:** Docker Compose en local, Railway en producción, GitHub Actions para CI.

**En pantalla:** diagrama rápido o el docker-compose.yml.

## 3. Demo del juego (≈90 s)

Flujo en producción, con una cuenta real:

1. Login (Clerk) → el binder nuevo recibe 320 Shards.
2. **Invocar x1** en el Altar → animación → entidad revelada → aparece en Colección.
3. Publicar esa entidad en el **Bazaar** → verla listada (tributo del 5% explicado).
4. **Rift**: mostrar la rotación del día y comprar un slot si el saldo alcanza.
5. **Perfil**: historial de transacciones de Shards (auditoría de cada movimiento).

## 4. Lo nuevo de este avance: MCP (≈90 s) ⭐

**Qué decir:** integramos un **servidor MCP** (Model Context Protocol) para que
agentes de IA operen el juego en nombre del usuario, bajo autenticación:

- Cada binder genera su **API key personal** desde su perfil (hash sha256 en DB,
  se muestra una sola vez).
- El servidor vive en el mismo API (`/mcp`, transporte Streamable HTTP) y expone
  **14 tools**: perfil, inventario, balance, pity, historial, búsqueda de
  entidades, invocar gacha, listar/comprar/publicar en el Bazaar, analíticas
  de precios, rotación y compra del Rift, y stats del sistema (solo admin).
- Las tools reutilizan la misma lógica de negocio que las rutas REST — pity,
  validación de saldo, tributo y auditoría se aplican igual.

**Demo en vivo (Claude Code):**
```bash
claude mcp add --transport http aether-gacha https://<api>.up.railway.app/mcp \
  --header "Authorization: Bearer aeth_..."
```
Luego en la conversación: *"¿cuánto pity llevo?"* → `get_pity_status`;
*"invoca una vez por mí"* → `invoke_gacha` (el agente confirma antes porque
gasta Shards reales) → mostrar la entidad nueva en la Colección del navegador.

## 5. Calidad: CI + E2E (≈45 s)

**Qué decir:**
- **CI en GitHub Actions** en cada PR: linter (Biome), typecheck, 12 tests
  unitarios del motor de gacha, y la suite E2E completa contra Mongo real.
- **Playwright** cubre todas las funcionalidades: registro/login (con usuarios
  de prueba de Clerk y OTP determinístico), invocación completa con verificación
  del gasto exacto de Shards, Bazaar, Rift, Vault, perfil, generación de API key
  MCP, notificaciones y control de acceso del panel admin. **31 specs en verde.**
- La suite encontró y arreglamos 3 bugs reales (toggle de registro roto,
  hidratación rota por versiones incoherentes, campana de notificaciones
  inalcanzable).

**En pantalla:** el run verde de Actions en un PR real.

## 6. Cierre: progreso y siguiente paso (≈30 s)

- **GitHub Project:** 63 historias; ~52 cerradas tras este avance (todas las H-
  del MVP + P-01..P-13, P-15, P-18..P-40 parciales, y las 14 tools MCP).
  Tablero: https://github.com/users/GusEh06/projects/1
- **Pendiente para el final:** i18n, accesibilidad, tests de carga, respaldos
  automáticos y validación Zod exhaustiva.

---

### Reparto sugerido (todo el grupo domina todo, pero para el ritmo):
| Sección | Presentador |
|---|---|
| Problema + stack | Integrante 1 |
| Demo del juego | Integrante 2 |
| MCP en vivo | Integrante 3 |
| QA/CI + cierre | Integrante 4 |

### Preguntas probables del profesor
- *¿Cómo evitan que un agente gaste sin permiso?* → la API key es por usuario y
  las tools de escritura declaran en su descripción que requieren confirmación;
  el agente la pide antes de llamar. El usuario puede revocar la key.
- *¿Cómo garantizan el pity?* → contadores en el documento del usuario,
  actualizados atómicamente; tests unitarios con 4,000+ aserciones.
- *¿Doble compra en el Bazaar?* → claim atómico con findOneAndUpdate sobre el
  status del listing.
