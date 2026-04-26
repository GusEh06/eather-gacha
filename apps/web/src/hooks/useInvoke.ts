import { useMutation } from "@tanstack/react-query"
import { useAuth } from "@clerk/tanstack-react-start"

export interface InvokeEntity {
  _id: string
  nombre: string
  rareza: string
  epoca: string
  arquetipo: string
  descripcionLore: string
  imageUrl: string
  descripcionOjos: string
  disponibleGacha: boolean
  disponibleRift: boolean
}

export interface InvokeResult {
  userEntityId: string
  entity: InvokeEntity
}

export interface InvokeResponse {
  results: InvokeResult[]
  newShards: number
  newPityCounter: number
  newPityMythicCounter: number
}

export function useInvoke() {
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async (mode: "x1" | "x10"): Promise<InvokeResponse> => {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

      const res = await fetch(`${apiUrl}/invoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }))
        throw new Error((err as { error?: string }).error ?? "Invocation failed")
      }

      return res.json() as Promise<InvokeResponse>
    },
  })
}
