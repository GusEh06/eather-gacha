export async function getAuthToken(getToken: () => Promise<string | null>): Promise<string | null> {
  return await getToken() ?? await (window as any).Clerk?.session?.getToken() ?? null
}
