import { useAuth } from "@clerk/tanstack-react-start"
import { useCallback } from "react"

export const getApiUrl = () =>
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001"

/** fetch autenticado contra la API para las pantallas del back office */
export function useAdminFetch() {
  const { getToken } = useAuth()

  return useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getToken()
      const res = await fetch(`${getApiUrl()}${path}`, {
        ...init,
        headers: {
          ...(init?.body && typeof init.body === "string"
            ? { "Content-Type": "application/json" }
            : {}),
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? `Request failed (${res.status})`)
      }
      return res.json()
    },
    [getToken]
  )
}

export interface AdminStats {
  totalUsers: number
  suspendedUsers: number
  shardsCirculating: number
  totalEntities: number
  activeListings: number
  dailyInvocations: number
  dailyBazaarSales: number
  dailyBazaarVolume: number
  tributeCollectedToday: number
}

export interface AdminUser {
  clerkId: string
  username: string
  title: string
  shards: number
  pityCounter: number
  inventoryCount: number
  roles: string[]
  suspended: boolean
  suspendedUntil: string | null
  suspensionReason: string | null
  listingLimit: number
  createdAt: string
}

export interface AdminListing {
  _id: string
  sellerId: string
  sellerUsername: string
  entityName: string
  entityRarity: string
  imageUrl: string
  priceShards: number
  status: string
  createdAt: string
  cancelledBy: string | null
  cancelReason: string | null
}

export interface AdminAuditLog {
  _id: string
  timestamp: string
  requestId: string | null
  userId: string
  ip: string | null
  action: string
  result: "success" | "failure"
  details: Record<string, unknown>
}
