import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"
import { ClerkProvider, SignIn } from "@clerk/tanstack-react-start"
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
            background: "#0a0a0f",
            border: "4px solid #000",
            boxShadow: "8px 8px 0 rgba(0,0,0,1)",
          },
          userButtonPopoverActionButtonText: {
            color: "#e8e8f0",
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: "1.1rem",
            fontWeight: "600",
          },
          userButtonPopoverActionButtonIcon: {
            color: "#00ffff",
          },
          userButtonPopoverActionButton: {
            "&:hover": {
              background: "rgba(0, 255, 255, 0.1)",
            },
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
            borderRight: "4px solid #000",
          },
          navbarButton: {
            color: "#e8e8f0",
          },
          pageScrollBox: {
            background: "#0a0a0f",
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
          <MasterLayout>
            <Outlet />
          </MasterLayout>
        </Show>
      </QueryClientProvider>
    </ClerkProvider>
  )
}

function AttractiveLoginPage() {
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
        
        <SignIn />
      </div>
    </div>
  )
}
