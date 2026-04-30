import { MongoClient } from "mongodb"

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://root:root@localhost:27017/aether?authSource=admin"

const FIREBASE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || "desarrollo-ix-parcial-2.firebasestorage.app"

// Función para generar la URL pública de Firebase Storage
// Asumiendo que las imágenes se subieron a la carpeta 'entities' en el bucket.
// Si las subiste a la raíz, cambia 'entities%2F' por ''
const getFirebaseUrl = (filename: string) => {
  return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_BUCKET}/o/entities%2F${filename}?alt=media`
}

async function migrateImages() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log("Conectado a MongoDB")

    const db = client.db("aether")
    const entitiesCol = db.collection("entities")

    const entities = await entitiesCol.find({}).toArray()
    console.log(`Se encontraron ${entities.length} entidades para migrar...`)

    let updatedCount = 0

    for (const entity of entities) {
      if (entity.imageUrl && entity.imageUrl.startsWith("/assets/entities/")) {
        // Extraer el nombre del archivo (ej. "vael.png")
        const filename = entity.imageUrl.split("/").pop()
        
        if (filename) {
          const newUrl = getFirebaseUrl(filename)
          
          await entitiesCol.updateOne(
            { _id: entity._id },
            { $set: { imageUrl: newUrl } }
          )
          console.log(`[OK] Actualizado ${entity.nombre}: ${newUrl}`)
          updatedCount++
        }
      } else {
        console.log(`[SKIP] ${entity.nombre} ya tiene una URL diferente: ${entity.imageUrl}`)
      }
    }

    console.log(`\nMigración completada. ${updatedCount} entidades actualizadas.`)
  } catch (err) {
    console.error("Error durante la migración:", err)
  } finally {
    await client.close()
  }
}

migrateImages()
