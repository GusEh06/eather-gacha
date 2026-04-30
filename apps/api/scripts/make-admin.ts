import { createClerkClient } from "@clerk/backend"

async function makeAdmin(email: string) {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  const users = await clerk.users.getUserList({ emailAddress: [email] })

  if (users.data.length === 0) {
    console.error(`User with email ${email} not found.`)
    process.exit(1)
  }

  const user = users.data[0]
  
  await clerk.users.updateUserMetadata(user.id, {
    publicMetadata: {
      role: "admin",
    },
  })

  console.log(`Successfully made ${email} (ID: ${user.id}) an admin!`)
}

const emailArg = process.argv[2]
if (!emailArg) {
  console.error("Please provide an email address as the first argument.")
  console.error("Usage: bun run scripts/make-admin.ts <email>")
  process.exit(1)
}

makeAdmin(emailArg).catch(err => {
  console.error("Error making user admin:", err)
  process.exit(1)
})
