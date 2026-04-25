---
name: aether-entities
description: >
  Usar cuando se necesite crear, diseñar o documentar entidades para Aether Gacha.
  Cubre prompts de generación con IA, estructura de datos de cada entidad, 
  criterios de diseño visual por rareza, y guía de consistencia de estilo.
  Activar ante cualquier tarea relacionada con el catálogo de entidades.
---

# Aether Gacha — Entities Skill

## Qué es una Entidad

Un ser proveniente de cualquier época, mitología, dimensión o concepto. Las entidades NO están
limitadas por la astronomía — eso solo define su rareza. Una entidad puede ser:
- Un dios mesopotámico
- Un espectro victoriano
- Un guerrero del futuro post-colapso
- Un concepto abstracto personificado
- Un ser de una dimensión sin nombre

El único requisito visual universal: **ojos memorables y expresivos**.

## Prompt Base para Generación con IA

```
Semi-chibi character design, dark fantasy aesthetic, expressive glowing eyes as 
the defining visual trait, cute-gore style (adorable character design in a dark 
threatening world), transparent background PNG, centered composition, 
2D digital illustration, vibrant saturated colors, detailed lineart, 
[INSERTAR DESCRIPCIÓN ESPECÍFICA]
```

## Variables del Prompt por Entidad

Completar estos campos para cada entidad antes de generar:

| Campo | Descripción | Ejemplos |
|-------|-------------|---------|
| `nombre` | Nombre propio de la entidad | Kur-Gal, The Watcher, Mórrígan |
| `epoca` | Origen temporal/dimensional | "Ancient Mesopotamia", "1800s Victorian England", "Post-collapse future" |
| `arquetipo` | Rol en el lore | Guerrero / Oráculo / Devorador / Guardián / Trickster |
| `rasgo_visual_clave` | El elemento visual que la hace única | "eyes made of dying stars", "body of broken constellations", "crown of thorns that bloom" |
| `rareza_visual` | Afecta la complejidad del diseño | Ver tabla abajo |

## Guía Visual por Rareza

| Rareza | Complejidad del diseño | Paleta | Ojos |
|--------|----------------------|--------|------|
| Dust | Simple, pocas líneas, monocromático casi | Grises | Pequeños, simples, curiosos |
| Nebula | Un poco más detalle, color tenue | Verde + gris | Expresivos, amigables |
| Comet | Detalle medio, un color de acento frío | Azul frío + blanco | Brillantes, alertas |
| Nova | Detalle bueno, aura visible | Púrpura + negro | Intensos, magnéticos |
| Pulsar | Alta complejidad, aura dorada intensa | Dorado + negro | Radiantes, imponentes |
| Eclipse | Muy alta complejidad, oscuro y rojo | Rojo carmesí + negro profundo | Amenazantes, aterradores |
| Singularity | Diseño más elaborado, multicolor iridiscente | Arcoíris sobre negro | Imposibles, que "no deberían existir" |

## Descripción de Ojos (campo `descripcionOjos`)

Este campo se usa en la secuencia de invocación — los ojos aparecen en la oscuridad antes
que el cuerpo de la entidad. Describir los ojos de forma que puedan representarse 
visualmente sin el cuerpo completo.

Formato: "ojos [forma/característica] [color/efecto] [comportamiento si aplica]"

Ejemplos bien formados:
- `"ojos redondos, grises sin iris, como monedas viejas"`
- `"cuatro pupilas en cruz, doradas, que rotan lentamente"`
- `"ojos que son llamas rojas sobre negro absoluto, parpadeando irregularmente"`
- `"un solo ojo enorme, iridiscente, que absorbe la luz a su alrededor"`

## Schema de la Entidad en MongoDB

```typescript
{
  _id: ObjectId,
  nombre: string,
  rareza: "dust" | "nebula" | "comet" | "nova" | "pulsar" | "eclipse" | "singularity",
  epoca: string,
  arquetipo: "Guerrero" | "Oráculo" | "Devorador" | "Guardián" | "Trickster",
  descripcionLore: string,      // 2-3 oraciones máximo
  imageUrl: string,             // URL del asset generado
  descripcionOjos: string,      // para la secuencia de invocación
  disponibleGacha: boolean,     // si puede salir en invocación
  disponibleRift: boolean       // si puede aparecer en The Rift (solo Comet+)
}
```

## Ideas de Entidades por Época/Origen (Banco de Ideas)

### Épocas históricas
- Mesopotamia Antigua: dioses-bestia, espíritus de tablillas cuneiformes
- Egipto: entidades de la duat (inframundo), guardianes de umbrales
- Grecia/Roma: titanes menores, ninfas corrompidas, sombras del Tártaro
- Era Medieval: caballeros malditos, herejes que encontraron algo real, demonios de bestiarios
- Era Victoriana: espectros de fábricas, experimentos escapados, médiums poseídos
- Segunda Guerra Mundial: entidades de bunkers, sombras de ciudades bombardeadas

### Planos/Dimensiones
- El vacío entre constelaciones
- El reverso del tiempo
- El espacio dentro de los sueños olvidados
- Dimensiones sin geometría euclidiana

### Conceptos abstractos personificados
- El último idioma que nadie habla
- El momento exacto antes de una catástrofe
- La primera mentira jamás dicha

## Reglas de Consistencia Visual

1. **Todos los assets**: 512x512px mínimo, PNG con fondo transparente
2. **Centrado**: la entidad ocupa el 70-80% del canvas, centrada
3. **Los ojos siempre visibles**: no pueden estar cubiertos, volteados o en sombra
4. **Sin texto en el asset**: el nombre se renderiza en código, no en la imagen
5. **Coherencia de línea**: mismo grosor de lineart en todas las entidades del mismo "set"

## Distribución Recomendada del Catálogo

Para un MVP funcional, sugerida esta distribución:
- Dust: 40% del catálogo
- Nebula: 25%
- Comet: 15%
- Nova: 10%
- Pulsar: 7%
- Eclipse: 2%
- Singularity: 1% (1-2 entidades máximo en MVP)

Esta distribución hace que el pity system tenga sentido y que el mercado tenga entidades
valiosas escasas pero existentes.
