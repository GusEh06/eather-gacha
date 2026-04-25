import { MongoClient } from "mongodb"

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

async function seed() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db("aether")
    const col = db.collection("entities")

    // Clean existing entities
    const deleted = await col.deleteMany({})
    console.log(`Deleted ${deleted.deletedCount} existing entities`)

    // Insert all entities
    const result = await col.insertMany(entities)
    console.log(`Inserted ${result.insertedCount} entities`)

    // Summary by rarity
    const summary: Record<string, number> = {}
    for (const e of entities) {
      summary[e.rareza] = (summary[e.rareza] ?? 0) + 1
    }
    console.log("\nEntities by rarity:")
    for (const [rareza, count] of Object.entries(summary)) {
      console.log(`  ${rareza.padEnd(12)} → ${count}`)
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
