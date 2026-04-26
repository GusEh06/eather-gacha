import { useEffect, useState } from "react"

interface Props {
  expiresAt: string
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00"
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
}

export function RiftTimer({ expiresAt }: Props) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(new Date(expiresAt).getTime() - Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "1.4rem",
        color: remaining > 3600_000 ? "var(--accent-gold)" : "var(--accent-blood)",
        letterSpacing: "0.06em",
      }}
    >
      {formatCountdown(remaining)}
    </span>
  )
}
