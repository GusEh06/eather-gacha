import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@clerk/tanstack-react-start"

export interface UserProfile {
  shards: number
  username: string
  pityCounter: number
  pityMythicCounter: number
}

export const USER_PROFILE_KEY = ["user-profile"] as const

/** Single hook for fetching the logged-in user's profile.
 *  Shared between Navbar, InvokeSequence, and any other consumer.
 *  Returns undefined when the user is not signed in. */
export function useUserProfile() {
  const { getToken, isSignedIn } = useAuth()

  return useQuery<UserProfile>({
    queryKey: USER_PROFILE_KEY,
    queryFn: async () => {
      const token = await getToken()
      const apiUrl =
        (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001"
      const res = await fetch(`${apiUrl}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to fetch profile")
      return res.json() as Promise<UserProfile>
    },
    enabled: !!isSignedIn,
    staleTime: 30_000,
  })
}

/** Convenience: optimistically patch just the shard balance in the cache. */
export function usePatchShards() {
  const queryClient = useQueryClient()
  return (newShards: number) => {
    queryClient.setQueryData<UserProfile>(USER_PROFILE_KEY, (old) =>
      old ? { ...old, shards: newShards } : old
    )
  }
}
