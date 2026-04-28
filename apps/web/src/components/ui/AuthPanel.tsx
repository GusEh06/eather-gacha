import { useMemo, useState, type FormEvent } from "react"
import { useAuth, useClerk, useSignIn, useSignUp, useUser } from "@clerk/tanstack-react-start"

type AuthMode = "sign-in" | "sign-up"
type SignUpStep = "credentials" | "verify-email"

type AuthPanelProps = {
  open: boolean
  onClose: () => void
}

export function AuthPanel({ open, onClose }: AuthPanelProps) {
  const { signOut, setActive } = useClerk()
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { signIn, isLoaded: signInLoaded } = useSignIn()
  const { signUp, isLoaded: signUpLoaded } = useSignUp()

  const [mode, setMode] = useState<AuthMode>("sign-in")
  const [signUpStep, setSignUpStep] = useState<SignUpStep>("credentials")
  const [identifier, setIdentifier] = useState("")
  const [username, setUsername] = useState("")
  const [emailAddress, setEmailAddress] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const isAuthReady = mode === "sign-in" ? signInLoaded : signUpLoaded

  const displayName = useMemo(() => {
    const userTag =
      user?.username?.trim() ||
      user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      "unknown"
    return `Aether Binder [${userTag}]`
  }, [user])

  if (!open) return null

  // TanStack Start SSR can freeze useSignIn/useSignUp isLoaded.
  // window.Clerk is set by the browser SDK and works regardless of SSR state.
  function getClerk() {
    return typeof window !== "undefined" ? (window as Record<string, unknown>).Clerk as Record<string, unknown> | undefined : undefined
  }

  function resolveClerkError(err: unknown, fallback: string): string {
    if (typeof err === "object" && err && "errors" in err) {
      const e = (err as { errors?: Array<{ longMessage?: string; message?: string }> }).errors
      return e?.[0]?.longMessage ?? e?.[0]?.message ?? fallback
    }
    return err instanceof Error ? err.message : fallback
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  console.log("handleSubmit called", { mode, signUpStep, isAuthReady })
  
  // Clerk puede no estar listo inmediatamente, pero intentamos de todos modos

  setError(null)
  setSuccess(null)
  console.log("Starting form submission...")

  // Validación básica previa
  if (mode === "sign-up" && signUpStep === "credentials" && password !== confirmPassword) {
    setError("Passwords do not match.")
    return
  }

  setLoading(true)

  try {
    // Usamos el objeto del hook directamente, fallback a window solo si es crítico
    const clerk = getClerk()
    const activeSetActive = setActive ?? ((args: any) => (clerk as any)?.setActive(args))

    const clerkClient = getClerk() as any
    const activeSignIn = (signInLoaded ? signIn : null) ?? clerkClient?.client?.signIn
    const activeSignUp = (signUpLoaded ? signUp : null) ?? clerkClient?.client?.signUp

    // ================= SIGN IN =================
    if (mode === "sign-in") {
      if (!activeSignIn) throw new Error("Sign-in service unavailable")

      const result = await activeSignIn.create({
        identifier: identifier.trim(),
        password,
      })

      if (result.status === "complete") {
        await activeSetActive({ session: result.createdSessionId })
        onClose()
      } else {
        setError("Your account requires additional verification.")
      }
    }

    // ================= VERIFY EMAIL (Paso 2 del Registro) =================
    else if (signUpStep === "verify-email") {
      if (!activeSignUp) throw new Error("Verification service unavailable")

      const result = await activeSignUp.attemptVerification({
        strategy: "email_code",
        code: verificationCode,
      })

      if (result.status === "complete") {
        await activeSetActive({ session: result.createdSessionId })
        onClose()
      } else {
        setError("Invalid code. Please try again.")
      }
    }

    // ================= SIGN UP (Paso 1: Crear) =================
    else {
      console.log("Starting sign-up process...")
      if (!activeSignUp) throw new Error("Sign-up service unavailable")

      console.log("activeSignUp:", activeSignUp, "type:", typeof activeSignUp, "keys:", Object.keys(activeSignUp ?? {}))
      console.log("create fn:", typeof activeSignUp?.create)
      console.log("window.Clerk:", clerkClient, "client:", clerkClient?.client, "signUp:", clerkClient?.client?.signUp)
      console.log("Creating user account...")
      const created = await activeSignUp.create({
        emailAddress: emailAddress.trim(),
        password,
        username: username.trim() || undefined,
      })

      console.log("create result:", created?.status)
      if (!created || (created.status !== "missing_requirements" && created.status !== "complete")) {
        throw new Error("Account creation failed — unexpected status: " + created?.status)
      }

      console.log("Sending verification code...")
      await created.prepareVerification({ strategy: "email_code" })
      
      console.log("Sign-up completed, switching to verification step")
      setSignUpStep("verify-email")
      setSuccess("Code sent to your email.")
    }
  } catch (rawError: any) {
    console.error("CLERK ERROR:", rawError, JSON.stringify(rawError))
    setError(resolveClerkError(rawError, "Authentication failed."))
  } finally {
    setLoading(false)
  }
}

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
      onClose()
    } catch (err) {
      console.error("Sign out error:", err)
    } finally {
      setLoading(false)
    }
  }

  const resendVerificationCode = async () => {
    const clerkClient = getClerk() as any
    const activeSignUp = signUp ?? clerkClient?.client?.signUp
    if (!activeSignUp) return
    try {
      await activeSignUp.prepareVerification({ strategy: "email_code" })
      setSuccess("Code resent to your email.")
    } catch (err) {
      console.error("Resend code error:", err)
      setError("Failed to resend code. Please try again.")
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose} role="presentation">
      <section
        className="auth-panel"
        onClick={(event) => event.stopPropagation()}
        aria-label="Authentication panel"
      >
        <div className="auth-header">
          <h2>Aether Access</h2>
          <button className="auth-close" onClick={onClose} aria-label="Close auth panel">
            X
          </button>
        </div>

        {isSignedIn ? (
          <div className="auth-signed-in">
            <p className="auth-binder-name">{displayName}</p>
            <p className="auth-subtitle">Your soul is bound to the Aether.</p>
            <button className="btn-primary" onClick={handleSignOut} disabled={loading}>
              {loading ? "Leaving the ritual..." : "Sign Out"}
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs" role="tablist" aria-label="Sign in or sign up">
              <button
                className={mode === "sign-in" ? "auth-tab auth-tab-active" : "auth-tab"}
                onClick={() => {
                  setMode("sign-in")
                  setSignUpStep("credentials")
                  setError(null)
                  setSuccess(null)
                }}
                type="button"
              >
                Sign In
              </button>
              <button
                className={mode === "sign-up" ? "auth-tab auth-tab-active" : "auth-tab"}
                onClick={() => {
                  setMode("sign-up")
                  setSignUpStep("credentials")
                  setError(null)
                  setSuccess(null)
                }}
                type="button"
              >
                Create Account
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div id="clerk-captcha" />
              {mode === "sign-in" ? (
                <>
                  <label>
                    Email or Username
                    <input
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      autoComplete="username"
                      required
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </label>
                </>
              ) : (
                signUpStep === "credentials" ? (
                  <>
                    <label>
                      Username
                      <input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        autoComplete="username"
                        placeholder="binder_name"
                        required
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        value={emailAddress}
                        onChange={(event) => setEmailAddress(event.target.value)}
                        autoComplete="email"
                        required
                      />
                    </label>
                    <label>
                      Password
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </label>
                    <label>
                      Confirm Password
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <p className="auth-subtitle">
                      Enter the 6-digit code sent to {emailAddress}.
                    </p>
                    <label>
                      Verification Code
                      <input
                        value={verificationCode}
                        onChange={(event) => setVerificationCode(event.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        required
                      />
                    </label>
                    <div className="auth-inline-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setSignUpStep("credentials")
                          setVerificationCode("")
                          setError(null)
                          setSuccess(null)
                        }}
                      >
                        Edit Data
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={resendVerificationCode}
                        disabled={loading}
                      >
                        Resend Code
                      </button>
                    </div>
                  </>
                )
              )}

              {error ? <p className="auth-error">{error}</p> : null}
              {success ? <p className="auth-success">{success}</p> : null}

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading
                  ? "Invoking..."
                  : mode === "sign-in"
                    ? "Enter the Altar"
                    : signUpStep === "verify-email"
                      ? "Verify and Enter"
                      : "Forge My Binder"}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
