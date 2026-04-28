import { useMutation } from "@tanstack/react-query"
import { useAuth } from "@clerk/tanstack-react-start"
import { getAuthToken } from "../lib/auth"

const getApiUrl = () =>
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001"

// POST /vault/create-checkout → returns { url } → redirect to Stripe hosted checkout
export function useCheckout() {
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async (packageId: string) => {
      const token = await getAuthToken(getToken)
      const res = await fetch(`${getApiUrl()}/vault/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: "Unknown error" }))) as {
          error?: string
        }
        throw new Error(err.error ?? "Failed to create checkout session")
      }
      return res.json() as Promise<{ url: string }>
    },
    onSuccess: (data) => {
      // Redirect browser to Stripe hosted checkout page
      window.location.href = data.url
    },
  })
}
