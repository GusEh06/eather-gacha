import { Link } from "@tanstack/react-router"
import { useAuth, useUser } from "@clerk/tanstack-react-start"
import { useMemo, useState } from "react"
import { ShardsDisplay } from "./ShardsDisplay"
import { EcosDisplay } from "./EcosDisplay"
import { useUserProfile } from "../../hooks/useUserProfile"
import { AuthPanel } from "./AuthPanel"
import { NotificationBell } from "./NotificationBell"

const NAV_LINKS = [
  { to: "/",           label: "The Altar" },
  { to: "/espiral",    label: "La Espiral" },
  { to: "/bazaar",     label: "Bazaar" },
  { to: "/rift",       label: "The Rift" },
  { to: "/vault",      label: "Vault" },
  { to: "/collection", label: "Collection" },
  { to: "/profile",    label: "Profile" },
] as const

export function Navbar() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { data: profile } = useUserProfile()
  const [authOpen, setAuthOpen] = useState(false)

  const binderName = useMemo(() => {
    const userTag =
      user?.username?.trim() ||
      user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      "unknown"
    return `Aether Binder [${userTag}]`
  }, [user])

  return (
    <nav
      style={{
        height: "60px",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Brand + notifications (left corner) */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
        <Link
          to="/"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "var(--accent-aether)",
            letterSpacing: "0.08em",
            textDecoration: "none",
          }}
        >
          AETHER GACHA
        </Link>
        {isSignedIn && <NotificationBell />}
      </div>

      {/* Nav links */}
      <ul
        style={{
          display: "flex",
          gap: "1.5rem",
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {NAV_LINKS.map(({ to, label }) => (
          <li key={to}>
            <Link
              to={to}
              style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: "0.9rem", letterSpacing: "0.04em" }}
              activeProps={{ style: { color: "var(--accent-aether)" } }}
              inactiveProps={{ style: { color: "var(--text-secondary)" } }}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Shards + auth (right corner) */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
        {isSignedIn ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <ShardsDisplay amount={profile?.shards ?? 0} />
              <EcosDisplay amount={profile?.ecos ?? 0} />
            </div>
            <button
              className="btn-secondary"
              style={{
                fontSize: "0.82rem",
                padding: "0 0.9rem",
                height: "38px",
                boxSizing: "border-box",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
              }}
              onClick={() => setAuthOpen(true)}
            >
              {binderName}
            </button>
          </>
        ) : (
          <button
            className="btn-primary"
            style={{ fontSize: "0.85rem", padding: "0 1rem", height: "38px", boxSizing: "border-box" }}
            onClick={() => setAuthOpen(true)}
          >
            Sign In
          </button>
        )}
      </div>

      <AuthPanel open={authOpen} onClose={() => setAuthOpen(false)} />
    </nav>
  )
}
