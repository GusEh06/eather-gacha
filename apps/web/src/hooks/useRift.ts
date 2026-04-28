import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@clerk/tanstack-react-start"
import { getAuthToken } from "../lib/auth"

export interface RiftEntityData {
  _id: string
  nombre: string
  rareza: string
  arquetipo: string
  descripcionLore: string
  imageUrl: string
  disponibleRift: boolean
}

export interface RiftSlotData {
  index: number
  entityId: string
  priceShards: number
  sold: boolean
  entity: RiftEntityData | null
}

export interface RiftCurrentResponse {
  date: string
  expiresAt: string
  slots: RiftSlotData[]
}

const getApiUrl = () => (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001"

// ── Current rotation query (public) ──────────────────────────────────────────
export function useRiftCurrent() {
  return useQuery({
    queryKey: ["rift-current"],
    queryFn: async (): Promise<RiftCurrentResponse> => {
      const res = await fetch(`${getApiUrl()}/rift/current`)
      if (!res.ok) throw new Error("Failed to fetch Rift rotation")
      return res.json() as Promise<RiftCurrentResponse>
    },
    staleTime: 60_000, // Rift doesn't change mid-session
  })
}

// ── Buy mutation ──────────────────────────────────────────────────────────────
export function useRiftBuy() {
  const { getToken } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (vars: { slotIndex: number }) => {
      const token = await getAuthToken(getToken)
      const res = await fetch(`${getApiUrl()}/rift/buy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(vars),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: "Unknown error" }))) as {
          error?: string
        }
        throw new Error(err.error ?? "Rift purchase failed")
      }
      return res.json() as Promise<{ newShards: number; userEntityId: string }>
    },
    onSuccess: (data, vars) => {
      // Optimistically mark slot sold
      qc.setQueryData(["rift-current"], (old: RiftCurrentResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          slots: old.slots.map((s) =>
            s.index === vars.slotIndex ? { ...s, sold: true } : s
          ),
        }
      })
      // Keep shard balance in sync
      qc.setQueryData(["user-profile"], (old: Record<string, unknown> | undefined) => {
        if (!old) return old
        return { ...old, shards: data.newShards }
      })
      qc.invalidateQueries({ queryKey: ["inventory"] })
    },
  })
}
