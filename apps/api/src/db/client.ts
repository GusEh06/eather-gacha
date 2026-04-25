import { MongoClient, type Db } from "mongodb"

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://root:root@localhost:27017/aether?authSource=admin"

let client: MongoClient | null = null
let db: Db | null = null

export async function getDb(): Promise<Db> {
  if (db) return db

  client = new MongoClient(MONGODB_URI)
  await client.connect()
  db = client.db("aether")
  console.log("[db] Connected to MongoDB")
  return db
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}
