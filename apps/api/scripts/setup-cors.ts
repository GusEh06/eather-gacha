import { bucket } from "../src/config/firebase"

async function setupCors() {
  if (!bucket) {
    console.error("Firebase bucket is not configured. Check environment variables.")
    process.exit(1)
  }

  const corsConfiguration = [
    {
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      method: ["GET", "OPTIONS"],
      responseHeader: ["Content-Type", "Access-Control-Allow-Origin"],
      maxAgeSeconds: 3600,
    },
  ]

  try {
    await bucket.setCorsConfiguration(corsConfiguration)
    console.log("CORS configuration has been set for bucket:", bucket.name)
  } catch (err) {
    console.error("Error setting CORS configuration:", err)
  }
}

setupCors()
