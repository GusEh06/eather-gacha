import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@clerk/tanstack-react-start"
import { getAuthToken } from "../lib/auth"

export interface ListingEntitySnapshot {
  nombre: string
  rareza: string
  arquetipo: string
  descripcionLore: string
  imageUrl: string
  descripcionOjos: string
  disponibleGacha: boolean
  disponibleRift: boolean
}

export interface MarketListing {
  _id: string
  sellerId: string
  sellerUsername: string
  userEntityId: string
  entitySnapshot: ListingEntitySnapshot
  priceShards: number
  status: "active" | "sold" | "cancelled"
  createdAt: string
}

export interface MarketFilters {
  rarity: string
  sort: string
}

const getApiUrl = () => (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001"

// ── Listings query (public) ───────────────────────────────────────────────────
export function useMarketListings(filters: MarketFilters) {
  return useQuery({
    queryKey: ["market-listings", filters],
    queryFn: async (): Promise<MarketListing[]> => {
      const params = new URLSearchParams()
      if (filters.rarity) params.set("rarity", filters.rarity)
      if (filters.sort) params.set("sort", filters.sort)
      const res = await fetch(`${getApiUrl()}/market/list?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch listings")
      const data = (await res.json()) as { listings: MarketListing[] }
      return data.listings
    },
  })
}

// ── Sell mutation ─────────────────────────────────────────────────────────────
export function useMarketSell() {
  const { getToken } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (vars: { userEntityId: string; priceShards: number }) => {
      const token = await getAuthToken(getToken)
      const res = await fetch(`${getApiUrl()}/market/sell`, {
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
        throw new Error(err.error ?? "Listing failed")
      }
      return res.json() as Promise<{ listingId: string; message: string }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["market-listings"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
    },
  })
}

// ── Buy mutation ──────────────────────────────────────────────────────────────
export function useMarketBuy() {
  const { getToken } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (vars: { listingId: string }) => {
      const token = await getAuthToken(getToken)
      const res = await fetch(`${getApiUrl()}/market/buy`, {
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
        throw new Error(err.error ?? "Purchase failed")
      }
      return res.json() as Promise<{ newShards: number }>
    },
    onSuccess: (data) => {
      // Keep shard balance in sync without a full profile refetch
      qc.setQueryData(["user-profile"], (old: Record<string, unknown> | undefined) => {
        if (!old) return old
        return { ...old, shards: data.newShards }
      })
      qc.invalidateQueries({ queryKey: ["market-listings"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
    },
  })
}
