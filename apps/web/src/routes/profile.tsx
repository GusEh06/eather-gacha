import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useUserProfile } from "../hooks/useUserProfile"
import { useTransactions, type ShardTransaction } from "../hooks/useNotifications"

export const Route = createFileRoute("/profile")({ component: ProfilePage })

const TYPE_LABELS: Record<ShardTransaction["type"], string> = {
  invocacion: "Invocación",
  compra_rift: "Compra Rift",
  compra_bazaar: "Compra Bazaar",
  venta_bazaar: "Venta Bazaar",
  recarga: "Recarga",
  ajuste_admin: "Ajuste Admin",
}

const PAGE_SIZE = 50

function exportCsv(transactions: ShardTransaction[]) {
  const header = "fecha,tipo,cantidad,saldo_resultante,descripcion"
  const rows = transactions.map((t) =>
    [
      new Date(t.createdAt).toISOString(),
      t.type,
      t.amount,
      t.balanceAfter,
      `"${t.description.replace(/"/g, '""')}"`,
    ].join(",")
  )
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `aether_transacciones_${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function ProfilePage() {
  const { data: profile } = useUserProfile()
  const [page, setPage] = useState(0)
  const { data, isLoading, error } = useTransactions(PAGE_SIZE, page * PAGE_SIZE)

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--accent-aether)",
          fontSize: "2rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: "0.5rem",
        }}
      >
        Perfil del Binder
      </h1>

      {/* Resumen del perfil */}
      {profile && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "1rem",
            margin: "1.5rem 0 2.5rem 0",
          }}
        >
          {[
            { label: "Username", value: profile.username },
            { label: "Shards", value: `◈ ${profile.shards.toLocaleString()}` },
            { label: "Pity Pulsar", value: `${profile.pityCounter} / 89` },
            { label: "Pity Mythic", value: `${profile.pityMythicCounter} / 179` },
            { label: "Entidades", value: String(profile.inventoryCount) },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                padding: "1rem",
              }}
            >
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                {item.label}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--text-primary, #e8e8f0)" }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historial */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--text-primary, #e8e8f0)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
          Historial de Shards {data ? `(${data.total})` : ""}
        </h2>
        <button
          className="btn-secondary"
          style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}
          disabled={!data || data.transactions.length === 0}
          onClick={() => data && exportCsv(data.transactions)}
        >
          Exportar CSV
        </button>
      </div>

      {error ? (
        <p style={{ color: "#ff3399" }}>Error cargando el historial: {(error as Error).message}</p>
      ) : isLoading ? (
        <p style={{ color: "var(--text-secondary)" }}>Cargando historial...</p>
      ) : !data || data.transactions.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>
          Aún no hay movimientos. Invoca entidades o compra Shards para empezar.
        </p>
      ) : (
        <>
          <div style={{ border: "1px solid var(--border-subtle)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-surface)", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.06em" }}>Fecha</th>
                  <th style={{ padding: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.06em" }}>Tipo</th>
                  <th style={{ padding: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.06em", textAlign: "right" }}>Cantidad</th>
                  <th style={{ padding: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.06em", textAlign: "right" }}>Saldo</th>
                  <th style={{ padding: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.06em" }}>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t._id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--text-primary, #e8e8f0)", fontWeight: 600 }}>
                      {TYPE_LABELS[t.type] ?? t.type}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: 700, color: t.amount >= 0 ? "#1abc9c" : "#ff3399" }}>
                      {t.amount >= 0 ? "+" : ""}{t.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "right", color: "var(--text-secondary)" }}>
                      ◈ {t.balanceAfter.toLocaleString()}
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                      {t.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.25rem", alignItems: "center" }}>
              <button
                className="btn-secondary"
                style={{ fontSize: "0.8rem", padding: "0.35rem 0.8rem" }}
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Anterior
              </button>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Página {page + 1} de {totalPages}
              </span>
              <button
                className="btn-secondary"
                style={{ fontSize: "0.8rem", padding: "0.35rem 0.8rem" }}
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
