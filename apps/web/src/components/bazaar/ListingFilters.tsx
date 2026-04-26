const RARITY_OPTIONS = [
  { value: "", label: "All Rarities" },
  { value: "comet", label: "Comet" },
  { value: "nova", label: "Nova" },
  { value: "pulsar", label: "Pulsar" },
  { value: "eclipse", label: "Eclipse" },
  { value: "singularity", label: "Singularity" },
]

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
]

const selectStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontWeight: 600,
  fontSize: "0.9rem",
  background: "var(--bg-elevated)",
  color: "var(--text-primary)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "4px",
  padding: "0.4rem 0.75rem",
  cursor: "pointer",
}

interface Props {
  rarity: string
  sort: string
  onChange: (filters: { rarity: string; sort: string }) => void
}

export function ListingFilters({ rarity, sort, onChange }: Props) {
  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
      <select
        value={rarity}
        onChange={(e) => onChange({ rarity: e.target.value, sort })}
        style={selectStyle}
      >
        {RARITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={sort}
        onChange={(e) => onChange({ rarity, sort: e.target.value })}
        style={selectStyle}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
