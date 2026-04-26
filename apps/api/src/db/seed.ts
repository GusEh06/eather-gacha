import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://root:root@localhost:27017/aether?authSource=admin"

const entities = [
  // ── DUST (5) ──────────────────────────────────────────────────────────────
  {
    nombre: "Vael",
    rareza: "dust",
    epoca: "Era del Hielo",
    arquetipo: "Guardián",
    descripcionLore:
      "Un espíritu menor del frío, olvidado antes de tener nombre propio. Vaga entre grietas de glaciares buscando algo que ya no recuerda.",
    imageUrl: "/assets/entities/vael.png",
    descripcionOjos: "ojos redondos, grises sin iris, como monedas viejas congeladas",
    disponibleGacha: true,
    disponibleRift: false,
  },
  {
    nombre: "Morr",
    rareza: "dust",
    epoca: "Mesopotamia Antigua",
    arquetipo: "Trickster",
    descripcionLore:
      "Espíritu de tablilla dañada, sus palabras son fragmentos ilegibles. Sonríe siempre, aunque nadie sabe por qué.",
    imageUrl: "/assets/entities/morr.png",
    descripcionOjos: "ojos pequeños y brillantes, grises, que parpadean fuera de sincronía",
    disponibleGacha: true,
    disponibleRift: false,
  },
  {
    nombre: "Cendra",
    rareza: "dust",
    epoca: "Segunda Guerra Mundial",
    arquetipo: "Oráculo",
    descripcionLore:
      "Sombra de una ciudad bombardeada. Sus predicciones son siempre correctas, pero llegan demasiado tarde para ser útiles.",
    imageUrl: "/assets/entities/cendra.png",
    descripcionOjos: "ojos apagados, grises ceniza, que miran sin enfocar en nada concreto",
    disponibleGacha: true,
    disponibleRift: false,
  },
  {
    nombre: "Pyk",
    rareza: "dust",
    epoca: "Dimensión sin nombre",
    arquetipo: "Trickster",
    descripcionLore:
      "Una anomalía menor que existe entre parpadeos. Nadie lo ve llegar ni marcharse. Solo deja evidencia de que estuvo.",
    imageUrl: "/assets/entities/pyk.png",
    descripcionOjos: "ojos como puntos de polvo, casi invisibles, grises",
    disponibleGacha: true,
    disponibleRift: false,
  },
  {
    nombre: "Grael",
    rareza: "dust",
    epoca: "Era Medieval",
    arquetipo: "Guerrero",
    descripcionLore:
      "Un caballero maldito cuya historia fue borrada de todos los registros. Lucha sin propósito, por hábito.",
    imageUrl: "/assets/entities/grael.png",
    descripcionOjos: "ojos como ranuras de visera, grises, sin expresión visible",
    disponibleGacha: true,
    disponibleRift: false,
  },

  // ── NEBULA (3) ───────────────────────────────────────────────────────────
  {
    nombre: "Fyssen",
    rareza: "nebula",
    epoca: "Era Victoriana",
    arquetipo: "Oráculo",
    descripcionLore:
      "Espectro de una médium que encontró algo real durante una sesión. Ahora sabe demasiado y no puede dejar de hablar sobre ello.",
    imageUrl: "/assets/entities/fyssen.png",
    descripcionOjos: "ojos expresivos, verde tenue, con pupilas que se dilatan al hablar",
    disponibleGacha: true,
    disponibleRift: false,
  },
  {
    nombre: "Keth",
    rareza: "nebula",
    epoca: "Grecia Antigua",
    arquetipo: "Guardián",
    descripcionLore:
      "Ninfa corrompida del Tártaro. Protege un umbral que ya no existe, por deber más que por convicción.",
    imageUrl: "/assets/entities/keth.png",
    descripcionOjos: "ojos amigables pero huecos, verde musgo, con iris en forma de hoja",
    disponibleGacha: true,
    disponibleRift: false,
  },
  {
    nombre: "Solen",
    rareza: "nebula",
    epoca: "El reverso del tiempo",
    arquetipo: "Devorador",
    descripcionLore:
      "Come recuerdos de momentos que nunca ocurrieron. No es malicioso — simplemente tiene hambre.",
    imageUrl: "/assets/entities/solen.png",
    descripcionOjos: "ojos verdes con destellos blancos que aparecen y desaparecen como estática",
    disponibleGacha: true,
    disponibleRift: false,
  },

  // ── COMET (2) ────────────────────────────────────────────────────────────
  {
    nombre: "Ixar",
    rareza: "comet",
    epoca: "Futuro Post-Colapso",
    arquetipo: "Guerrero",
    descripcionLore:
      "Soldado de una guerra que terminó antes de que él llegara. Porta armas de una tecnología que el mundo olvidó cómo fabricar.",
    imageUrl: "/assets/entities/ixar.png",
    descripcionOjos: "ojos azul frío, brillantes, que escanean constantemente el horizonte",
    disponibleGacha: true,
    disponibleRift: true,
  },
  {
    nombre: "Nyra",
    rareza: "comet",
    epoca: "El espacio dentro de los sueños olvidados",
    arquetipo: "Oráculo",
    descripcionLore:
      "Habita en los sueños que nadie recuerda al despertar. Su cuerpo está hecho de esas imágenes fragmentadas.",
    imageUrl: "/assets/entities/nyra.png",
    descripcionOjos: "ojos azul pálido con constelaciones diminutas flotando en el iris",
    disponibleGacha: true,
    disponibleRift: true,
  },

  // ── NOVA (1) ─────────────────────────────────────────────────────────────
  {
    nombre: "Zareth",
    rareza: "nova",
    epoca: "Mesopotamia Antigua",
    arquetipo: "Devorador",
    descripcionLore:
      "Dios-bestia menor que sobrevivió a su propio panteón. Ahora consume los nombres de deidades olvidadas para mantenerse relevante.",
    imageUrl: "/assets/entities/zareth.png",
    descripcionOjos: "ojos púrpura intenso con aura visible, magnéticos, que no se pueden sostener por mucho tiempo",
    disponibleGacha: true,
    disponibleRift: true,
  },

  // ── PULSAR (1) ───────────────────────────────────────────────────────────
  {
    nombre: "Auren",
    rareza: "pulsar",
    epoca: "El vacío entre constelaciones",
    arquetipo: "Guardián",
    descripcionLore:
      "Guardian del espacio entre las estrellas. No protege la luz — protege la oscuridad necesaria para que la luz tenga sentido.",
    imageUrl: "/assets/entities/auren.png",
    descripcionOjos: "cuatro pupilas en cruz, doradas, que rotan lentamente emitiendo calor visible",
    disponibleGacha: true,
    disponibleRift: true,
  },

  // ── ECLIPSE (1) ──────────────────────────────────────────────────────────
  {
    nombre: "Khal-Moru",
    rareza: "eclipse",
    epoca: "Egipto Antiguo",
    arquetipo: "Devorador",
    descripcionLore:
      "Guardián del umbral de la duat que se negó a dejar pasar incluso a los muertos. Juzgó tan bien que el propio Osiris lo expulsó por ser más severo que él.",
    imageUrl: "/assets/entities/khal-moru.png",
    descripcionOjos: "ojos que son llamas rojas sobre negro absoluto, parpadeando irregularmente como brasas que no se apagan",
    disponibleGacha: true,
    disponibleRift: true,
  },

  // ── SINGULARITY (1) ──────────────────────────────────────────────────────
  {
    nombre: "El Primero Sin Nombre",
    rareza: "singularity",
    epoca: "Antes de cualquier época",
    arquetipo: "Devorador",
    descripcionLore:
      "Existió antes de que el concepto de existencia se definiera. No tiene nombre porque el lenguaje no existía cuando llegó. Lo que ves no es su forma real — es la aproximación más cercana que tu mente puede generar.",
    imageUrl: "/assets/entities/el-primero.png",
    descripcionOjos: "un solo ojo enorme, iridiscente, que absorbe la luz a su alrededor y la reemite en frecuencias que no deberían existir",
    disponibleGacha: true,
    disponibleRift: false,
  },
]

// Rift prices by rarity (mirrors apps/api/src/services/rift.ts)
const RIFT_PRICES: Record<string, number> = {
  comet: 200,
  nova: 500,
  pulsar: 1200,
  eclipse: 4000,
  singularity: 8000,
}

// Demo market listing prices
const MARKET_PRICES: Record<string, number> = {
  comet: 450,
  nova: 900,
  pulsar: 2500,
  eclipse: 6000,
}

const DEMO_CLERK_ID = "demo_seed_user"
const DEMO_USERNAME = "VoidKeeper"

async function seed() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db("aether")

    // ── 1. Entities ──────────────────────────────────────────────────────────
    const entitiesCol = db.collection("entities")
    const deleted = await entitiesCol.deleteMany({})
    console.log(`Deleted ${deleted.deletedCount} existing entities`)

    const result = await entitiesCol.insertMany(entities)
    console.log(`Inserted ${result.insertedCount} entities`)

    // Build nombre → ObjectId map for later use
    const entityIdMap: Record<string, ObjectId> = {}
    for (const [idx, id] of Object.entries(result.insertedIds)) {
      entityIdMap[entities[Number(idx)].nombre] = id as ObjectId
    }

    // Summary by rarity
    const summary: Record<string, number> = {}
    for (const e of entities) {
      summary[e.rareza] = (summary[e.rareza] ?? 0) + 1
    }
    console.log("\nEntities by rarity:")
    for (const [rareza, count] of Object.entries(summary)) {
      console.log(`  ${rareza.padEnd(12)} → ${count}`)
    }

    // ── 2. Demo user ─────────────────────────────────────────────────────────
    const usersCol = db.collection("users")
    await usersCol.deleteOne({ clerkId: DEMO_CLERK_ID })
    await usersCol.insertOne({
      clerkId: DEMO_CLERK_ID,
      username: DEMO_USERNAME,
      title: "Aether Binder",
      shards: 9999,
      pityCounter: 0,
      pityMythicCounter: 0,
      inventory: [],
      createdAt: new Date(),
    })
    console.log(`\nDemo user created: Aether Binder ${DEMO_USERNAME}`)

    // ── 3. Demo market listings ───────────────────────────────────────────────
    // Entities eligible for the Bazaar: comet, nova, pulsar, eclipse
    const bazaarEntities = entities.filter(
      (e) => e.rareza in MARKET_PRICES
    )

    const userEntitiesCol = db.collection("user_entities")
    const marketCol = db.collection("market_listings")

    // Clear previous demo listings
    await marketCol.deleteMany({ sellerId: DEMO_CLERK_ID })
    await userEntitiesCol.deleteMany({ ownerId: DEMO_CLERK_ID })

    const listingCount = { created: 0 }
    for (const entity of bazaarEntities) {
      const entityId = entityIdMap[entity.nombre]
      if (!entityId) continue

      // Create user_entity instance owned by demo user
      const ueResult = await userEntitiesCol.insertOne({
        entityId,
        ownerId: DEMO_CLERK_ID,
        obtainedAt: new Date(),
        obtainedVia: "gacha",
      })

      // Create active market listing
      await marketCol.insertOne({
        sellerId: DEMO_CLERK_ID,
        sellerUsername: DEMO_USERNAME,
        userEntityId: ueResult.insertedId,
        entitySnapshot: entity,
        priceShards: MARKET_PRICES[entity.rareza],
        status: "active",
        createdAt: new Date(),
      })

      listingCount.created++
    }
    console.log(`Demo market listings created: ${listingCount.created}`)

    // ── 4. Today's Rift rotation ──────────────────────────────────────────────
    const riftCol = db.collection("rift_rotation")
    const today = new Date().toISOString().split("T")[0]

    // Tomorrow UTC midnight
    const midnight = new Date()
    midnight.setUTCHours(24, 0, 0, 0)

    // Pick up to 5 rift-eligible entities
    const riftEntities = entities
      .filter((e) => e.disponibleRift)
      .slice(0, 5)

    const riftSlots = riftEntities.map((e, i) => ({
      entityId: entityIdMap[e.nombre],
      priceShards: RIFT_PRICES[e.rareza] ?? 200,
      sold: false,
    }))

    // Upsert — only creates if no rotation exists for today
    const riftResult = await riftCol.updateOne(
      { date: today },
      {
        $setOnInsert: {
          date: today,
          slots: riftSlots,
          expiresAt: midnight,
        },
      },
      { upsert: true }
    )
    if (riftResult.upsertedCount > 0) {
      console.log(`Rift rotation created for ${today} (${riftSlots.length} slots)`)
    } else {
      console.log(`Rift rotation for ${today} already exists — skipped`)
    }

    console.log("\nSeed completed successfully.")
  } catch (err) {
    console.error("Seed failed:", err)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seed()
