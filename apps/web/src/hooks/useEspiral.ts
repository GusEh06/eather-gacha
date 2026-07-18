import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@clerk/tanstack-react-start"
import { getAuthToken } from "../lib/auth"
import type {
  CombatLogEntry,
  CombatantSnapshot,
  EspiralPlayerAction,
  FighterPersistState,
} from "../../../../packages/shared/src/espiral"
import type { InvokeResult } from "./useInvoke"

const apiUrl = () => (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001"

async function apiFetch<T>(
  getToken: Parameters<typeof getAuthToken>[0],
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = await getAuthToken(getToken)
  const res = await fetch(`${apiUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error((err as { error?: string }).error ?? "Request failed")
  }
  return res.json() as Promise<T>
}

// ─── Tipos de respuesta ──────────────────────────────────────────────────────

export interface EspiralState {
  energyCurrent: number
  energyLastRegenAt: string
  ecos: number
  checkpointFloor: number
  bestFloorEver: number
  activeRun: {
    teamUserEntityIds: string[]
    currentFloor: number
    status: "active" | "dead"
    deadAt?: string
    ecosEarned: number
    pendingCombat?: boolean
    reviveWindowMsLeft?: number
  } | null
}

export interface FloorResultView {
  victory: boolean
  floor: number
  boss: boolean
  combatants: CombatantSnapshot[]
  log: CombatLogEntry[]
  ecosDropped: number
}

export interface AdvanceResponse {
  result: FloorResultView
  currentFloor: number
  checkpointFloor: number
  bestFloorEver: number
  ecos: number
  runStatus: "active" | "dead"
  reviveWindowMsLeft?: number
}

/** Combate manual en curso — el servidor espera la acción de `awaiting`. */
export interface ManualCombatPendingView {
  pending: true
  floor: number
  boss: boolean
  combatants: CombatantSnapshot[]
  /** Solo las entradas NUEVAS desde la última respuesta. */
  log: CombatLogEntry[]
  awaiting: string
  fighters: Record<string, FighterPersistState>
}

export type ManualAdvanceResponse = ManualCombatPendingView | (AdvanceResponse & { pending: false })

export interface MissionView {
  id: string
  period: "daily" | "weekly"
  descripcion: string
  target: number
  rewardEcos: number
  progress: number
  completed: boolean
  claimed: boolean
}

export interface AltarEcoState {
  ecos: number
  espiralPityCounter: number
  hardPityAt: number
  costX1: number
  costX10: number
  probabilities: Record<string, number>
}

export interface AltarEcoPullResponse {
  results: InvokeResult[]
  newEcos: number
  newEspiralPityCounter: number
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const ESPIRAL_STATE_KEY = ["espiral-state"] as const
export const ESPIRAL_MISSIONS_KEY = ["espiral-missions"] as const
export const ALTAR_ECO_STATE_KEY = ["altar-eco-state"] as const

export function useEspiralState() {
  const { getToken, isSignedIn } = useAuth()
  return useQuery<EspiralState>({
    queryKey: ESPIRAL_STATE_KEY,
    queryFn: () => apiFetch(getToken, "/espiral/state"),
    enabled: !!isSignedIn,
    staleTime: 5_000,
  })
}

export function useEspiralMissions() {
  const { getToken, isSignedIn } = useAuth()
  return useQuery<{ missions: MissionView[] }>({
    queryKey: ESPIRAL_MISSIONS_KEY,
    queryFn: () => apiFetch(getToken, "/espiral/missions"),
    enabled: !!isSignedIn,
    staleTime: 10_000,
  })
}

export function useAltarEcoState() {
  const { getToken, isSignedIn } = useAuth()
  return useQuery<AltarEcoState>({
    queryKey: ALTAR_ECO_STATE_KEY,
    queryFn: () => apiFetch(getToken, "/altar-eco/state"),
    enabled: !!isSignedIn,
    staleTime: 5_000,
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

function useInvalidateEspiral() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ESPIRAL_STATE_KEY })
    qc.invalidateQueries({ queryKey: ESPIRAL_MISSIONS_KEY })
    qc.invalidateQueries({ queryKey: ALTAR_ECO_STATE_KEY })
    qc.invalidateQueries({ queryKey: ["user-profile"] })
  }
}

export function useStartRun() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateEspiral()
  return useMutation({
    mutationFn: (teamUserEntityIds: string[]) =>
      apiFetch<{ currentFloor: number; energyCurrent: number }>(getToken, "/espiral/run/start", {
        method: "POST",
        body: JSON.stringify({ teamUserEntityIds }),
      }),
    onSuccess: invalidate,
  })
}

export function useAdvanceFloor() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateEspiral()
  return useMutation({
    mutationFn: () =>
      apiFetch<AdvanceResponse>(getToken, "/espiral/run/advance", { method: "POST" }),
    onSuccess: invalidate,
  })
}

export function useAdvanceManual() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateEspiral()
  return useMutation({
    mutationFn: () =>
      apiFetch<ManualAdvanceResponse>(getToken, "/espiral/run/advance", {
        method: "POST",
        body: JSON.stringify({ mode: "manual" }),
      }),
    onSuccess: invalidate,
  })
}

export function useCombatAction() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateEspiral()
  return useMutation({
    mutationFn: (vars: { actorId: string; action: EspiralPlayerAction }) =>
      apiFetch<ManualAdvanceResponse>(getToken, "/espiral/run/action", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    onSuccess: invalidate,
  })
}

export function useRetreat() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateEspiral()
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ecosEarned: number }>(getToken, "/espiral/run/retreat", { method: "POST" }),
    onSuccess: invalidate,
  })
}

export function useReviveRun() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateEspiral()
  return useMutation({
    mutationFn: () =>
      apiFetch<{ currentFloor: number; ecos: number }>(getToken, "/espiral/run/revive", {
        method: "POST",
      }),
    onSuccess: invalidate,
  })
}

export function useClaimMission() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateEspiral()
  return useMutation({
    mutationFn: (missionId: string) =>
      apiFetch<{ rewardEcos: number; ecos: number }>(
        getToken,
        `/espiral/missions/${missionId}/claim`,
        { method: "POST" }
      ),
    onSuccess: invalidate,
  })
}

export function useAltarEcoPull() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateEspiral()
  return useMutation({
    mutationFn: (mode: "x1" | "x10") =>
      apiFetch<AltarEcoPullResponse>(getToken, "/altar-eco/pull", {
        method: "POST",
        body: JSON.stringify({ mode }),
      }),
    onSuccess: invalidate,
  })
}
