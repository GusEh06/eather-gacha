import { useState, useRef, useEffect } from "react"
import { Bell } from "lucide-react"
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "../../hooks/useNotifications"

const TYPE_ICONS: Record<string, string> = {
  bazaar_sale: "◈",
  listing_cancelled: "✕",
  rift_rotation: "⟳",
  system: "•",
}

/** P-38: campana de notificaciones in-app en el navbar */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unread = data?.unreadCount ?? 0

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ""}`}
        style={{
          background: "transparent",
          border: "1px solid var(--border-subtle)",
          color: unread ? "var(--accent-aether)" : "var(--text-secondary)",
          padding: "0.4rem 0.55rem",
          cursor: "pointer",
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              background: "#ff3399",
              color: "#fff",
              fontSize: "0.65rem",
              fontWeight: 700,
              minWidth: "16px",
              height: "16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: "340px",
            maxHeight: "420px",
            overflowY: "auto",
            background: "var(--bg-surface, #110518)",
            border: "1px solid var(--border-subtle, #333)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            zIndex: 200,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--border-subtle, #333)",
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: "0.85rem", color: "var(--accent-aether)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Notificaciones
            </span>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {!data || data.notifications.length === 0 ? (
            <p style={{ padding: "1.5rem 1rem", color: "var(--text-secondary)", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>
              El vacío está en silencio. Sin notificaciones.
            </p>
          ) : (
            data.notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => !n.read && markRead.mutate(n._id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: n.read ? "transparent" : "rgba(0, 255, 255, 0.06)",
                  border: "none",
                  borderBottom: "1px solid var(--border-subtle, #222)",
                  padding: "0.75rem 1rem",
                  cursor: n.read ? "default" : "pointer",
                }}
              >
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
                  <span style={{ color: "var(--accent-aether)" }}>{TYPE_ICONS[n.type] ?? "•"}</span>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: n.read ? "var(--text-secondary)" : "var(--text-primary, #e8e8f0)" }}>
                    {n.title}
                  </span>
                </div>
                <p style={{ margin: "0.3rem 0 0 1.1rem", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  {n.message}
                </p>
                <span style={{ display: "block", marginLeft: "1.1rem", marginTop: "0.25rem", fontSize: "0.68rem", color: "var(--text-secondary)", opacity: 0.7 }}>
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
