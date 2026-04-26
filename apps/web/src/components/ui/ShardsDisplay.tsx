import { motion } from "framer-motion"

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
      {/* key={amount} triggers re-mount → re-plays both entrance animation and shardsIncrement bump */}
      <motion.span
        key={amount}
        className="shards-bump"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {formatted}
      </motion.span>
    </span>
  )
}
