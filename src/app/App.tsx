import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { supabase, api, getAccessToken } from "../lib/supabase";
import { Landing } from "./components/Landing";
import { AuthScreen } from "./components/AuthScreen";
import { CareerPicker } from "./components/CareerPicker";
import { OnboardingForm } from "./components/OnboardingForm";
import { Dashboard } from "./components/Dashboard";
import { BuildCV } from "./components/BuildCV";
import { AdminPage } from "./components/AdminPage";
import { TemplateGallery } from "./components/TemplateGallery";
import { CVViewer } from "./components/CVViewer";
import { CareerTier, SubscriptionTier } from "../lib/tier";
import { CareerDomainId } from "../lib/careerDomains";
import { Loader2 } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  current_tier: CareerTier;
  subscription_tier: SubscriptionTier;
  credits_remaining: number;
  onboarded: boolean;
  career_domain: CareerDomainId | null;
}

type Route = "landing" | "auth-signup" | "auth-signin" | "career" | "onboarding" | "dashboard" | "build" | "template-gallery" | "view-cv" | "admin";

function routeForProfile(p: Profile): Route {
  if (!p.career_domain) return "career";
  if (!p.onboarded) return "onboarding";
  return "dashboard";
}

export default function App() {
  const [route, setRoute] = useState<Route>("landing");
  const [prevRoute, setPrevRoute] = useState<Route>("landing"); 
  const [profile, setProfile] = useState<Profile | null>(null);
  const [booting, setBooting] = useState(true);
  const [pendingAfterAuth, setPendingAfterAuth] = useState<Route | null>(null);
  const [activeCV, setActiveCV] = useState<any | null>(null);

  async function loadProfile() {
    const token = await getAccessToken();
    if (!token) {
      setProfile(null);
      return null;
    }
    try {
      const { profile } = await api<{ profile: Profile }>("/profile", { token });
      setProfile(profile);
      return profile;
    } catch (e) {
      console.error("Failed to load profile:", e);
      return null;
    }
  }

  useEffect(() => {
    (async () => {
      const p = await loadProfile();
      if (p) setRoute(routeForProfile(p));
      setBooting(false);
    })();
    const { data: sub } = supabase().auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setProfile(null);
        setRoute("landing");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleAuthed() {
    const p = await loadProfile();
    if (!p) return;
    
    if (pendingAfterAuth === "build" || pendingAfterAuth === "template-gallery") {
      const target = pendingAfterAuth;
      setPendingAfterAuth(null);
      if (p.onboarded && p.career_domain) {
        setRoute(target);
        return;
      }
      setPendingAfterAuth(target);
    }
    setRoute(routeForProfile(p));
  }

  function handleBuildMyCV() {
    setPrevRoute("landing"); 
    
    if (profile && profile.onboarded && profile.career_domain) {
      setRoute("template-gallery");
      return;
    }
    if (profile) {
      setPendingAfterAuth("template-gallery");
      setRoute(routeForProfile(profile));
      return;
    }
    setPendingAfterAuth("template-gallery");
    setRoute("auth-signup");
  }

  async function generateBaselineAndGo() {
    try {
      const token = await getAccessToken();
      toast.message("Generating your baseline ATS CV…");
      const res = await api<{ profile: Profile }>("/tailor-baseline", {
        method: "POST",
        token: token ?? undefined,
        body: { template: "classic" },
      });
      if (res.profile) setProfile(res.profile);
      toast.success("Baseline CV ready — find it under Tailored CVs.");
    } catch (e: any) {
      console.error("baseline gen failed:", e);
      toast.error(e?.message ?? "Baseline generation failed");
    } finally {
      setRoute("dashboard");
    }
  }

  async function handleSignOut() {
    await supabase().auth.signOut();
    setProfile(null);
    setRoute("landing");
  }

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs uppercase tracking-widest">
          <Loader2 size={14} className="animate-spin" /> Loading
        </div>
      </div>
    );
  }

  return (
    <div className="size-full">
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "var(--card)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
            borderRadius: "0",
            fontFamily: "var(--font-sans)",
          },
        }}
      />

      {route === "landing" && (
        <Landing
          profile={profile}
          onGetStarted={() => setRoute("auth-signup")}
          onSignIn={() => setRoute("auth-signin")}
          onBuildCV={handleBuildMyCV}
          onGoToAccount={() => setRoute("dashboard")}
          onSignOut={handleSignOut}
        />
      )}
      {(route === "auth-signup" || route === "auth-signin") && (
        <AuthScreen
          onAuthed={handleAuthed}
          onBack={() => setRoute("landing")}
          initialMode={route === "auth-signin" ? "signin" : "signup"}
        />
      )}
      {route === "career" && profile && (
        <CareerPicker
          initial={profile.career_domain}
          initialCustomLabel={(profile as any).custom_career_label ?? null}
          onComplete={async () => {
            const p = await loadProfile();
            if (p) setRoute(p.onboarded ? "dashboard" : "onboarding");
          }}
          onBack={profile.onboarded ? () => setRoute("dashboard") : handleSignOut}
          backLabel={profile.onboarded ? "← Back to dashboard" : "Sign out & go back"}
        />
      )}
      {route === "onboarding" && profile && (
        <OnboardingForm
          initialName={profile.full_name}
          initialEmail={profile.email}
          domainId={profile.career_domain}
          onComplete={async () => {
            await loadProfile();
            if (pendingAfterAuth === "build" || pendingAfterAuth === "template-gallery") {
              const target = pendingAfterAuth;
              setPendingAfterAuth(null);
              setRoute(target);
            } else {
              await generateBaselineAndGo();
            }
          }}
          onBack={() => setRoute("career")}
        />
      )}
      {route === "dashboard" && profile && (
        <Dashboard
          profile={profile}
          onProfileUpdate={setProfile}
          onSignOut={handleSignOut}
          onChangeCareer={() => setRoute("career")}
          onBuildCV={() => {
            setPrevRoute("dashboard"); 
            setRoute("build");
          }}
          onOpenGallery={() => {
            setPrevRoute("dashboard"); 
            setRoute("template-gallery");
          }}
          onOpenCV={(cv) => {
            setActiveCV(cv);
            setRoute("view-cv");
          }}
          onGoToLanding={() => setRoute("landing")}
          onGoToAdmin={() => setRoute("admin")}
        />
      )}
      {route === "template-gallery" && profile && (
        <TemplateGallery
          onBack={() => setRoute(prevRoute)} 
          onSelectTemplate={async (templateId) => {
            try {
              const token = await getAccessToken();
              toast.message("Generating your ATS Template CV…");
              const res = await api<{ profile: Profile; tailored?: any }>("/tailor-baseline", {
                method: "POST",
                token: token ?? undefined,
                body: { template: templateId === "ai-auto" ? "classic" : templateId },
              });
              if (res.profile) setProfile(res.profile);
              toast.success("CV ready — find it under your CV history.");
              setRoute("dashboard");
            } catch (e: any) {
              console.error("Template gen failed:", e);
              toast.error(e?.message ?? "Template generation failed");
            }
          }}
        />
      )}
      {route === "build" && profile && (
        <BuildCV
          profile={profile}
          onProfileUpdate={(p) => setProfile((cur) => ({ ...(cur as Profile), ...(p as any) }))}
          onBack={() => setRoute(prevRoute)}
        />
      )}
      {route === "view-cv" && activeCV && (
        <CVViewer 
          cv={activeCV} 
          onBack={() => setRoute("dashboard")} 
        />
      )}
      {route === "admin" && profile && (
        <AdminPage onBack={() => setRoute("dashboard")} />
      )}
    </div>
  );
}