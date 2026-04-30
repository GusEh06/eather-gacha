import { Hono } from "hono"
import { adminMiddleware } from "../middleware/adminAuth"
import { getDb } from "../db/client"
import { entitiesCol } from "../db/collections"
import { bucket } from "../config/firebase"
import { ObjectId } from "mongodb"

const router = new Hono()

// All admin routes require admin role
router.use("*", adminMiddleware)

// Get all entities
router.get("/entities", async (c) => {
  const db = await getDb()
  const entities = await entitiesCol(db).find({}).toArray()
  return c.json({ entities })
})

// Create a new entity (handles multipart/form-data)
router.post("/entities", async (c) => {
  const body = await c.req.parseBody()
  
  const nombre = body["nombre"] as string
  const rareza = body["rareza"] as string
  const arquetipo = body["arquetipo"] as string
  const epoca = body["epoca"] as string
  const descripcionLore = body["descripcionLore"] as string
  const descripcionOjos = body["descripcionOjos"] as string
  const disponibleRift = body["disponibleRift"] === "true"
  const imageFile = body["image"] as File | undefined

  if (!nombre || !rareza || !arquetipo || !epoca || !descripcionLore || !descripcionOjos || !imageFile) {
    return c.json({ error: "Missing required fields" }, 400)
  }

  // Upload image to Firebase Storage
  if (!bucket) {
    return c.json({ error: "Firebase bucket not configured" }, 500)
  }

  try {
    const buffer = await imageFile.arrayBuffer()
    const extension = imageFile.name.split('.').pop() || "png"
    const fileName = `entities/${Date.now()}_${nombre.replace(/\\s+/g, '_').toLowerCase()}.${extension}`
    
    const file = bucket.file(fileName)
    await file.save(Buffer.from(buffer), {
      contentType: imageFile.type || "image/png",
      public: true, // Make publicly accessible
      metadata: {
        cacheControl: "public, max-age=31536000",
      }
    })

    // Get the public URL
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`

    const newEntity = {
      nombre,
      rareza,
      arquetipo,
      epoca,
      descripcionLore,
      descripcionOjos,
      disponibleRift,
      imageUrl,
    }

    const db = await getDb()
    const result = await entitiesCol(db).insertOne(newEntity)

    return c.json({ success: true, entityId: result.insertedId, imageUrl })
  } catch (error) {
    console.error("[admin] Error creating entity:", error)
    return c.json({ error: "Failed to create entity and upload image" }, 500)
  }
})

// Delete an entity
router.delete("/entities/:id", async (c) => {
  const id = c.req.param("id")
  const db = await getDb()
  
  try {
    const entity = await entitiesCol(db).findOne({ _id: new ObjectId(id) })
    if (entity && entity.imageUrl && bucket) {
      // Extract filename from URL (very basic extraction)
      const match = entity.imageUrl.match(/\/o\/(entities%2F[^?]+)/)
      if (match && match[1]) {
        const filePath = decodeURIComponent(match[1])
        try {
          await bucket.file(filePath).delete()
        } catch (e) {
          console.warn(`[admin] Could not delete image ${filePath} from bucket:`, e)
        }
      }
    }

    await entitiesCol(db).deleteOne({ _id: new ObjectId(id) })
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: "Failed to delete entity" }, 500)
  }
})

export default router
