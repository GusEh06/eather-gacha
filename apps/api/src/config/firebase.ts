import admin from "firebase-admin"

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
// Fix multiline parsing if env variable was loaded incorrectly
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET

if (!admin.apps.length) {
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    })
    console.log("[firebase] Admin SDK initialized successfully.")
  } else {
    console.warn("[firebase] Missing credentials. Firebase Admin SDK not initialized.")
  }
}

export const bucket = admin.apps.length ? admin.storage().bucket() : null
