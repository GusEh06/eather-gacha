# PRD — Aether Gacha
**Versión:** 1.0  
**Fecha:** Abril 2025  
**Autor:** Gustavo Sánchez — Aether Binder Studio  
**Tipo:** Proyecto académico de parcial — Comercio Electrónico  

---

## 1. Resumen Ejecutivo

Aether Gacha es una plataforma web de comercio electrónico temática que combina tres modelos de negocio digitales en un solo ecosistema narrativo: un gacha de invocación de entidades (B2C), una tienda rotativa diaria (B2C), y un mercado secundario entre usuarios (C2C). La moneda del ecosistema son los **Shards**, adquiribles exclusivamente con dinero real via Stripe. Toda la economía interna circula en Shards, lo que fuerza la conversión de dinero real como única entrada al sistema.

El proyecto demuestra los tres modelos de comercio electrónico requeridos académicamente:
- **B2C directo:** The Aether Vault (compra de Shards con Stripe) y The Rift (tienda rotativa)
- **C2C:** The Hollow Bazaar (mercado entre Aether Binders)
- **B2B implícito:** La plataforma como intermediaria que retiene tributo del 5% en cada transacción C2C

---

## 2. Objetivos del Producto

### Objetivos académicos
- Demostrar implementación funcional de los tres modelos de comercio electrónico
- Integrar autenticación (Clerk), pagos (Stripe) y persistencia (MongoDB) en un stack moderno
- Presentar un MVP funcional con flujo completo de usuario en 4 días de desarrollo

### Objetivos de producto
- Crear un loop de engagement basado en invocación → colección → mercado → reinversión
- Implementar una economía cerrada con sink monetario que justifique gasto recurrente
- Diseñar una experiencia visual memorable que diferencie el proyecto en la presentación

---

## 3. Usuarios Objetivo

**Aether Binders** — El único tipo de usuario del sistema. Cualquier persona registrada es automáticamente un Aether Binder. No hay roles diferenciados en el MVP.

Un Aether Binder puede:
- Invocar entidades gastando Shards en The Altar
- Comprar entidades específicas en The Rift con Shards
- Listar entidades propias para venta en The Hollow Bazaar
- Comprar entidades de otros Binders en The Hollow Bazaar
- Adquirir Shards con dinero real en The Aether Vault

---

## 4. Pantallas del Producto

### 4.1 The Altar (Invocación — Pantalla Principal)
La pantalla de mayor impacto visual. Escenario de cementerio/santuario nocturno con altar de piedra central. Permite invocar entidades en modalidad x1 o x10. Contiene toda la secuencia de animación del ritual.

**Flujo:**
1. Usuario ve sus Shards disponibles y el altar inactivo
2. Presiona x1 (160 Shards) o x10 (1,600 Shards)
3. Se validan Shards → se descuentan → se calcula resultado con probabilidades + pity
4. Secuencia de animación completa (activación → colapso → ojos → reveal)
5. Post-reveal: botones para añadir a colección o vender en el Bazaar

### 4.2 The Hollow Bazaar (Mercado C2C)
Mercado subterráneo donde los Aether Binders listan y compran entidades entre sí. Solo acepta Shards. La plataforma retiene 5% de cada venta como tributo.

**Flujo de compra:**
1. Grid de listings con filtros por rareza y precio
2. Click en entidad → modal con detalle y precio final
3. Confirmar → transferencia atómica de Shards en MongoDB → entidad cambia de dueño

**Flujo de venta:**
1. Desde la colección personal, seleccionar entidad → "Poner en Venta"
2. Definir precio en Shards → crear listing en `market_listings`
3. Listing activo hasta que se venda o el usuario lo retire

### 4.3 The Rift (Tienda Rotativa B2C)
Tienda de entidades específicas que rota cada 24 horas. Precio fijo en Shards, sin azar. Se puede saber exactamente qué se compra. Un cron job en Hono/Bun actualiza el contenido a medianoche.

**Flujo:**
1. Usuario ve las 4-6 entidades disponibles hoy con contador regresivo
2. Selecciona entidad → confirma compra → entidad va a su colección

### 4.4 The Aether Vault (Compra de Shards — B2C con Stripe)
Bóveda de adquisición de Shards. Cuatro paquetes con whale bait tiering. Flujo completo con Stripe Checkout y webhook de confirmación.

**Flujo:**
1. Usuario selecciona paquete → modal de confirmación con desglose
2. Redirige a Stripe Checkout → pago exitoso
3. Webhook de Stripe confirma → backend acredita Shards → usuario regresa con balance actualizado

---

## 5. Entidades

Las entidades son el activo central del ecosistema. Son seres provenientes de diferentes épocas, mitologías y planos de existencia. No están limitadas a un tema astronómico — la astronomía solo define su sistema de rareza.

### Sistema de Rareza (Clasificación Cósmica)

| Rareza | Nombre | Probabilidad Base | Color |
|--------|--------|-------------------|-------|
| ★1 | Dust | 58% | Gris ceniza |
| ★2 | Nebula | 25% | Verde tenue |
| ★3 | Comet | 10% | Azul frío |
| ★4 | Nova | 4% | Púrpura |
| ★5 | Pulsar | 2.9% | Dorado |
| ★6A | Eclipse | 0.09% | Rojo carmesí |
| ★6B | Singularity | 0.01% | Arcoíris iridiscente |

**Dust y Nebula** no pueden listarse en el Bazaar (restricción del post-reveal). Esto protege la economía del mercado de inundarse con entidades de bajo valor.

### Pity System

- **Soft pity:** Desde la invocación 70, la probabilidad de Pulsar aumenta progresivamente
- **Hard pity:** Invocación 90 garantiza Pulsar o superior
- **Hard pity Mythic:** Cada 180 invocaciones garantiza Eclipse o Singularity
- Ambos contadores persisten en el documento `users` de MongoDB y nunca se resetean

### Estructura de datos de una entidad
```
{
  nombre: string,
  rareza: "dust" | "nebula" | "comet" | "nova" | "pulsar" | "eclipse" | "singularity",
  epoca: string,           // ej: "Mesopotamia Antigua", "Era del Hielo", "Futuro Post-Colapso"
  arquetipo: string,       // ej: "Guerrero", "Oráculo", "Devorador", "Guardián", "Trickster"
  descripcionLore: string,
  imageUrl: string,
  descripcionOjos: string, // usado para la secuencia de invocación
  disponibleGacha: boolean,
  disponibleRift: boolean
}
```

---

## 6. Economía

### Moneda: Shards
Única moneda del ecosistema. Solo se obtiene comprando en The Aether Vault con dinero real. No hay faucets gratuitos de Shards en el MVP (excepto el onboarding de bienvenida).

### Tabla de Paquetes

| Nombre | Precio | Shards Base | Bonus | Total |
|--------|--------|-------------|-------|-------|
| Spark of Aether | $1.99 | 100 | 0 | 100 |
| Astral Fragment | $4.99 | 300 | 50 | 350 |
| Nova Surge | $9.99 | 700 | 150 | 850 |
| Singularity Core | $19.99 | 1,600 | 400 | 2,000 |

### Costos de Invocación
- x1: 160 Shards
- x10: 1,600 Shards

### Sink Económico
- 5% de tributo en cada transacción del Bazaar (destruido, no redistribuido)
- Costo de invocación consume Shards directamente

### Onboarding
Al crear cuenta, el webhook de Clerk acredita **320 Shards** — exactamente 2 invocaciones x1. Suficiente para que el usuario experimente el gacha sin pagar, pero insuficiente para obtener algo significativo sin gasto adicional.

---

## 7. Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | TanStack Start | File-based routing, data loaders, integración nativa con TanStack Query |
| Backend | Hono con Bun | Endpoints REST rápidos, cron nativo para el Rift, sin overhead |
| Base de datos | MongoDB | Schema flexible para entidades con lore variable |
| Auth | Clerk (SDK) | Auth resuelto en horas, webhook para onboarding de Shards |
| Pagos | Stripe | Checkout hosted, webhook de confirmación, sin manejo de datos de tarjeta |
| Animaciones | Framer Motion + tsParticles + CSS | Descrito en DESIGN.md |

### Colecciones MongoDB
- `users` — perfil, Shards, pity counters, inventario
- `entities` — catálogo master de entidades
- `market_listings` — listings activos del Bazaar
- `rift_rotation` — entidades actuales del Rift

### Endpoints Backend (Hono)
```
POST /invoke                  → Invocar x1 o x10
GET  /market/list             → Listings activos del Bazaar
POST /market/sell             → Crear listing
POST /market/buy              → Comprar listing (transacción atómica)
GET  /rift/current            → Entidades actuales del Rift
POST /rift/buy                → Comprar del Rift
POST /vault/create-checkout   → Crear sesión de Stripe
POST /vault/webhook           → Confirmar pago y acreditar Shards
GET  /user/profile            → Shards actuales, inventario, pity counters
```

---

## 8. Fuera de Scope (MVP)

Los siguientes features están diseñados pero no se implementan en el MVP:

- **Sistema de Eventos** con Soul Fragments como currency secundaria
- **Entidad exclusiva de evento** (★6 Mythic no disponible en gacha normal)
- **Rituales diarios** / login streak
- **Intercambio directo** (trade) entre Binders — el Bazaar solo hace ventas directas en MVP
- **Roles diferenciados** de usuario
- **Historial de invocaciones** visible al usuario

---

## 9. Criterios de Éxito del MVP

- [ ] Un usuario puede registrarse con Clerk y recibir Shards de onboarding
- [ ] El flujo de invocación completo funciona con animación (puede ser simplificada)
- [ ] The Hollow Bazaar muestra listings y permite comprar
- [ ] The Rift muestra entidades del día y permite comprar
- [ ] The Aether Vault procesa un pago de Stripe en modo test y acredita Shards
- [ ] Los tres modelos B2C, C2C y B2B están demostrables en la presentación
