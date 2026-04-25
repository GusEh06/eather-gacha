interface ShardsDisplayProps {
  amount: number
}

export function ShardsDisplay({ amount }: ShardsDisplayProps) {
  const formatted = amount.toLocaleString("en-US")

  return (
    <span
      style={{
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        color: "var(--accent-gold)",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        fontSize: "1rem",
        letterSpacing: "0.03em",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: "1.1em" }}>◈</span>
      {formatted}
    </span>
  )
}
