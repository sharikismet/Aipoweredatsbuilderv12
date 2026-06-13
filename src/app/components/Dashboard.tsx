import { useEffect, useState } from "react";
import { api, getAccessToken } from "../../lib/supabase";
import { DashboardHeader } from "./DashboardHeader";
import { PricingCards } from "./PricingCards";
import { AccountView } from "./AccountView";
import { CareerTier, SubscriptionTier, TIER_LABEL } from "../../lib/tier";
import { CareerDomainId } from "../../lib/careerDomains";
import { Download, FileText, Loader2, Sparkles, Trash2, Wand2, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

interface Profile { id: string; email: string; full_name: string; current_tier: CareerTier; subscription_tier: SubscriptionTier; credits_remaining: number; onboarded: boolean; career_domain: CareerDomainId | null; }
interface Match { id: string; title: string; company: string; location: string; level: CareerTier; skills: string[]; description: string; score: number; overlap: number; }
interface Tailored { id: string; job_title: string; company: string; markdown: string; created_at: string; }

interface Props { profile: Profile; onProfileUpdate: (p: Profile) => void; onSignOut: () => void; onChangeCareer: () => void; onBuildCV: () => void; onOpenGallery: () => void; onOpenCV: (cv: Tailored) => void; onGoToLanding: () => void; onGoToAdmin?: () => void; }

type View = "matches" | "cvs" | "pricing" | "account";

export function Dashboard({ profile, onProfileUpdate, onSignOut, onChangeCareer, onBuildCV, onOpenGallery, onOpenCV, onGoToLanding, onGoToAdmin }: Props) {
  const [view, setView] = useState<View>("matches");
  const [matches, setMatches] = useState<Match[]>([]);
  const [tailored, setTailored] = useState<Tailored[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [tailoring, setTailoring] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState<SubscriptionTier | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadMatches() {
    setLoadingMatches(true);
    try {
      const token = await getAccessToken();
      const res = await api<{ matches: Match[] }>("/matches", { token: token ?? undefined });
      setMatches(res.matches);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load matches");
    } finally { setLoadingMatches(false); }
  }
  
  async function loadTailored() {
    try {
      const token = await getAccessToken();
      const res = await api<{ tailored: Tailored[] }>("/tailored", { token: token ?? undefined });
      setTailored(res.tailored.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (e) { console.error("Failed to load tailored CVs:", e); }
  }

  useEffect(() => { loadMatches(); loadTailored(); }, []);

  async function tailor(jobId: string) {
    setTailoring(jobId);
    try {
      const token = await getAccessToken();
      const res = await api<{ tailored: Tailored; profile: Profile }>("/tailor", { method: "POST", token: token ?? undefined, body: { jobId } });
      onProfileUpdate(res.profile);
      setTailored([res.tailored, ...tailored]);
      toast.success(`Tailored CV ready!`);
      onOpenCV(res.tailored); 
    } catch (e: any) {
      toast.error(e?.message ?? "Tailoring failed");
    } finally { setTailoring(null); }
  }

  async function subscribe(plan: SubscriptionTier) {
    setSubLoading(plan);
    try {
      const token = await getAccessToken();
      const res = await api<{ profile: Profile }>("/subscribe", { method: "POST", token: token ?? undefined, body: { plan } });
      onProfileUpdate(res.profile);
      toast.success(`Upgraded to ${plan}`);
      setView("matches");
    } catch (e: any) { toast.error(e?.message ?? "Subscribe failed"); } finally { setSubLoading(null); }
  }

  async function deleteCV(t: Tailored) {
    if (!confirm(`Delete tailored CV?`)) return;
    setDeleting(t.id);
    try {
      const token = await getAccessToken();
      await api(`/tailored/${t.id}`, { method: "DELETE", token: token ?? undefined });
      setTailored((prev) => prev.filter((x) => x.id !== t.id));
      toast.success("Deleted.");
    } catch (e: any) { toast.error("Delete failed"); } finally { setDeleting(null); }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader fullName={profile.full_name} email={profile.email} tier={profile.current_tier} subscription={profile.subscription_tier} creditsRemaining={profile.credits_remaining} domainId={profile.career_domain} onSignOut={onSignOut} onUpgrade={() => setView("pricing")} onOpenAccount={() => setView("account")} />

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between border-b border-border">
          <nav className="flex gap-8">
            {(["matches", "cvs", "account", "pricing"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`py-4 font-mono text-xs uppercase tracking-widest transition-colors ${view === v ? "text-primary border-b-2 border-primary -mb-px" : "text-muted-foreground hover:text-foreground"}`}>
                {v === "matches" ? "Job Matches" : v === "cvs" ? `Tailored CVs (${tailored.length})` : v === "account" ? "My Account" : "Plans"}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-6">
            {onGoToAdmin && <button onClick={onGoToAdmin} className="py-4 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">Admin</button>}
            <button onClick={onGoToLanding} className="py-4 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">← Back to home</button>
          </div>
        </div>

        {view === "matches" && (
           <div className="py-10">
           <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
             <div>
               <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Filtered for {TIER_LABEL[profile.current_tier]}</div>
               <h2>Today's matches</h2>
             </div>
           </div>

           {loadingMatches ? (
             <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs uppercase tracking-widest"><Loader2 size={14} className="animate-spin" /> Loading</div>
           ) : (
             <div className="space-y-px bg-border border border-border">
               {matches.map((m) => (
                 <article key={m.id} className="bg-card p-6 grid lg:grid-cols-12 gap-6 items-start">
                   <div className="lg:col-span-7">
                     <div className="flex items-center gap-3 mb-2 flex-wrap"><span className="font-mono text-xs uppercase tracking-widest text-primary">{TIER_LABEL[m.level]}</span><span className="text-muted-foreground">·</span><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{m.location}</span></div>
                     <h3 className="mb-1">{m.title}</h3>
                     <div className="text-muted-foreground mb-3">{m.company}</div>
                     <p className="text-sm text-muted-foreground">{m.description}</p>
                     <div className="flex flex-wrap gap-2 mt-4">
                       {m.skills.map((s) => <span key={s} className="font-mono text-[10px] uppercase tracking-widest border border-border px-2 py-1">{s}</span>)}
                     </div>
                   </div>
                   <div className="lg:col-span-3 flex flex-col items-start lg:items-center justify-center">
                     <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Match score</div>
                     <div style={{ fontFamily: "var(--font-display)", fontSize: "3rem", lineHeight: 1, fontWeight: 900 }} className={m.score >= 70 ? "text-primary" : "text-foreground"}>{m.score}</div>
                   </div>
                   <div className="lg:col-span-2 flex lg:justify-end">
                     <button onClick={() => tailor(m.id)} disabled={tailoring === m.id} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 font-mono text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50 w-full lg:w-auto justify-center">
                       {tailoring === m.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Tailor CV
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
            <h2 className="mb-6">Generate New CV</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div onClick={onOpenGallery} className="bg-card border border-border p-8 flex flex-col items-start text-left hover:border-primary transition-colors cursor-pointer group">
                <div className="flex items-center gap-3 mb-3"><LayoutTemplate size={20} className="text-primary" /><h3 className="text-xl m-0">Build Standard CV</h3></div>
                <p className="text-muted-foreground text-sm mb-6">Choose from our visual gallery of ATS-optimized templates.</p>
                <div className="mt-auto font-mono text-xs uppercase tracking-widest text-primary group-hover:underline">Browse Templates →</div>
              </div>
              <div onClick={onBuildCV} className="bg-card border border-border p-8 flex flex-col items-start text-left hover:border-primary transition-colors cursor-pointer group">
                <div className="flex items-center gap-3 mb-3"><Wand2 size={20} className="text-primary" /><h3 className="text-xl m-0">Tailor to Job Description</h3></div>
                <p className="text-muted-foreground text-sm mb-6">Paste a specific LinkedIn or Indeed job post. We will rewrite your CV to match.</p>
                <div className="mt-auto font-mono text-xs uppercase tracking-widest text-primary group-hover:underline">Paste JD →</div>
              </div>
            </div>

            <div className="flex items-end justify-between mb-6 flex-wrap gap-4"><h2>Your Generated CV History</h2></div>
            
            {tailored.length === 0 ? (
              <div className="border border-dashed border-border p-12 text-center">
                <FileText size={32} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No CVs generated yet.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {tailored.map((t) => (
                  <div key={t.id} className="bg-card border border-border p-6 hover:border-foreground transition-colors flex flex-col">
                    <div className="flex-1">
                      <div className="font-mono text-xs uppercase tracking-widest text-primary mb-2">{new Date(t.created_at).toLocaleDateString()}</div>
                      <h4 className="text-lg mb-1">{t.job_title || "Standard Resume"}</h4>
                      <div className="text-muted-foreground text-sm mb-6">{t.company || "General Export"}</div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-4 mt-auto">
                      <button onClick={() => onOpenCV(t)} className="font-mono text-xs uppercase tracking-widest text-foreground hover:text-primary transition-colors">Open & Export →</button>
                      <button onClick={() => deleteCV(t)} disabled={deleting === t.id} className="text-muted-foreground hover:text-destructive disabled:opacity-50 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "account" && <AccountView profile={profile} onProfileUpdate={onProfileUpdate} onChangeCareer={onChangeCareer} />}
        {view === "pricing" && <div className="py-10"><div className="mb-8"><div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Currently: {profile.subscription_tier}</div><h2>Pick your plan</h2></div><PricingCards currentPlan={profile.subscription_tier} onSelect={subscribe} loading={subLoading} /></div>}
      </div>
    </div>
  );
}