import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { supabase, api, getAccessToken } from "../lib/supabase";
import { Landing } from "./components/Landing";
import { AuthScreen } from "./components/AuthScreen";
import { OnboardingForm } from "./components/OnboardingForm";
import { Dashboard } from "./components/Dashboard";
import { CareerTier, SubscriptionTier } from "../lib/tier";
import { Loader2 } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  current_tier: CareerTier;
  subscription_tier: SubscriptionTier;
  credits_remaining: number;
  onboarded: boolean;
}

type Route = "landing" | "auth" | "onboarding" | "dashboard";

export default function App() {
  const [route, setRoute] = useState<Route>("landing");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [booting, setBooting] = useState(true);

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
      if (p) setRoute(p.onboarded ? "dashboard" : "onboarding");
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
    setRoute(p?.onboarded ? "dashboard" : "onboarding");
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
        <Landing onGetStarted={() => setRoute("auth")} onSignIn={() => setRoute("auth")} />
      )}
      {route === "auth" && <AuthScreen onAuthed={handleAuthed} onBack={() => setRoute("landing")} />}
      {route === "onboarding" && profile && (
        <OnboardingForm
          initialName={profile.full_name}
          initialEmail={profile.email}
          onComplete={async () => {
            await loadProfile();
            setRoute("dashboard");
          }}
        />
      )}
      {route === "dashboard" && profile && (
        <Dashboard profile={profile} onProfileUpdate={setProfile} onSignOut={handleSignOut} />
      )}
    </div>
  );
}
