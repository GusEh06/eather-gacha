import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router"
import { useUser } from "@clerk/tanstack-react-start"
import { motion } from "framer-motion"

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
})

const sidebarItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.15 + i * 0.08, type: "spring", stiffness: 300, damping: 24 },
  }),
}

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/entities", label: "Entities", exact: false },
  { to: "/admin/users", label: "Users", exact: false },
  { to: "/admin/bazaar", label: "Bazaar", exact: false },
  { to: "/admin/logs", label: "Audit Log", exact: false },
] as const

function AdminNav() {
  const location = useLocation()

  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {ADMIN_NAV.map((item, i) => {
        const isActive = item.exact
          ? location.pathname === item.to || location.pathname === `${item.to}/`
          : location.pathname.startsWith(item.to)
        return (
          <motion.div
            key={item.to}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={sidebarItemVariants}
            whileHover={{ scale: 1.03, x: 4 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              to={item.to}
              style={{
                display: "block",
                padding: "0.75rem 1rem",
                border: "1px solid #111",
                background: isActive ? "#111" : "#fff",
                color: isActive ? "#fff" : "#111",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.9rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                boxShadow: isActive ? "2px 2px 0 #666" : "2px 2px 0 #ddd",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {item.label}
            </Link>
          </motion.div>
        )
      })}
    </nav>
  )
}

function AdminLayout() {
  const { user, isLoaded } = useUser()
  const navigate = useNavigate()

  if (!isLoaded) {
    return (
      <div style={{ height: "100vh", background: "#f4f4f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, repeat: Infinity, repeatType: "reverse" }}
        >
          <p style={{ fontFamily: "var(--font-display)", color: "#111", fontSize: "1.4rem", letterSpacing: "0.1em" }}>
            Verifying Clearance...
          </p>
        </motion.div>
      </div>
    )
  }

  if (!user || user.publicMetadata?.role !== "admin") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ height: "100vh", background: "#f4f4f0", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", justifyContent: "center" }}
      >
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          style={{ fontFamily: "var(--font-display)", color: "#cc0000", fontSize: "3rem", margin: 0 }}
        >
          UNAUTHORIZED ACCESS
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ fontFamily: "var(--font-ui)", color: "#111", fontSize: "1.2rem" }}
        >
          You do not have the required "admin" clearance.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ fontFamily: "var(--font-ui)", color: "#666", fontSize: "0.9rem" }}
        >
          Current Role: {user?.publicMetadata?.role ? String(user.publicMetadata.role) : "None (User)"}<br/>
          Current Email: {user?.primaryEmailAddress?.emailAddress}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}
        >
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={async () => {
              if (user) {
                await user.reload();
                window.location.reload();
              }
            }}
            style={{ padding: "0.75rem 1.5rem", background: "#111", color: "#fff", border: "2px solid #111", cursor: "pointer", fontFamily: "var(--font-ui)", textTransform: "uppercase", boxShadow: "3px 3px 0 #666", transition: "box-shadow 0.15s" }}
          >
            Force Session Reload
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04, y: -2, backgroundColor: "#111", color: "#fff" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate({ to: "/" })}
            style={{ padding: "0.75rem 1.5rem", background: "transparent", color: "#111", border: "2px solid #111", cursor: "pointer", fontFamily: "var(--font-ui)", textTransform: "uppercase", transition: "all 0.15s" }}
          >
            Return to Altar
          </motion.button>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f4f0",
        color: "#111",
        fontFamily: "var(--font-ui)",
        display: "flex",
      }}
    >
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -260, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 26 }}
        style={{
          width: "260px",
          borderRight: "2px solid #111",
          background: "#fff",
          padding: "2rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              letterSpacing: "0.05em",
              color: "#111",
              borderBottom: "2px solid #111",
              paddingBottom: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            AETHER ADMIN
          </h1>
          <p style={{ fontSize: "0.8rem", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            The Backoffice
          </p>
        </motion.div>

        <AdminNav />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ marginTop: "auto", borderTop: "1px solid #eee", paddingTop: "1rem" }}
        >
          <p style={{ fontSize: "0.8rem", color: "#666" }}>Logged in as:</p>
          <p style={{ fontSize: "0.9rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.primaryEmailAddress?.emailAddress}
          </p>
          <motion.button
            whileHover={{ scale: 1.03, backgroundColor: "#111", color: "#fff" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate({ to: "/" })}
            style={{
              marginTop: "1rem",
              background: "transparent",
              border: "1px solid #111",
              padding: "0.5rem 1rem",
              width: "100%",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontWeight: 600,
              fontSize: "0.8rem",
              textTransform: "uppercase",
              transition: "all 0.15s",
            }}
          >
            Return to App
          </motion.button>
        </motion.div>
      </motion.aside>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        style={{ flex: 1, padding: "3rem", overflowY: "auto" }}
      >
        <Outlet />
      </motion.main>
    </div>
  )
}
