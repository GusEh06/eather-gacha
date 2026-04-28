import { useEffect, useRef, type ReactNode } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { useAuth, SignInButton, UserButton, useUser } from "@clerk/tanstack-react-start"
import anime from "animejs"
import { useUserProfile } from "../../hooks/useUserProfile"
import { LivingAtmosphere } from "./LivingAtmosphere"

const NAV_ITEMS = [
  { to: "/",           label: "The Altar" },
  { to: "/bazaar",     label: "The Bazaar" },
  { to: "/rift",       label: "The Rift" },
  { to: "/vault",      label: "The Vault" },
  { to: "/collection", label: "Collection" },
] as const

const CONTEXT_COPY: Record<string, { eyebrow: string; title: string }> = {
  "/":           { eyebrow: "Gacha Summoning",  title: "Evento: Corazones Cósmicos" },
  "/bazaar":     { eyebrow: "Hollow Bazaar",    title: "Mercado de las Sombras" },
  "/rift":       { eyebrow: "Drift",            title: "Rotación del Vacío" },
  "/vault":      { eyebrow: "Reserve",          title: "Adquisición de Shards" },
  "/collection": { eyebrow: "Archive",          title: "Tu Pacto" },
}

interface MasterLayoutProps {
  children: ReactNode
}

export function MasterLayout({ children }: MasterLayoutProps) {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { data: profile } = useUserProfile()

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const ctx = CONTEXT_COPY[pathname] ?? CONTEXT_COPY["/"]!

  const sidebarRef  = useRef<HTMLElement | null>(null)
  const hudRef      = useRef<HTMLDivElement | null>(null)
  const contextRef  = useRef<HTMLDivElement | null>(null)
  const logoRef     = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const tl = anime.timeline({ easing: "easeOutElastic(1, .8)" })

    if (sidebarRef.current) {
      tl.add({
        targets: sidebarRef.current.querySelectorAll(".gacha-nav-item"),
        translateX: [-100, 0],
        opacity: [0, 1],
        delay: anime.stagger(80),
        duration: 800,
      })
    }
    if (logoRef.current) {
      tl.add({
        targets: logoRef.current,
        scale: [0.5, 1],
        opacity: [0, 1],
        duration: 800,
      }, "-=600")
    }
    if (hudRef.current) {
      tl.add({
        targets: hudRef.current.querySelectorAll(".gacha-hud-bar"),
        translateX: [100, 0],
        opacity: [0, 1],
        delay: anime.stagger(80),
        duration: 800,
      }, "-=800")
    }
    if (contextRef.current) {
      tl.add({
        targets: contextRef.current,
        translateY: [50, 0],
        opacity: [0, 1],
        duration: 600,
      }, "-=400")
    }
  }, [])

  const pity = profile?.pityCounter ?? 0
  const shards = profile?.shards ?? 0
  const binderName = user?.username ?? user?.firstName ?? "Wanderer"

  const routeKey =
    pathname === "/"           ? "altar"      :
    pathname.startsWith("/bazaar")     ? "bazaar"     :
    pathname.startsWith("/rift")       ? "rift"       :
    pathname.startsWith("/vault")      ? "vault"      :
    pathname.startsWith("/collection") ? "collection" :
    "altar"

  function bindNavHover(el: HTMLAnchorElement | null) {
    if (!el || el.dataset.hoverBound) return
    el.dataset.hoverBound = "1"
    el.addEventListener("mouseenter", () => {
      anime.remove(el)
      anime({ targets: el, scale: 1.05, duration: 200, easing: "easeOutQuad" })
    })
    el.addEventListener("mouseleave", () => {
      anime.remove(el)
      anime({ targets: el, scale: 1, duration: 200, easing: "easeOutQuad" })
    })
  }

  return (
    <div className="gacha-shell" data-route={routeKey}>
      {/* ATMOSPHERE BACKDROP */}
      <div className="aether-atmosphere" aria-hidden="true" />
      <LivingAtmosphere route={routeKey} />
      <div className="aether-vignette" aria-hidden="true" />

      {/* TOP BAR: Logo on Left, HUD on Right */}
      <div className="gacha-topbar">
        <div className="gacha-logo-container" ref={logoRef}>
          <h1 className="gacha-logo">
            AETHER_GACHA
          </h1>
        </div>

        <header className="gacha-hud" ref={hudRef}>
          <div className="gacha-hud-icon" title={`Pity: ${pity}/90`}>
            👁
          </div>
          <div className="gacha-hud-icon" title={`Shards: ${shards}`}>
            ◈
          </div>
          <div className="gacha-hud-icon gacha-hud-user">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                 <button className="gacha-login-icon">★</button>
              </SignInButton>
            )}
          </div>
        </header>
      </div>

      {/* LEFT SIDEBAR: Retractable Panel */}
      <div className="sidebar-wrapper">
        <div className="sidebar-trigger">☰</div>
        <aside className="gacha-sidebar" ref={sidebarRef}>
          <div className="sidebar-header">
            <div className="sidebar-icon">🩸</div>
            <div className="sidebar-title">
              <h2>COMMAND_HUB</h2>
              <span>DEEP_VOID_V.01</span>
            </div>
          </div>
          <nav className="gacha-nav">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                ref={bindNavHover}
                className={`gacha-nav-item ${pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to)) ? "is-active" : ""}`}
              >
                {item.label.toUpperCase()}
              </Link>
            ))}
          </nav>
        </aside>
      </div>

      {/* CENTER STAGE */}
      <main className="gacha-stage">
        {pathname === "/" ? (
           <div className="gacha-stage-fullscreen">{children}</div>
        ) : (
           <div className="gacha-stage-frame">{children}</div>
        )}
      </main>

      {/* BOTTOM RIGHT: CTA / Summon Buttons Slot */}
      <div id="aether-cta-slot" className="gacha-cta-slot" />
    </div>
  )
}

