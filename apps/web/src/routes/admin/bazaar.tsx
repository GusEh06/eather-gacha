import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAdminFetch, type AdminListing } from "../../hooks/useAdmin"

export const Route = createFileRoute("/admin/bazaar")({
  component: AdminBazaar,
})

const STATUS_COLORS: Record<string, string> = {
  active: "#006600",
  sold: "#2196f3",
  cancelled: "#888",
  cancelled_by_mod: "#cc0000",
}

function AdminBazaar() {
  const adminFetch = useAdminFetch()
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState("active")
  const [cancelTarget, setCancelTarget] = useState<AdminListing | null>(null)
  const [cancelReason, setCancelReason] = useState("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "listings", statusFilter],
    queryFn: () =>
      adminFetch(`/admin/listings?status=${statusFilter}&limit=200`) as Promise<{
        listings: AdminListing[]
      }>,
  })

  const cancelListing = useMutation({
    mutationFn: (vars: { listingId: string; reason: string }) =>
      adminFetch(`/admin/listings/${vars.listingId}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: vars.reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "listings"] })
      setCancelTarget(null)
      setCancelReason("")
    },
    onError: (err) => alert(`Error: ${err.message}`),
  })

  const btnStyle: React.CSSProperties = {
    background: "transparent",
    border: "1px solid #cc0000",
    color: "#cc0000",
    padding: "0.4rem 0.9rem",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.75rem",
    textTransform: "uppercase",
    borderRadius: "3px",
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "2rem", fontFamily: "var(--font-display)", margin: 0, color: "#111" }}>Bazaar Moderation</h2>
        <p style={{ color: "#555", margin: "0.5rem 0 0 0", fontSize: "0.95rem" }}>
          Retira listings abusivos o inapropiados. El vendedor recibe una notificación con el motivo.
        </p>
      </motion.div>

      {/* Filter */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {["active", "sold", "cancelled_by_mod", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: "0.5rem 1rem",
              border: "2px solid #111",
              background: statusFilter === s ? "#111" : "#fff",
              color: statusFilter === s ? "#fff" : "#111",
              fontWeight: 700,
              fontSize: "0.78rem",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {s === "all" ? "Todos" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {error ? (
        <div style={{ background: "#ffe6e6", border: "2px solid #cc0000", padding: "1.5rem", color: "#cc0000", fontWeight: 700 }}>
          Error: {(error as Error).message}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "2px solid #111", boxShadow: "4px 4px 0 #111", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#111", color: "#fff", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                <th style={{ padding: "0.9rem" }}>Entidad</th>
                <th style={{ padding: "0.9rem" }}>Rareza</th>
                <th style={{ padding: "0.9rem" }}>Vendedor</th>
                <th style={{ padding: "0.9rem" }}>Precio</th>
                <th style={{ padding: "0.9rem" }}>Estado</th>
                <th style={{ padding: "0.9rem" }}>Publicado</th>
                <th style={{ padding: "0.9rem", textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#666" }}>Cargando listings...</td></tr>
              ) : data?.listings.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#666" }}>Sin listings para este filtro.</td></tr>
              ) : (
                data?.listings.map((l) => (
                  <tr key={l._id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "0.9rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                        {l.imageUrl && (
                          <img src={l.imageUrl} alt={l.entityName} style={{ width: "40px", height: "40px", objectFit: "cover", border: "1px solid #ccc", borderRadius: "3px" }} />
                        )}
                        <span style={{ fontWeight: 700 }}>{l.entityName}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.9rem", textTransform: "uppercase", fontSize: "0.78rem", fontWeight: 700 }}>{l.entityRarity}</td>
                    <td style={{ padding: "0.9rem" }}>{l.sellerUsername}</td>
                    <td style={{ padding: "0.9rem", fontWeight: 700, color: "#7b2fff" }}>◈ {l.priceShards.toLocaleString()}</td>
                    <td style={{ padding: "0.9rem" }}>
                      <span style={{ color: STATUS_COLORS[l.status] ?? "#666", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase" }}>
                        {l.status.replace(/_/g, " ")}
                      </span>
                      {l.cancelReason && (
                        <div style={{ fontSize: "0.72rem", color: "#999" }}>Motivo: {l.cancelReason}</div>
                      )}
                    </td>
                    <td style={{ padding: "0.9rem", fontSize: "0.8rem", color: "#666" }}>
                      {new Date(l.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "0.9rem", textAlign: "right" }}>
                      {l.status === "active" && (
                        <button
                          style={btnStyle}
                          onClick={() => {
                            setCancelTarget(l)
                            setCancelReason("")
                          }}
                        >
                          Retirar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: cancelar listing */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
            onClick={() => setCancelTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              style={{ background: "#fff", border: "2px solid #111", boxShadow: "6px 6px 0 #111", padding: "2rem", width: "min(480px, 90vw)", display: "flex", flexDirection: "column", gap: "1rem" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>
                Retirar "{cancelTarget.entityName}"
              </h3>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#555" }}>
                Vendedor: <b>{cancelTarget.sellerUsername}</b> — ◈ {cancelTarget.priceShards.toLocaleString()}
              </p>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                Motivo de la cancelación (visible para el vendedor)
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{ padding: "0.6rem", border: "2px solid #ddd", background: "#fafaf8", width: "100%", boxSizing: "border-box", minHeight: "80px", marginTop: "0.4rem", fontFamily: "var(--font-ui)" }}
                  placeholder="Ej: precio abusivo / contenido inadecuado"
                />
              </label>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button style={{ ...btnStyle, borderColor: "#111", color: "#111" }} onClick={() => setCancelTarget(null)}>
                  Cancelar
                </button>
                <button
                  style={{ ...btnStyle, background: "#cc0000", color: "#fff" }}
                  disabled={cancelReason.trim().length < 3 || cancelListing.isPending}
                  onClick={() => cancelListing.mutate({ listingId: cancelTarget._id, reason: cancelReason.trim() })}
                >
                  {cancelListing.isPending ? "Retirando..." : "Confirmar Retiro"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
