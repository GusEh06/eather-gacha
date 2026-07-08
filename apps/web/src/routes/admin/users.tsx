import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAdminFetch, type AdminUser } from "../../hooks/useAdmin"

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
})

const btnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #111",
  color: "#111",
  padding: "0.4rem 0.8rem",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "0.75rem",
  textTransform: "uppercase",
  borderRadius: "3px",
}

function AdminUsers() {
  const adminFetch = useAdminFetch()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  // Modales
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null)
  const [suspendReason, setSuspendReason] = useState("")
  const [suspendHours, setSuspendHours] = useState(24)
  const [rolesTarget, setRolesTarget] = useState<AdminUser | null>(null)
  const [rolesDraft, setRolesDraft] = useState<string[]>([])
  const [shardsTarget, setShardsTarget] = useState<AdminUser | null>(null)
  const [shardsAmount, setShardsAmount] = useState(0)
  const [shardsReason, setShardsReason] = useState("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users", search],
    queryFn: () =>
      adminFetch(`/admin/users?search=${encodeURIComponent(search)}&limit=100`) as Promise<{
        total: number
        users: AdminUser[]
      }>,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] })

  const suspend = useMutation({
    mutationFn: (vars: { clerkId: string; reason: string; durationHours: number }) =>
      adminFetch(`/admin/users/${vars.clerkId}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ reason: vars.reason, durationHours: vars.durationHours }),
      }),
    onSuccess: () => {
      invalidate()
      setSuspendTarget(null)
      setSuspendReason("")
    },
    onError: (err) => alert(`Error: ${err.message}`),
  })

  const unsuspend = useMutation({
    mutationFn: (clerkId: string) =>
      adminFetch(`/admin/users/${clerkId}/unsuspend`, { method: "PATCH" }),
    onSuccess: invalidate,
    onError: (err) => alert(`Error: ${err.message}`),
  })

  const saveRoles = useMutation({
    mutationFn: (vars: { clerkId: string; roles: string[] }) =>
      adminFetch(`/admin/users/${vars.clerkId}/roles`, {
        method: "PATCH",
        body: JSON.stringify({ roles: vars.roles }),
      }),
    onSuccess: () => {
      invalidate()
      setRolesTarget(null)
    },
    onError: (err) => alert(`Error: ${err.message}`),
  })

  const adjustShards = useMutation({
    mutationFn: (vars: { clerkId: string; amount: number; reason: string }) =>
      adminFetch(`/admin/users/${vars.clerkId}/shards`, {
        method: "PATCH",
        body: JSON.stringify({ amount: vars.amount, reason: vars.reason }),
      }),
    onSuccess: () => {
      invalidate()
      setShardsTarget(null)
      setShardsAmount(0)
      setShardsReason("")
    },
    onError: (err) => alert(`Error: ${err.message}`),
  })

  const modalOverlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  }
  const modalBox: React.CSSProperties = {
    background: "#fff",
    border: "2px solid #111",
    boxShadow: "6px 6px 0 #111",
    padding: "2rem",
    width: "min(480px, 90vw)",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  }
  const inputStyle: React.CSSProperties = {
    padding: "0.6rem",
    border: "2px solid #ddd",
    background: "#fafaf8",
    fontFamily: "var(--font-ui)",
    fontSize: "0.95rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "2rem", fontFamily: "var(--font-display)", margin: 0, color: "#111" }}>User Management</h2>
        <p style={{ color: "#555", margin: "0.5rem 0 0 0", fontSize: "0.95rem" }}>
          Suspensiones, roles y ajustes de balance. {data ? `${data.total} usuarios.` : ""}
        </p>
      </motion.div>

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(searchInput)
        }}
        style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}
      >
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por username o clerkId..."
          style={{ ...inputStyle, maxWidth: "380px" }}
        />
        <button type="submit" style={{ ...btnStyle, background: "#111", color: "#fff", padding: "0.4rem 1.2rem" }}>
          Buscar
        </button>
      </form>

      {error ? (
        <div style={{ background: "#ffe6e6", border: "2px solid #cc0000", padding: "1.5rem", color: "#cc0000", fontWeight: 700 }}>
          Error: {(error as Error).message}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "2px solid #111", boxShadow: "4px 4px 0 #111", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#111", color: "#fff", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                <th style={{ padding: "0.9rem" }}>Username</th>
                <th style={{ padding: "0.9rem" }}>Shards</th>
                <th style={{ padding: "0.9rem" }}>Inventario</th>
                <th style={{ padding: "0.9rem" }}>Roles</th>
                <th style={{ padding: "0.9rem" }}>Estado</th>
                <th style={{ padding: "0.9rem", textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#666" }}>Cargando usuarios...</td></tr>
              ) : data?.users.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#666" }}>Sin resultados.</td></tr>
              ) : (
                data?.users.map((u) => (
                  <tr key={u.clerkId} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "0.9rem" }}>
                      <div style={{ fontWeight: 700 }}>{u.username}</div>
                      <div style={{ fontSize: "0.72rem", color: "#999", fontFamily: "monospace" }}>{u.clerkId}</div>
                    </td>
                    <td style={{ padding: "0.9rem", fontWeight: 700, color: "#7b2fff" }}>◈ {u.shards.toLocaleString()}</td>
                    <td style={{ padding: "0.9rem" }}>{u.inventoryCount}</td>
                    <td style={{ padding: "0.9rem" }}>
                      {(u.roles.length ? u.roles : ["binder"]).map((r) => (
                        <span
                          key={r}
                          style={{
                            display: "inline-block",
                            marginRight: "0.3rem",
                            padding: "0.15rem 0.5rem",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            borderRadius: "3px",
                            background: r === "admin" ? "#7b2fff22" : r === "moderator" ? "#2196f322" : "#8882",
                            color: r === "admin" ? "#7b2fff" : r === "moderator" ? "#2196f3" : "#666",
                            border: `1px solid ${r === "admin" ? "#7b2fff" : r === "moderator" ? "#2196f3" : "#999"}55`,
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </td>
                    <td style={{ padding: "0.9rem" }}>
                      {u.suspended ? (
                        <span title={u.suspensionReason ?? ""} style={{ color: "#cc0000", fontWeight: 700, fontSize: "0.8rem" }}>
                          SUSPENDIDO<br />
                          <span style={{ fontWeight: 400, fontSize: "0.72rem" }}>
                            hasta {new Date(u.suspendedUntil!).toLocaleString()}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "#006600", fontWeight: 700, fontSize: "0.8rem" }}>ACTIVO</span>
                      )}
                    </td>
                    <td style={{ padding: "0.9rem", textAlign: "right", whiteSpace: "nowrap" }}>
                      {u.suspended ? (
                        <button style={{ ...btnStyle, marginRight: "0.4rem", borderColor: "#006600", color: "#006600" }} onClick={() => unsuspend.mutate(u.clerkId)}>
                          Levantar
                        </button>
                      ) : (
                        <button
                          style={{ ...btnStyle, marginRight: "0.4rem", borderColor: "#cc0000", color: "#cc0000" }}
                          onClick={() => {
                            setSuspendTarget(u)
                            setSuspendReason("")
                            setSuspendHours(24)
                          }}
                        >
                          Suspender
                        </button>
                      )}
                      <button
                        style={{ ...btnStyle, marginRight: "0.4rem" }}
                        onClick={() => {
                          setRolesTarget(u)
                          setRolesDraft(u.roles.length ? u.roles : ["binder"])
                        }}
                      >
                        Roles
                      </button>
                      <button
                        style={btnStyle}
                        onClick={() => {
                          setShardsTarget(u)
                          setShardsAmount(0)
                          setShardsReason("")
                        }}
                      >
                        ◈ Shards
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Suspender */}
      <AnimatePresence>
        {suspendTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={modalOverlay} onClick={() => setSuspendTarget(null)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} style={modalBox} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>
                Suspender a {suspendTarget.username}
              </h3>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                Motivo
                <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} style={{ ...inputStyle, minHeight: "70px", marginTop: "0.4rem" }} placeholder="Ej: farming con bots" />
              </label>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                Duración (horas)
                <input type="number" min={1} value={suspendHours} onChange={(e) => setSuspendHours(Number(e.target.value))} style={{ ...inputStyle, marginTop: "0.4rem" }} />
              </label>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button style={btnStyle} onClick={() => setSuspendTarget(null)}>Cancelar</button>
                <button
                  style={{ ...btnStyle, background: "#cc0000", borderColor: "#cc0000", color: "#fff" }}
                  disabled={suspendReason.trim().length < 3 || suspend.isPending}
                  onClick={() =>
                    suspend.mutate({ clerkId: suspendTarget.clerkId, reason: suspendReason.trim(), durationHours: suspendHours })
                  }
                >
                  {suspend.isPending ? "Suspendiendo..." : "Confirmar Suspensión"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Roles */}
      <AnimatePresence>
        {rolesTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={modalOverlay} onClick={() => setRolesTarget(null)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} style={modalBox} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>
                Roles de {rolesTarget.username}
              </h3>
              {["binder", "moderator", "admin"].map((r) => (
                <label key={r} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={rolesDraft.includes(r)}
                    onChange={(e) =>
                      setRolesDraft(e.target.checked ? [...rolesDraft, r] : rolesDraft.filter((x) => x !== r))
                    }
                    style={{ width: "18px", height: "18px", accentColor: "#111" }}
                  />
                  <span style={{ textTransform: "capitalize" }}>{r}</span>
                </label>
              ))}
              <p style={{ fontSize: "0.8rem", color: "#888", margin: 0 }}>
                Moderator: puede suspender usuarios y cancelar listings. Admin: acceso total.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button style={btnStyle} onClick={() => setRolesTarget(null)}>Cancelar</button>
                <button
                  style={{ ...btnStyle, background: "#111", color: "#fff" }}
                  disabled={saveRoles.isPending}
                  onClick={() => saveRoles.mutate({ clerkId: rolesTarget.clerkId, roles: rolesDraft })}
                >
                  {saveRoles.isPending ? "Guardando..." : "Guardar Roles"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Ajustar Shards */}
      <AnimatePresence>
        {shardsTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={modalOverlay} onClick={() => setShardsTarget(null)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} style={modalBox} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>
                Ajustar Shards de {shardsTarget.username}
              </h3>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#555" }}>
                Balance actual: <b style={{ color: "#7b2fff" }}>◈ {shardsTarget.shards.toLocaleString()}</b>
              </p>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                Cantidad (negativo para descontar)
                <input type="number" value={shardsAmount} onChange={(e) => setShardsAmount(Number(e.target.value))} style={{ ...inputStyle, marginTop: "0.4rem" }} />
              </label>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                Motivo
                <input value={shardsReason} onChange={(e) => setShardsReason(e.target.value)} style={{ ...inputStyle, marginTop: "0.4rem" }} placeholder="Ej: compensación por incidente" />
              </label>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button style={btnStyle} onClick={() => setShardsTarget(null)}>Cancelar</button>
                <button
                  style={{ ...btnStyle, background: "#111", color: "#fff" }}
                  disabled={shardsAmount === 0 || shardsReason.trim().length < 3 || adjustShards.isPending}
                  onClick={() =>
                    adjustShards.mutate({ clerkId: shardsTarget.clerkId, amount: shardsAmount, reason: shardsReason.trim() })
                  }
                >
                  {adjustShards.isPending ? "Aplicando..." : "Aplicar Ajuste"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
