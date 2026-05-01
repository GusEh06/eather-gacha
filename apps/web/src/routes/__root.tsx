import { useState, type FormEvent } from "react"
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useLocation,
} from "@tanstack/react-router"
import { ClerkProvider, useSignIn, useSignUp, useClerk } from "@clerk/tanstack-react-start"
import { Show } from "@clerk/react"
import { esES } from "@clerk/localizations"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MasterLayout } from "../components/ui/MasterLayout"
import { LivingAtmosphere } from "../components/ui/LivingAtmosphere"

import appCss from "../styles.css?url"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Aether Gacha" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Rajdhani:wght@400;600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
  if (!clerkKey) {
    throw new Error(
      "[Aether] VITE_CLERK_PUBLISHABLE_KEY is not set. Copy .env.example to .env and fill in your Clerk publishable key."
    )
  }

  return (
    <ClerkProvider
      publishableKey={clerkKey}
      localization={esES}
      signInUrl="/#/sign-in"
      signUpUrl="/#/sign-up"
      appearance={{
        variables: {
          colorPrimary: "#00ffff",
          colorBackground: "#0a0a0f",
          colorText: "#e8e8f0",
          colorTextSecondary: "#a0a0b0",
          colorInputBackground: "#110518",
          colorInputText: "#e8e8f0",
          colorDanger: "#ff3399",
          fontFamily: "'Rajdhani', sans-serif",
          borderRadius: "0px",
        },
        elements: {
          cardBox: {
            boxShadow: "16px 16px 0 rgba(0,0,0,1)",
            border: "6px solid #000",
            borderRadius: "0px",
          },
          card: {
            background: "#0a0a0f",
            borderRadius: "0px",
            boxShadow: "none",
          },
          headerTitle: {
            fontFamily: "'Cinzel', serif",
            color: "#00ffff",
            fontSize: "2.2rem",
            textTransform: "uppercase",
            fontWeight: "900",
            textShadow: "2px 2px 0 #ff3399",
            letterSpacing: "0.05em",
          },
          headerSubtitle: {
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: "700",
            fontSize: "1.1rem",
            textTransform: "uppercase",
            color: "#ccff00",
            marginTop: "8px",
          },
          formButtonPrimary: {
            background: "#ccff00",
            color: "#000",
            border: "4px solid #000",
            boxShadow: "4px 4px 0 #000",
            borderRadius: "0px",
            textTransform: "uppercase",
            fontWeight: "900",
            fontFamily: "'Cinzel', serif",
            transition: "all 0.15s ease",
            "&:hover": {
              background: "#e6ff00",
              boxShadow: "6px 6px 0 #000",
              transform: "translate(-2px, -2px)",
            },
          },
          formFieldInput: {
            border: "4px solid #000",
            borderRadius: "0px",
            background: "#110518",
            color: "#00ffff",
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: "1.1rem",
            fontWeight: "600",
            boxShadow: "4px 4px 0 #ff3399",
            "&:focus": {
              borderColor: "#00ffff",
              boxShadow: "4px 4px 0 #ccff00",
            }
          },
          formFieldLabel: {
            color: "#00ffff",
            fontFamily: "'Cinzel', serif",
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          },
          socialButtonsBlockButton: {
            border: "4px solid #000",
            borderRadius: "0px",
            background: "#0a0a0f",
            color: "#00ffff",
            boxShadow: "4px 4px 0 #000",
            "&:hover": {
              background: "#110518",
              boxShadow: "6px 6px 0 #000",
              transform: "translate(-2px, -2px)",
            },
          },
          dividerLine: {
            background: "#ff3399",
          },
          dividerText: {
            color: "#ff3399",
          },
          footerActionLink: {
            color: "#ccff00",
            fontFamily: "'Cinzel', serif",
            fontWeight: "900",
            textTransform: "uppercase",
            "&:hover": {
              color: "#e6ff00",
            },
          },
          identityPreview: {
            border: "4px solid #000",
            borderRadius: "0px",
            background: "#110518",
            boxShadow: "4px 4px 0 #00ffff",
          },
          formResendCodeLink: {
            color: "#ccff00",
          },
          watermark: {
            display: "none",
          },
          userButtonPopoverCard: {
            background: "#110518",
            border: "4px solid #00ffff",
            boxShadow: "8px 8px 0 #00ffff",
          },
          userButtonPopoverActionButtonText: {
            color: "#e8e8f0",
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: "1.1rem",
            fontWeight: "700",
          },
          userButtonPopoverActionButtonIcon: {
            color: "#00ffff",
          },
          userButtonPopoverActionButton: {
            color: "#e8e8f0",
            "&:hover": {
              background: "rgba(0, 255, 255, 0.15)",
            },
          },
          userPreview: {
            background: "#1a0a2e",
            borderBottom: "2px solid #00ffff33",
          },
          userPreviewMainIdentifier: {
            color: "#00ffff",
            fontFamily: "'Cinzel', serif",
            fontWeight: "700",
            fontSize: "1rem",
          },
          userPreviewSecondaryIdentifier: {
            color: "#a0a0c0",
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: "0.9rem",
          },
          userButtonPopoverFooter: {
            display: "none",
          },
          profileSectionTitleText: {
            color: "#00ffff",
            fontFamily: "'Cinzel', serif",
            fontWeight: "900",
            fontSize: "1.2rem",
          },
          profileSectionContent: {
            color: "#e8e8f0",
          },
          profileSectionPrimaryButton: {
            color: "#ccff00",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: "700",
          },
          navbar: {
            background: "#110518",
            borderRight: "4px solid #00ffff33",
          },
          navbarButton: {
            color: "#e8e8f0",
          },
          navbarButtonIcon: {
            color: "#00ffff",
          },
          pageScrollBox: {
            background: "#0a0a0f",
          },
          page: {
            background: "#0a0a0f",
          },
          headerTitle: {
            color: "#00ffff",
            fontFamily: "'Cinzel', serif",
            fontWeight: "900",
          },
          headerSubtitle: {
            color: "#a0a0c0",
            fontFamily: "'Rajdhani', sans-serif",
          },
          profileSectionItemProfileImage: {
            borderColor: "#00ffff",
          },
          accordionTriggerButton: {
            color: "#e8e8f0",
          },
          formFieldInputShowPasswordButton: {
            color: "#00ffff",
          },
          tableHead: {
            color: "#a0a0c0",
          },
          badge: {
            color: "#e8e8f0",
          },
          modalContent: {
            background: "#0a0a0f",
            border: "4px solid #000",
            boxShadow: "16px 16px 0 rgba(0,0,0,1)",
          },
          modalCloseButton: {
            color: "#ff3399",
          },
          footerActionText: {
            color: "#a0a0b0",
          },
          formFieldAction: {
            color: "#ff3399",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: "600",
          },
          formHeaderSubtitle: {
            color: "#a0a0b0",
          },
          alertText: {
            color: "#e8e8f0",
          },
          otpCodeFieldInput: {
            border: "4px solid #000",
            borderRadius: "0px",
            background: "#110518",
            color: "#00ffff",
            fontFamily: "'Rajdhani', sans-serif",
            boxShadow: "4px 4px 0 #ff3399",
          },
          backLink: {
            color: "#ccff00",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: "700",
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Show
          when="signed-in"
          fallback={
            <>
              <AttractiveLoginPage />
              <div style={{ display: "none" }}>
                <Outlet />
              </div>
            </>
          }
        >
          <AdminOrGameLayout />
        </Show>
      </QueryClientProvider>
    </ClerkProvider>
  )
}

function AdminOrGameLayout() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith("/admin")

  if (isAdmin) {
    return <Outlet />
  }

  return (
    <MasterLayout>
      <Outlet />
    </MasterLayout>
  )
}

function AttractiveLoginPage() {
  const location = useLocation()
  const isSignUp = location.hash.includes("sign-up")

  return (
    <div className="login-shell">
      <LivingAtmosphere route="login" density={5} />
      <div className="login-content">
        <h1
          className="brutalist-title"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", marginBottom: "0" }}
        >
          Aether Gacha
        </h1>

        {isSignUp ? <CustomSignUpForm /> : <CustomSignInForm />}
      </div>
    </div>
  )
}

function CustomSignInForm() {
  const { signIn, isLoaded } = useSignIn()
  const { setActive } = useClerk()

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function getClerk() {
    return typeof window !== "undefined"
      ? (window as Record<string, unknown>).Clerk as Record<string, unknown> | undefined
      : undefined
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
    setError(null)

    const clerkClient = getClerk() as any
    const activeSignIn = (isLoaded ? signIn : null) ?? clerkClient?.client?.signIn
    const activeSetActive = setActive ?? ((args: any) => clerkClient?.setActive(args))

    if (!activeSignIn) {
      setError("El servicio de inicio de sesión no está disponible. Recargá la página.")
      return
    }

    setLoading(true)
    try {
      const result = await activeSignIn.create({
        identifier: identifier.trim(),
        password,
      })

      if (result.status === "complete") {
        await activeSetActive({ session: result.createdSessionId })
      } else {
        setError("Tu cuenta requiere verificación adicional.")
      }
    } catch (rawError: any) {
      setError(resolveClerkError(rawError, "El inicio de sesión falló."))
    } finally {
      setLoading(false)
    }
  }

  function switchToSignUp() {
    window.location.hash = "#/sign-up"
  }

  return (
    <div className="custom-signup-card">
      <h2 className="custom-signup-title">Iniciar Sesión</h2>
      <p className="custom-signup-subtitle">Vinculá tu alma al Aether</p>

      <form className="custom-signup-form" onSubmit={handleSubmit}>
        <label className="custom-signup-label">
          <span>Email o Usuario</span>
          <input
            className="custom-signup-input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="custom-signup-label">
          <span>Contraseña</span>
          <input
            className="custom-signup-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="custom-signup-error">{error}</p>}

        <button className="custom-signup-btn" type="submit" disabled={loading}>
          {loading ? "Invocando..." : "Entrar al Altar"}
        </button>
      </form>

      <p className="custom-signup-footer">
        ¿No tenés cuenta?{" "}
        <button type="button" className="custom-signup-link" onClick={switchToSignUp}>
          Crear Cuenta
        </button>
      </p>
    </div>
  )
}

/* ─── Custom Sign-Up form — replaces Clerk's prebuilt <SignUp> which
       redirects to hosted pages. Uses useSignUp() hook directly. ─── */
type SignUpStep = "credentials" | "verify-email"

function CustomSignUpForm() {
  const { signUp, isLoaded } = useSignUp()
  const { setActive } = useClerk()

  const [step, setStep] = useState<SignUpStep>("credentials")
  const [username, setUsername] = useState("")
  const [emailAddress, setEmailAddress] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function getClerk() {
    return typeof window !== "undefined"
      ? (window as Record<string, unknown>).Clerk as Record<string, unknown> | undefined
      : undefined
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
    setError(null)
    setSuccess(null)

    const clerkClient = getClerk() as any
    const activeSignUp = (isLoaded ? signUp : null) ?? clerkClient?.client?.signUp
    const activeSetActive = setActive ?? ((args: any) => clerkClient?.setActive(args))

    if (!activeSignUp) {
      setError("El servicio de registro no está disponible. Intenta recargar la página.")
      return
    }

    // ─── STEP 2: Verify email code ───
    if (step === "verify-email") {
      setLoading(true)
      try {
        const result = await activeSignUp.attemptVerification({
          strategy: "email_code",
          code: verificationCode,
        })
        if (result.status === "complete") {
          await activeSetActive({ session: result.createdSessionId })
        } else {
          setError("Código inválido. Intenta de nuevo.")
        }
      } catch (rawError: any) {
        console.error("CLERK VERIFY ERROR:", rawError)
        setError(resolveClerkError(rawError, "La verificación falló."))
      } finally {
        setLoading(false)
      }
      return
    }

    // ─── STEP 1: Create account ───
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)
    try {
      const created = await activeSignUp.create({
        emailAddress: emailAddress.trim(),
        password,
        username: username.trim() || undefined,
      })

      if (!created || (created.status !== "missing_requirements" && created.status !== "complete")) {
        throw new Error("Estado inesperado: " + created?.status)
      }

      if (created.status === "complete") {
        await activeSetActive({ session: created.createdSessionId })
        return
      }

      await created.prepareVerification({ strategy: "email_code" })
      setStep("verify-email")
      setSuccess("Código enviado a tu email.")
    } catch (rawError: any) {
      console.error("CLERK SIGNUP ERROR:", rawError)
      setError(resolveClerkError(rawError, "El registro falló."))
    } finally {
      setLoading(false)
    }
  }

  async function resendCode() {
    const clerkClient = getClerk() as any
    const activeSignUp = (isLoaded ? signUp : null) ?? clerkClient?.client?.signUp
    if (!activeSignUp) return
    try {
      await activeSignUp.prepareVerification({ strategy: "email_code" })
      setSuccess("Código reenviado.")
    } catch {
      setError("No se pudo reenviar el código.")
    }
  }

  function switchToSignIn() {
    window.location.hash = "#/sign-in"
  }

  return (
    <div className="custom-signup-card">
      <h2 className="custom-signup-title">
        {step === "credentials" ? "Crear Cuenta" : "Verificar Email"}
      </h2>
      <p className="custom-signup-subtitle">
        {step === "credentials"
          ? "Forja tu identidad en el Aether"
          : `Ingresa el código de 6 dígitos enviado a ${emailAddress}`}
      </p>

      <form className="custom-signup-form" onSubmit={handleSubmit}>
        <div id="clerk-captcha" />

        {step === "credentials" ? (
          <>
            <label className="custom-signup-label">
              <span>Nombre de Usuario</span>
              <input
                className="custom-signup-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="binder_name"
                required
              />
            </label>
            <label className="custom-signup-label">
              <span>Email</span>
              <input
                className="custom-signup-input"
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="custom-signup-label">
              <span>Contraseña</span>
              <input
                className="custom-signup-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="custom-signup-label">
              <span>Confirmar Contraseña</span>
              <input
                className="custom-signup-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
          </>
        ) : (
          <>
            <label className="custom-signup-label">
              <span>Código de Verificación</span>
              <input
                className="custom-signup-input"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                required
              />
            </label>
            <div className="custom-signup-inline">
              <button
                type="button"
                className="custom-signup-link"
                onClick={() => {
                  setStep("credentials")
                  setVerificationCode("")
                  setError(null)
                  setSuccess(null)
                }}
              >
                ← Editar datos
              </button>
              <button
                type="button"
                className="custom-signup-link"
                onClick={resendCode}
                disabled={loading}
              >
                Reenviar código
              </button>
            </div>
          </>
        )}

        {error && <p className="custom-signup-error">{error}</p>}
        {success && <p className="custom-signup-success">{success}</p>}

        <button className="custom-signup-btn" type="submit" disabled={loading}>
          {loading
            ? "Invocando..."
            : step === "verify-email"
              ? "Verificar y Entrar"
              : "Forjar Mi Binder"}
        </button>
      </form>

      <p className="custom-signup-footer">
        ¿Ya tienes cuenta?{" "}
        <button type="button" className="custom-signup-link" onClick={switchToSignIn}>
          Iniciar Sesión
        </button>
      </p>
    </div>
  )
}
