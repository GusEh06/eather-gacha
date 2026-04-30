import { useEffect, useRef, type ReactNode } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { useAuth, SignInButton, UserButton, useUser } from "@clerk/tanstack-react-start"
import { useUserProfile } from "../../hooks/useUserProfile"
import { LivingAtmosphere } from "./LivingAtmosphere"

const NAV_ITEMS = [
  { to: "/",           label: "Ritual",         index: "01", sub: "Nuevos Aliados" },
  { to: "/bazaar",     label: "El Bazar",       index: "02", sub: "Intercambia" },
  { to: "/rift",       label: "Las Fisuras",    index: "03", sub: "Misiones Rápidas" },
  { to: "/vault",      label: "La Bóveda",      index: "04", sub: "Adquiere Shards" },
  { to: "/collection", label: "Colección",      index: "05", sub: "Tus Entidades" },
] as const

const CONTEXT_COPY: Record<string, { eyebrow: string; title: string }> = {
  "/":           { eyebrow: "Resonance Sequence",  title: "AETHER SUMMONING" },
  "/bazaar":     { eyebrow: "Hollow Trade",        title: "SHADOW BAZAAR" },
  "/rift":       { eyebrow: "Drifting Abyss",      title: "VOID EXPEDITIONS" },
  "/vault":      { eyebrow: "Resource Reserve",    title: "SHARD ACQUISITION" },
  "/collection": { eyebrow: "Neural Archive",      title: "BINDER's PACT" },
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
    import("animejs").then((mod) => {
      const anime = mod.default
      const tl = anime.timeline({ easing: "easeOutElastic(1, .8)" })

      if (sidebarRef.current) {
        tl.add({
          targets: sidebarRef.current.querySelectorAll(".gacha-nav-item"),
          translateY: [30, 0],
          delay: anime.stagger(80),
          duration: 800,
        })
      }
      if (logoRef.current) {
        tl.add({
          targets: logoRef.current,
          scale: [0.8, 1],
          duration: 800,
        }, "-=600")
      }
      if (hudRef.current) {
        tl.add({
          targets: hudRef.current.querySelectorAll(".gacha-hud-icon"),
          translateX: [40, 0],
          delay: anime.stagger(80),
          duration: 800,
        }, "-=800")
      }
      if (contextRef.current) {
        tl.add({
          targets: contextRef.current,
          translateY: [20, 0],
          duration: 600,
        }, "-=400")
      }
    })
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

    import("animejs").then((mod) => {
      const anime = mod.default
      el.addEventListener("mouseenter", () => {
        anime.remove(el)
        anime({ targets: el, scale: 1.05, duration: 200, easing: "easeOutQuad" })
      })
      el.addEventListener("mouseleave", () => {
        anime.remove(el)
        anime({ targets: el, scale: 1, duration: 200, easing: "easeOutQuad" })
      })
    })
  }

  return (
    <div className="gacha-shell" data-route={routeKey}>
      {/* ATMOSPHERE BACKDROP */}
      <div className="aether-atmosphere" aria-hidden="true" />
      <LivingAtmosphere route={routeKey} density={4} />
      <div className="aether-vignette" aria-hidden="true" />

      {/* TOP BAR: Logo on Left, HUD on Right */}
      <div className="gacha-topbar">
        <div className="gacha-logo-container" ref={logoRef}>
          <h1 className="gacha-logo">
            
          </h1>
        </div>

        <header className="gacha-hud" ref={hudRef}>
          <div className="gacha-hud-profile">
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

      {/* HORIZONTAL HUD NAVIGATION (Replaces Sidebar) */}
      <nav className="gacha-bottombar" ref={sidebarRef}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            ref={bindNavHover}
            className={`gacha-nav-item ${pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to)) ? "is-active" : ""}`}
          >
            <div className="nav-content">
              <span className="nav-label">{item.label.toUpperCase()}</span>
              <span className="nav-sub">{item.sub.toUpperCase()}</span>
            </div>
          </Link>
        ))}
      </nav>

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
