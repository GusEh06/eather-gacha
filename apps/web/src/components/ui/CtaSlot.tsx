import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

/* ──────────────────────────────────────────────────────────────────────────
   useCtaSlot — render a node into the master layout's bottom-right CTA
   slot (#aether-cta-slot). Pages call <CtaSlot>…</CtaSlot> to inject their
   primary action without coupling to the layout shell.
   ────────────────────────────────────────────────────────────────────────── */
export function CtaSlot({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setTarget(document.getElementById("aether-cta-slot"))
  }, [])

  if (!target) return null
  return createPortal(children, target)
}
