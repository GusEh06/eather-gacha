import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@clerk/tanstack-react-start"
import { getAuthToken } from "../lib/auth"

const getApiUrl = () =>
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001"

export interface AppNotification {
  _id: string
  type: "bazaar_sale" | "listing_cancelled" | "rift_rotation" | "system"
  title: string
  message: string
  read: boolean
  createdAt: string
}

export const NOTIFICATIONS_KEY = ["notifications"] as const

// P-38: notificaciones in-app con polling ligero
export function useNotifications() {
  const { getToken, isSignedIn } = useAuth()

  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: async () => {
      const token = await getAuthToken(getToken)
      const res = await fetch(`${getApiUrl()}/user/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to fetch notifications")
      return res.json() as Promise<{ unreadCount: number; notifications: AppNotification[] }>
    },
    enabled: !!isSignedIn,
    refetchInterval: 30_000,
  })
}

export function useMarkNotificationRead() {
  const { getToken } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getAuthToken(getToken)
      const res = await fetch(`${getApiUrl()}/user/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to mark as read")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}

export function useMarkAllNotificationsRead() {
  const { getToken } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const token = await getAuthToken(getToken)
      const res = await fetch(`${getApiUrl()}/user/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to mark all as read")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}

// P-40: historial de transacciones de Shards
export interface ShardTransaction {
  _id: string
  type: "invocacion" | "compra_rift" | "compra_bazaar" | "venta_bazaar" | "recarga" | "ajuste_admin"
  amount: number
  balanceAfter: number
  description: string
  createdAt: string
}

export function useTransactions(limit = 50, offset = 0) {
  const { getToken, isSignedIn } = useAuth()

  return useQuery({
    queryKey: ["transactions", limit, offset],
    queryFn: async () => {
      const token = await getAuthToken(getToken)
      const res = await fetch(
        `${getApiUrl()}/user/transactions?limit=${limit}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error("Failed to fetch transactions")
      return res.json() as Promise<{ total: number; transactions: ShardTransaction[] }>
    },
    enabled: !!isSignedIn,
  })
}
