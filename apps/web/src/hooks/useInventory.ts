import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@clerk/tanstack-react-start"
import { getAuthToken } from "../lib/auth"

export interface InventoryEntity {
  _id: string
  nombre: string
  rareza: string
  arquetipo: string
  descripcionLore: string
  imageUrl: string
  descripcionOjos: string
  disponibleGacha: boolean
  disponibleRift: boolean
}

export interface InventoryItem {
  _id: string
  entityId: string
  ownerId: string
  obtainedAt: string
  obtainedVia: "gacha" | "rift" | "bazaar"
  entity: InventoryEntity | null
}

export function useInventory() {
  const { isSignedIn, getToken } = useAuth()

  return useQuery({
    queryKey: ["inventory"],
    queryFn: async (): Promise<InventoryItem[]> => {
      const token = await getAuthToken(getToken)
      const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001"
      const res = await fetch(`${apiUrl}/user/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to fetch inventory")
      const data = (await res.json()) as { inventory: InventoryItem[] }
      return data.inventory
    },
    enabled: !!isSignedIn,
  })
}
