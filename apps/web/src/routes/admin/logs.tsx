import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { motion } from "framer-motion"
import { useAdminFetch, type AdminAuditLog } from "../../hooks/useAdmin"

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogs,
})

const ACTION_FILTERS = [
  { value: "", label: "Todas" },
  { value: "gacha.", label: "Gacha" },
  { value: "market.", label: "Bazaar" },
  { value: "rift.", label: "Rift" },
  { value: "vault.", label: "Pagos" },
  { value: "admin.", label: "Admin" },
]

function AdminLogs() {
  const adminFetch = useAdminFetch()
  const [actionFilter, setActionFilter] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "audit-logs", actionFilter],
    queryFn: () =>
      adminFetch(`/admin/audit-logs?action=${encodeURIComponent(actionFilter)}&limit=200`) as Promise<{
        total: number
        logs: AdminAuditLog[]
      }>,
    refetchInterval: 15_000,
  })

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "2rem", fontFamily: "var(--font-display)", margin: 0, color: "#111" }}>Audit Log</h2>
        <p style={{ color: "#555", margin: "0.5rem 0 0 0", fontSize: "0.95rem" }}>
          Registro inmutable de acciones críticas. {data ? `${data.total} entradas.` : ""} Actualiza cada 15s.
        </p>
      </motion.div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {ACTION_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActionFilter(f.value)}
            style={{
              padding: "0.5rem 1rem",
              border: "2px solid #111",
              background: actionFilter === f.value ? "#111" : "#fff",
              color: actionFilter === f.value ? "#fff" : "#111",
              fontWeight: 700,
              fontSize: "0.78rem",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div style={{ background: "#ffe6e6", border: "2px solid #cc0000", padding: "1.5rem", color: "#cc0000", fontWeight: 700 }}>
          Error: {(error as Error).message}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "2px solid #111", boxShadow: "4px 4px 0 #111", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "#111", color: "#fff", textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.05em" }}>
                <th style={{ padding: "0.8rem" }}>Timestamp</th>
                <th style={{ padding: "0.8rem" }}>Acción</th>
                <th style={{ padding: "0.8rem" }}>Usuario</th>
                <th style={{ padding: "0.8rem" }}>IP</th>
                <th style={{ padding: "0.8rem" }}>Resultado</th>
                <th style={{ padding: "0.8rem" }}>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#666" }}>Cargando registros...</td></tr>
              ) : data?.logs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#666" }}>Sin registros aún. Las acciones críticas aparecerán aquí.</td></tr>
              ) : (
                data?.logs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                    <td style={{ padding: "0.8rem", whiteSpace: "nowrap", color: "#666", fontFamily: "monospace", fontSize: "0.78rem" }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.8rem", fontWeight: 700, fontFamily: "monospace", fontSize: "0.8rem" }}>{log.action}</td>
                    <td style={{ padding: "0.8rem", fontFamily: "monospace", fontSize: "0.75rem", color: "#555" }}>
                      {log.userId.length > 18 ? `…${log.userId.slice(-10)}` : log.userId}
                    </td>
                    <td style={{ padding: "0.8rem", fontFamily: "monospace", fontSize: "0.75rem", color: "#888" }}>{log.ip ?? "—"}</td>
                    <td style={{ padding: "0.8rem" }}>
                      <span style={{ color: log.result === "success" ? "#006600" : "#cc0000", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase" }}>
                        {log.result}
                      </span>
                    </td>
                    <td style={{ padding: "0.8rem", maxWidth: "340px" }}>
                      <button
                        onClick={() => setExpanded(expanded === log._id ? null : log._id)}
                        style={{ background: "none", border: "none", color: "#2196f3", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, padding: 0 }}
                      >
                        {expanded === log._id ? "ocultar" : "ver detalles"}
                      </button>
                      {expanded === log._id && (
                        <pre style={{ margin: "0.5rem 0 0 0", fontSize: "0.72rem", background: "#f4f4f0", padding: "0.6rem", overflow: "auto", maxHeight: "200px", border: "1px solid #ddd" }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
