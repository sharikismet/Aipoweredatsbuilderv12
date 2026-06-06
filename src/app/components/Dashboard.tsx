import { useEffect, useState } from "react";
import { api, getAccessToken } from "../../lib/supabase";
import { DashboardHeader } from "./DashboardHeader";
import { PricingCards } from "./PricingCards";
import { CareerTier, SubscriptionTier, TIER_LABEL } from "../../lib/tier";
import { Download, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  current_tier: CareerTier;
  subscription_tier: SubscriptionTier;
  credits_remaining: number;
  onboarded: boolean;
}

interface Match {
  id: string;
  title: string;
  company: string;
  location: string;
  level: CareerTier;
  skills: string[];
  description: string;
  score: number;
  overlap: number;
}

interface Tailored {
  id: string;
  job_title: string;
  company: string;
  markdown: string;
  created_at: string;
}

interface Props {
  profile: Profile;
  onProfileUpdate: (p: Profile) => void;
  onSignOut: () => void;
}

type View = "matches" | "cvs" | "pricing";

export function Dashboard({ profile, onProfileUpdate, onSignOut }: Props) {
  const [view, setView] = useState<View>("matches");
  const [matches, setMatches] = useState<Match[]>([]);
  const [tailored, setTailored] = useState<Tailored[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [tailoring, setTailoring] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState<SubscriptionTier | null>(null);

  async function loadMatches() {
    setLoadingMatches(true);
    try {
      const token = await getAccessToken();
      const res = await api<{ matches: Match[] }>("/matches", { token: token ?? undefined });
      setMatches(res.matches);
    } catch (e: any) {
      console.error("Failed to load matches:", e);
      toast.error(e?.message ?? "Failed to load matches");
    } finally {
      setLoadingMatches(false);
    }
  }
  async function loadTailored() {
    try {
      const token = await getAccessToken();
      const res = await api<{ tailored: Tailored[] }>("/tailored", { token: token ?? undefined });
      setTailored(res.tailored.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (e) {
      console.error("Failed to load tailored CVs:", e);
    }
  }

  useEffect(() => {
    loadMatches();
    loadTailored();
  }, []);

  async function tailor(jobId: string) {
    setTailoring(jobId);
    try {
      const token = await getAccessToken();
      const res = await api<{ tailored: Tailored; profile: Profile }>("/tailor", {
        method: "POST",
        token: token ?? undefined,
        body: { jobId },
      });
      onProfileUpdate(res.profile);
      setTailored([res.tailored, ...tailored]);
      toast.success(`Tailored CV ready for ${res.tailored.job_title}`);
      setView("cvs");
    } catch (e: any) {
      console.error("Tailor failed:", e);
      toast.error(e?.message ?? "Tailoring failed");
    } finally {
      setTailoring(null);
    }
  }

  async function subscribe(plan: SubscriptionTier) {
    setSubLoading(plan);
    try {
      const token = await getAccessToken();
      const res = await api<{ profile: Profile }>("/subscribe", {
        method: "POST",
        token: token ?? undefined,
        body: { plan },
      });
      onProfileUpdate(res.profile);
      toast.success(`You're on ${plan === "free" ? "Free" : plan === "job_hunter" ? "Job Hunter" : "Aggressive Campaigner"}`);
      setView("matches");
    } catch (e: any) {
      console.error("Subscribe failed:", e);
      toast.error(e?.message ?? "Subscribe failed");
    } finally {
      setSubLoading(null);
    }
  }

  function downloadCV(t: Tailored) {
    const blob = new Blob([t.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.job_title.replace(/\s+/g, "-")}-${t.company.replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        fullName={profile.full_name}
        email={profile.email}
        tier={profile.current_tier}
        subscription={profile.subscription_tier}
        creditsRemaining={profile.credits_remaining}
        onSignOut={onSignOut}
        onUpgrade={() => setView("pricing")}
      />

      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex gap-8 border-b border-border">
          {(["matches", "cvs", "pricing"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`py-4 font-mono text-xs uppercase tracking-widest transition-colors ${
                view === v ? "text-primary border-b-2 border-primary -mb-px" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "matches" ? "Job Matches" : v === "cvs" ? `Tailored CVs (${tailored.length})` : "Plans"}
            </button>
          ))}
        </nav>

        {view === "matches" && (
          <div className="py-10">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
                  Filtered for {TIER_LABEL[profile.current_tier]}
                </div>
                <h2>Today's matches</h2>
              </div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {matches.length} roles · sorted by fit
              </div>
            </div>

            {loadingMatches ? (
              <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs uppercase tracking-widest">
                <Loader2 size={14} className="animate-spin" /> Loading
              </div>
            ) : (
              <div className="space-y-px bg-border border border-border">
                {matches.map((m) => (
                  <article key={m.id} className="bg-card p-6 grid lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-mono text-xs uppercase tracking-widest text-primary">{TIER_LABEL[m.level]}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{m.location}</span>
                      </div>
                      <h3 className="mb-1">{m.title}</h3>
                      <div className="text-muted-foreground mb-3">{m.company}</div>
                      <p className="text-sm text-muted-foreground">{m.description}</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {m.skills.map((s) => (
                          <span key={s} className="font-mono text-[10px] uppercase tracking-widest border border-border px-2 py-1">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="lg:col-span-3 flex flex-col items-start lg:items-center justify-center">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Match score</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "3rem", lineHeight: 1, fontWeight: 900 }} className={m.score >= 70 ? "text-primary" : "text-foreground"}>
                        {m.score}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{m.overlap} skill overlap</div>
                    </div>
                    <div className="lg:col-span-2 flex lg:justify-end">
                      <button
                        onClick={() => tailor(m.id)}
                        disabled={tailoring === m.id}
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 font-mono text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50 w-full lg:w-auto justify-center"
                      >
                        {tailoring === m.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        Tailor CV
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "cvs" && (
          <div className="py-10">
            <h2 className="mb-8">Your tailored CVs</h2>
            {tailored.length === 0 ? (
              <div className="border border-dashed border-border p-12 text-center">
                <FileText size={32} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No tailored CVs yet — match a job to generate one.</p>
                <button onClick={() => setView("matches")} className="font-mono text-xs uppercase tracking-widest text-primary hover:underline">
                  Go to matches →
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-px bg-border border border-border">
                {tailored.map((t) => (
                  <div key={t.id} className="bg-card p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="font-mono text-xs uppercase tracking-widest text-primary mb-1">
                          {new Date(t.created_at).toLocaleDateString()}
                        </div>
                        <h4>{t.job_title}</h4>
                        <div className="text-muted-foreground text-sm">{t.company}</div>
                      </div>
                      <button onClick={() => downloadCV(t)} className="p-2 border border-border hover:border-primary" aria-label="Download CV">
                        <Download size={16} />
                      </button>
                    </div>
                    <pre className="bg-background border border-border p-4 text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
                      {t.markdown.slice(0, 600)}{t.markdown.length > 600 ? "\n..." : ""}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "pricing" && (
          <div className="py-10">
            <div className="mb-8">
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Currently: {profile.subscription_tier}
              </div>
              <h2>Pick your plan</h2>
            </div>
            <PricingCards currentPlan={profile.subscription_tier} onSelect={subscribe} loading={subLoading} />
          </div>
        )}
      </div>
    </div>
  );
}
