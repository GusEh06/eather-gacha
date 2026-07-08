import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAdminFetch, type AdminStats } from "../../hooks/useAdmin"

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
})

function StatCard({ label, value, accent, index }: { label: string; value: string; accent?: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 26 }}
      style={{
        background: "#fff",
        border: "2px solid #111",
        boxShadow: "4px 4px 0 #111",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <span style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#666", fontWeight: 700 }}>
        {label}
      </span>
      <span style={{ fontSize: "2.2rem", fontFamily: "var(--font-display)", fontWeight: 700, color: accent ?? "#111", lineHeight: 1 }}>
        {value}
      </span>
    </motion.div>
  )
}

function AdminDashboard() {
  const adminFetch = useAdminFetch()

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminFetch("/admin/stats") as Promise<AdminStats>,
    refetchInterval: 30_000,
  })

  const fmt = (n: number | undefined) => (n ?? 0).toLocaleString("en-US")

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: "2rem" }}
      >
        <h2 style={{ fontSize: "2rem", fontFamily: "var(--font-display)", margin: 0, color: "#111" }}>
          Dashboard
        </h2>
        <p style={{ color: "#555", margin: "0.5rem 0 0 0", fontSize: "0.95rem" }}>
          Salud económica de la plataforma — actualiza cada 30s.
        </p>
      </motion.div>

      {error ? (
        <div style={{ background: "#ffe6e6", border: "2px solid #cc0000", padding: "1.5rem", color: "#cc0000", fontWeight: 700 }}>
          Error cargando métricas: {(error as Error).message}
        </div>
      ) : isLoading ? (
        <p style={{ color: "#666" }}>Cargando métricas...</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "1.5rem" }}>
            <StatCard index={0} label="Usuarios Totales" value={fmt(stats?.totalUsers)} />
            <StatCard index={1} label="Shards en Circulación" value={`◈ ${fmt(stats?.shardsCirculating)}`} accent="#7b2fff" />
            <StatCard index={2} label="Entidades en Catálogo" value={fmt(stats?.totalEntities)} />
            <StatCard index={3} label="Listings Activos" value={fmt(stats?.activeListings)} accent="#2196f3" />
            <StatCard index={4} label="Invocaciones Hoy" value={fmt(stats?.dailyInvocations)} accent="#f0a500" />
            <StatCard index={5} label="Ventas Bazaar Hoy" value={fmt(stats?.dailyBazaarSales)} />
            <StatCard index={6} label="Volumen Bazaar Hoy" value={`◈ ${fmt(stats?.dailyBazaarVolume)}`} />
            <StatCard index={7} label="Tributo Recaudado Hoy" value={`◈ ${fmt(stats?.tributeCollectedToday)}`} accent="#0e7c7b" />
            <StatCard index={8} label="Cuentas Suspendidas" value={fmt(stats?.suspendedUsers)} accent={stats?.suspendedUsers ? "#cc0000" : undefined} />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{ marginTop: "2.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}
          >
            {[
              { to: "/admin/entities", label: "Gestionar Entidades" },
              { to: "/admin/users", label: "Gestionar Usuarios" },
              { to: "/admin/bazaar", label: "Moderar Bazaar" },
              { to: "/admin/logs", label: "Ver Auditoría" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#111",
                  color: "#fff",
                  textDecoration: "none",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  boxShadow: "3px 3px 0 #666",
                  border: "2px solid #111",
                }}
              >
                {l.label} →
              </Link>
            ))}
          </motion.div>
        </>
      )}
    </div>
  )
}
