import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAdminFetch, getApiUrl } from "../../hooks/useAdmin"
import { useAuth } from "@clerk/tanstack-react-start"

export const Route = createFileRoute("/admin/entities")({
  component: AdminEntities,
})

const RARITIES = ["dust", "nebula", "comet", "nova", "pulsar", "eclipse", "singularity"]

const RARITY_COLORS: Record<string, string> = {
  dust: "#8a8a8a",
  nebula: "#4caf50",
  comet: "#2196f3",
  nova: "#9c27b0",
  pulsar: "#f0a500",
  eclipse: "#c0392b",
  singularity: "#7b2fff",
}

interface EntityRow {
  _id: string
  nombre: string
  rareza: string
  arquetipo: string
  epoca: string
  descripcionLore: string
  descripcionOjos: string
  disponibleRift: boolean
  disponibleGacha?: boolean
  imageUrl?: string
  // La Espiral
  disponibleAltarEco?: boolean
  statsOverride?: { hp?: number; atk?: number; def?: number; vel?: number } | null
  espiralAbilityOverride?: string | null
}

const EMPTY_FORM = {
  nombre: "",
  rareza: "dust",
  arquetipo: "",
  epoca: "",
  descripcionLore: "",
  descripcionOjos: "",
  disponibleRift: true,
  disponibleAltarEco: false,
  statsHp: "",
  statsAtk: "",
  statsDef: "",
  statsVel: "",
  espiralAbilityOverride: "",
}

function AdminEntities() {
  const { getToken } = useAuth()
  const adminFetch = useAdminFetch()
  const queryClient = useQueryClient()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "entities"],
    queryFn: () => adminFetch("/admin/entities") as Promise<{ entities: EntityRow[] }>,
  })

  function closeForm() {
    setIsFormOpen(false)
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setImageFile(null)
  }

  function openEdit(entity: EntityRow) {
    setEditingId(entity._id)
    setFormData({
      nombre: entity.nombre,
      rareza: entity.rareza,
      arquetipo: entity.arquetipo,
      epoca: entity.epoca,
      descripcionLore: entity.descripcionLore,
      descripcionOjos: entity.descripcionOjos,
      disponibleRift: entity.disponibleRift,
      disponibleAltarEco: entity.disponibleAltarEco ?? false,
      statsHp: entity.statsOverride?.hp?.toString() ?? "",
      statsAtk: entity.statsOverride?.atk?.toString() ?? "",
      statsDef: entity.statsOverride?.def?.toString() ?? "",
      statsVel: entity.statsOverride?.vel?.toString() ?? "",
      espiralAbilityOverride: entity.espiralAbilityOverride ?? "",
    })
    setImageFile(null)
    setIsFormOpen(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const saveEntity = useMutation({
    mutationFn: async () => {
      if (!editingId && !imageFile) throw new Error("Image is required")
      const token = await getToken()

      const form = new FormData()
      form.append("nombre", formData.nombre)
      form.append("rareza", formData.rareza)
      form.append("arquetipo", formData.arquetipo)
      form.append("epoca", formData.epoca)
      form.append("descripcionLore", formData.descripcionLore)
      form.append("descripcionOjos", formData.descripcionOjos)
      form.append("disponibleRift", formData.disponibleRift.toString())
      if (imageFile) form.append("image", imageFile)

      // La Espiral (solo el PUT los procesa; una entidad nueva es jugable
      // sin overrides gracias a los stats derivados de rareza+arquetipo)
      if (editingId) {
        form.append("disponibleAltarEco", formData.disponibleAltarEco.toString())
        form.append("espiralAbilityOverride", formData.espiralAbilityOverride)
        const override: Record<string, number> = {}
        if (formData.statsHp) override.hp = Number(formData.statsHp)
        if (formData.statsAtk) override.atk = Number(formData.statsAtk)
        if (formData.statsDef) override.def = Number(formData.statsDef)
        if (formData.statsVel) override.vel = Number(formData.statsVel)
        form.append("statsOverride", Object.keys(override).length > 0 ? JSON.stringify(override) : "")
      }

      const res = await fetch(
        editingId ? `${getApiUrl()}/admin/entities/${editingId}` : `${getApiUrl()}/admin/entities`,
        {
          method: editingId ? "PUT" : "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      )

      if (!res.ok) {
        const err = await res.json()
        throw new Error((err as { error?: string }).error || "Failed to save entity")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entities"] })
      closeForm()
    },
    onError: (err) => {
      alert(`Error: ${err.message}`)
    },
  })

  const deleteEntity = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm("Are you sure you want to permanently delete this entity and its image?")) return
      await adminFetch(`/admin/entities/${id}`, { method: "DELETE" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entities"] })
    },
  })

  const inputStyle = {
    padding: "0.75rem",
    border: "2px solid #ddd",
    background: "#fafaf8",
    fontFamily: "var(--font-ui)",
    fontSize: "0.95rem",
    outline: "none",
  }

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}
      >
        <div>
          <h2 style={{ fontSize: "2rem", fontFamily: "var(--font-display)", margin: 0, color: "#111", letterSpacing: "0.02em" }}>Entity Management</h2>
          <p style={{ color: "#555", margin: "0.5rem 0 0 0", fontSize: "0.95rem" }}>Manage the Aether catalog and image assets.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04, y: -2, boxShadow: "5px 5px 0 #111" }}
          whileTap={{ scale: 0.96 }}
          onClick={() => (isFormOpen ? closeForm() : setIsFormOpen(true))}
          style={{
            background: isFormOpen ? "#fff" : "#111",
            color: isFormOpen ? "#111" : "#fff",
            border: "2px solid #111",
            padding: "0.75rem 1.5rem",
            fontFamily: "var(--font-ui)",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "3px 3px 0 #111",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {isFormOpen ? "Cancel" : "+ Create New Entity"}
        </motion.button>
      </motion.div>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{ overflow: "hidden", marginBottom: "2rem" }}
          >
            <div style={{ background: "#fff", border: "2px solid #111", padding: "2rem", boxShadow: "4px 4px 0 #111" }}>
              <h3 style={{ margin: "0 0 1.5rem 0", fontFamily: "var(--font-display)", textTransform: "uppercase", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
                {editingId ? "Edit Entity" : "Create New Entity"}
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600 }}>
                  Name
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600 }}>
                  Rarity
                  <select
                    value={formData.rareza}
                    onChange={(e) => setFormData({ ...formData, rareza: e.target.value })}
                    style={{ ...inputStyle, textTransform: "capitalize", cursor: "pointer" }}
                  >
                    {RARITIES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600 }}>
                  Archetype
                  <input
                    type="text"
                    value={formData.arquetipo}
                    onChange={(e) => setFormData({ ...formData, arquetipo: e.target.value })}
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600 }}>
                  Epoch
                  <input
                    type="text"
                    value={formData.epoca}
                    onChange={(e) => setFormData({ ...formData, epoca: e.target.value })}
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600, gridColumn: "span 2" }}>
                  Lore Description
                  <textarea
                    value={formData.descripcionLore}
                    onChange={(e) => setFormData({ ...formData, descripcionLore: e.target.value })}
                    style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600, gridColumn: "span 2" }}>
                  Eyes Description
                  <textarea
                    value={formData.descripcionOjos}
                    onChange={(e) => setFormData({ ...formData, descripcionOjos: e.target.value })}
                    style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600 }}>
                  Artwork Image {editingId && <span style={{ color: "#888", fontWeight: 400 }}>(optional — keeps current if empty)</span>}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    style={{ padding: "0.5rem", border: "2px dashed #aaa", background: "#f4f4f0", cursor: "pointer" }}
                  />
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, marginTop: "2rem" }}>
                  <input
                    type="checkbox"
                    checked={formData.disponibleRift}
                    onChange={(e) => setFormData({ ...formData, disponibleRift: e.target.checked })}
                    style={{ width: "20px", height: "20px", accentColor: "#111" }}
                  />
                  Available in the Rift?
                </label>

                {editingId && (
                  <div style={{ marginTop: "1.5rem", padding: "1rem", border: "2px dashed #999", background: "#fafaf5" }}>
                    <div style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                      La Espiral (opcional)
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                      <input
                        type="checkbox"
                        checked={formData.disponibleAltarEco}
                        onChange={(e) => setFormData({ ...formData, disponibleAltarEco: e.target.checked })}
                        style={{ width: "20px", height: "20px", accentColor: "#111" }}
                      />
                      Available in Altar del Eco?
                    </label>
                    <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.5rem" }}>
                      Stats override — vacío = derivado de rareza+arquetipo (recomendado)
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      {(
                        [
                          ["statsHp", "HP"],
                          ["statsAtk", "ATK"],
                          ["statsDef", "DEF"],
                          ["statsVel", "VEL"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.75rem", fontWeight: 600 }}>
                          {label}
                          <input
                            type="number"
                            min={1}
                            value={formData[key]}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                            placeholder="auto"
                            style={{ padding: "0.4rem", border: "2px solid #ccc", background: "#fff" }}
                          />
                        </label>
                      ))}
                    </div>
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.75rem", fontWeight: 600 }}>
                      Ability override
                      <select
                        value={formData.espiralAbilityOverride}
                        onChange={(e) => setFormData({ ...formData, espiralAbilityOverride: e.target.value })}
                        style={{ padding: "0.4rem", border: "2px solid #ccc", background: "#fff" }}
                      >
                        <option value="">Auto (por rareza+arquetipo)</option>
                        <option value="none">Sin habilidad</option>
                        <option value="stun">Parálisis Astral (stun)</option>
                        <option value="burn">Ignición del Vacío (burn)</option>
                        <option value="team_atk_buff">Resonancia Ofensiva (buff ATK)</option>
                        <option value="team_def_buff">Égida Compartida (buff DEF)</option>
                        <option value="extra_turn">Fractura Temporal (turno extra)</option>
                        <option value="ignore_def">Colapso Absoluto (ignora DEF)</option>
                        <option value="one_time_revive">Renacer Singular (revive)</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "4px 4px 0 #444" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => saveEntity.mutate()}
                disabled={saveEntity.isPending || (!editingId && !imageFile) || !formData.nombre}
                style={{
                  marginTop: "2rem",
                  background: "#111",
                  color: "#fff",
                  border: "none",
                  padding: "1rem 2rem",
                  fontFamily: "var(--font-ui)",
                  fontWeight: "bold",
                  cursor: saveEntity.isPending || (!editingId && !imageFile) || !formData.nombre ? "not-allowed" : "pointer",
                  opacity: saveEntity.isPending || (!editingId && !imageFile) || !formData.nombre ? 0.5 : 1,
                  width: "100%",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  boxShadow: "2px 2px 0 #444",
                }}
              >
                {saveEntity.isPending
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Publish Entity"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entities Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        style={{ background: "#fff", border: "2px solid #111", boxShadow: "4px 4px 0 #111" }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#111", color: "#fff", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "0.05em" }}>
              <th style={{ padding: "1rem" }}>Image</th>
              <th style={{ padding: "1rem" }}>Name</th>
              <th style={{ padding: "1rem" }}>Rarity</th>
              <th style={{ padding: "1rem" }}>Archetype</th>
              <th style={{ padding: "1rem" }}>Rift</th>
              <th style={{ padding: "1rem", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#666" }}>Loading catalogue...</td></tr>
            ) : data?.entities?.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#666" }}>No entities found. The void is empty.</td></tr>
            ) : (
              data?.entities?.map((entity) => (
                <tr
                  key={entity._id}
                  style={{ borderBottom: "1px solid #eee" }}
                >
                  <td style={{ padding: "1rem" }}>
                    <div
                      style={{
                        width: "52px",
                        height: "52px",
                        background: "#f4f4f0",
                        border: `2px solid ${RARITY_COLORS[entity.rareza] || "#ccc"}`,
                        overflow: "hidden",
                        borderRadius: "4px",
                      }}
                    >
                      {entity.imageUrl ? (
                        <img src={entity.imageUrl} alt={entity.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999", fontSize: "0.8rem" }}>N/A</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "1rem", fontWeight: 700, fontSize: "1rem" }}>{entity.nombre}</td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      display: "inline-flex",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "3px",
                      background: `${RARITY_COLORS[entity.rareza] || "#888"}18`,
                      color: RARITY_COLORS[entity.rareza] || "#888",
                      border: `1px solid ${RARITY_COLORS[entity.rareza] || "#888"}55`,
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}>
                      {entity.rareza}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", color: "#444", fontSize: "0.9rem" }}>{entity.arquetipo}</td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      background: entity.disponibleRift ? "#e6ffe6" : "#ffe6e6",
                      color: entity.disponibleRift ? "#006600" : "#cc0000",
                      padding: "0.25rem 0.6rem",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      border: `1px solid ${entity.disponibleRift ? "#006600" : "#cc0000"}`,
                      borderRadius: "3px",
                    }}>
                      {entity.disponibleRift ? "YES" : "NO"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => openEdit(entity)}
                      style={{
                        background: "transparent",
                        border: "1px solid #111",
                        color: "#111",
                        padding: "0.5rem 1rem",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "0.8rem",
                        textTransform: "uppercase",
                        borderRadius: "3px",
                        marginRight: "0.5rem",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteEntity.mutate(entity._id)}
                      disabled={deleteEntity.isPending}
                      style={{
                        background: "transparent",
                        border: "1px solid #cc0000",
                        color: "#cc0000",
                        padding: "0.5rem 1rem",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "0.8rem",
                        textTransform: "uppercase",
                        borderRadius: "3px",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  )
}
