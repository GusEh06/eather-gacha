import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useAuth } from "@clerk/tanstack-react-start"
import { motion, AnimatePresence } from "framer-motion"

export const Route = createFileRoute("/admin/")({
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

const tableRowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, type: "spring", stiffness: 300, damping: 28 },
  }),
}

function AdminEntities() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001"

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    rareza: "dust",
    arquetipo: "",
    epoca: "",
    descripcionLore: "",
    descripcionOjos: "",
    disponibleRift: true,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "entities"],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/admin/entities`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to fetch entities")
      return res.json()
    },
  })

  const createEntity = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error("Image is required")
      const token = await getToken()
      
      const form = new FormData()
      form.append("nombre", formData.nombre)
      form.append("rareza", formData.rareza)
      form.append("arquetipo", formData.arquetipo)
      form.append("epoca", formData.epoca)
      form.append("descripcionLore", formData.descripcionLore)
      form.append("descripcionOjos", formData.descripcionOjos)
      form.append("disponibleRift", formData.disponibleRift.toString())
      form.append("image", imageFile)

      const res = await fetch(`${apiUrl}/admin/entities`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create entity")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entities"] })
      setIsFormOpen(false)
      setFormData({
        nombre: "", rareza: "dust", arquetipo: "", epoca: "",
        descripcionLore: "", descripcionOjos: "", disponibleRift: true
      })
      setImageFile(null)
    },
    onError: (err) => {
      alert(`Error: ${err.message}`)
    }
  })

  const deleteEntity = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm("Are you sure you want to permanently delete this entity and its image?")) return
      const token = await getToken()
      const res = await fetch(`${apiUrl}/admin/entities/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to delete")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entities"] })
    }
  })

  const inputStyle = {
    padding: "0.75rem",
    border: "2px solid #ddd",
    background: "#fafaf8",
    fontFamily: "var(--font-ui)",
    fontSize: "0.95rem",
    transition: "border-color 0.2s, box-shadow 0.2s",
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
          onClick={() => setIsFormOpen(!isFormOpen)}
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
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {isFormOpen ? "Cancel" : "+ Create New Entity"}
        </motion.button>
      </motion.div>

      {/* Create Form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{ overflow: "hidden", marginBottom: "2rem" }}
          >
            <div style={{ 
              background: "#fff", 
              border: "2px solid #111", 
              padding: "2rem", 
              boxShadow: "4px 4px 0 #111"
            }}>
              <h3 style={{ margin: "0 0 1.5rem 0", fontFamily: "var(--font-display)", textTransform: "uppercase", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>Create New Entity</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <motion.label
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600 }}
                >
                  Name
                  <input 
                    type="text" 
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = "#111"; e.target.style.boxShadow = "2px 2px 0 #111" }}
                    onBlur={e => { e.target.style.borderColor = "#ddd"; e.target.style.boxShadow = "none" }}
                  />
                </motion.label>

                <motion.label
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600 }}
                >
                  Rarity
                  <select 
                    value={formData.rareza}
                    onChange={e => setFormData({...formData, rareza: e.target.value})}
                    style={{ ...inputStyle, textTransform: "capitalize", cursor: "pointer" }}
                    onFocus={e => { e.target.style.borderColor = "#111"; e.target.style.boxShadow = "2px 2px 0 #111" }}
                    onBlur={e => { e.target.style.borderColor = "#ddd"; e.target.style.boxShadow = "none" }}
                  >
                    {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </motion.label>

                <motion.label
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600 }}
                >
                  Archetype
                  <input 
                    type="text" 
                    value={formData.arquetipo}
                    onChange={e => setFormData({...formData, arquetipo: e.target.value})}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = "#111"; e.target.style.boxShadow = "2px 2px 0 #111" }}
                    onBlur={e => { e.target.style.borderColor = "#ddd"; e.target.style.boxShadow = "none" }}
                  />
                </motion.label>

                <motion.label
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600 }}
                >
                  Epoch
                  <input 
                    type="text" 
                    value={formData.epoca}
                    onChange={e => setFormData({...formData, epoca: e.target.value})}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = "#111"; e.target.style.boxShadow = "2px 2px 0 #111" }}
                    onBlur={e => { e.target.style.borderColor = "#ddd"; e.target.style.boxShadow = "none" }}
                  />
                </motion.label>

                <motion.label
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600, gridColumn: "span 2" }}
                >
                  Lore Description
                  <textarea 
                    value={formData.descripcionLore}
                    onChange={e => setFormData({...formData, descripcionLore: e.target.value})}
                    style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                    onFocus={e => { e.target.style.borderColor = "#111"; e.target.style.boxShadow = "2px 2px 0 #111" }}
                    onBlur={e => { e.target.style.borderColor = "#ddd"; e.target.style.boxShadow = "none" }}
                  />
                </motion.label>

                <motion.label
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600, gridColumn: "span 2" }}
                >
                  Eyes Description
                  <textarea 
                    value={formData.descripcionOjos}
                    onChange={e => setFormData({...formData, descripcionOjos: e.target.value})}
                    style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                    onFocus={e => { e.target.style.borderColor = "#111"; e.target.style.boxShadow = "2px 2px 0 #111" }}
                    onBlur={e => { e.target.style.borderColor = "#ddd"; e.target.style.boxShadow = "none" }}
                  />
                </motion.label>

                <motion.label
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 600 }}
                >
                  Artwork Image
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => setImageFile(e.target.files?.[0] || null)}
                    style={{ padding: "0.5rem", border: "2px dashed #aaa", background: "#f4f4f0", cursor: "pointer", transition: "border-color 0.2s" }}
                  />
                </motion.label>

                <motion.label
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, marginTop: "2rem" }}
                >
                  <input 
                    type="checkbox" 
                    checked={formData.disponibleRift}
                    onChange={e => setFormData({...formData, disponibleRift: e.target.checked})}
                    style={{ width: "20px", height: "20px", accentColor: "#111" }}
                  />
                  Available in the Rift?
                </motion.label>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "4px 4px 0 #444" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => createEntity.mutate()}
                disabled={createEntity.isPending || !imageFile || !formData.nombre}
                style={{
                  marginTop: "2rem",
                  background: "#111",
                  color: "#fff",
                  border: "none",
                  padding: "1rem 2rem",
                  fontFamily: "var(--font-ui)",
                  fontWeight: "bold",
                  cursor: (createEntity.isPending || !imageFile || !formData.nombre) ? "not-allowed" : "pointer",
                  opacity: (createEntity.isPending || !imageFile || !formData.nombre) ? 0.5 : 1,
                  width: "100%",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  boxShadow: "2px 2px 0 #444",
                  transition: "opacity 0.2s",
                }}
              >
                {createEntity.isPending ? "Uploading & Saving..." : "Publish Entity"}
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
              data?.entities?.map((entity: any, idx: number) => (
                <motion.tr
                  key={entity._id}
                  custom={idx}
                  initial="hidden"
                  animate="visible"
                  variants={tableRowVariants}
                  whileHover={{ backgroundColor: "#f9f9f4" }}
                  style={{ borderBottom: "1px solid #eee", transition: "background 0.15s", cursor: "default" }}
                >
                  <td style={{ padding: "1rem" }}>
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: 2 }}
                      style={{
                        width: "52px",
                        height: "52px",
                        background: "#f4f4f0",
                        border: `2px solid ${RARITY_COLORS[entity.rareza] || "#ccc"}`,
                        overflow: "hidden",
                        borderRadius: "4px",
                        boxShadow: `0 0 0 1px ${RARITY_COLORS[entity.rareza] || "#ccc"}22`,
                        transition: "border-color 0.2s",
                      }}
                    >
                      {entity.imageUrl ? (
                        <img src={entity.imageUrl} alt={entity.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999", fontSize: "0.8rem" }}>N/A</span>
                      )}
                    </motion.div>
                  </td>
                  <td style={{ padding: "1rem", fontWeight: 700, fontSize: "1rem" }}>{entity.nombre}</td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
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
                  <td style={{ padding: "1rem", textAlign: "right" }}>
                    <motion.button
                      whileHover={{ scale: 1.08, backgroundColor: "#cc0000", color: "#fff" }}
                      whileTap={{ scale: 0.93 }}
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
                        transition: "all 0.15s",
                      }}
                    >
                      Delete
                    </motion.button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  )
}
