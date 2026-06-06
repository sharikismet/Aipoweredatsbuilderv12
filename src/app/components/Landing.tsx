import { ArrowRight, Target, FileText, Zap, User, LogOut, Wand2 } from "lucide-react";

interface LandingProfile {
  full_name?: string;
  email?: string;
}

interface Props {
  profile?: LandingProfile | null;
  onGetStarted: () => void;
  onSignIn: () => void;
  onBuildCV: () => void;
  onGoToAccount?: () => void;
  onSignOut?: () => void;
}

export function Landing({ profile, onGetStarted, onSignIn, onBuildCV, onGoToAccount, onSignOut }: Props) {
  const signedIn = !!profile?.email;
  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "Account";

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="font-mono text-xs uppercase tracking-widest">
            <span className="text-primary">●</span> ATS Engine
          </div>
          <div className="flex items-center gap-3">
            {signedIn ? (
              <>
                <button
                  onClick={onGoToAccount}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-mono text-xs uppercase tracking-widest hover:opacity-90"
                >
                  <User size={14} /> {displayName}
                </button>
                <button
                  onClick={onSignOut}
                  className="inline-flex items-center gap-2 border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </>
            ) : (
              <>
                <button onClick={onSignIn} className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">Sign in</button>
                <button onClick={onGetStarted} className="bg-primary text-primary-foreground px-5 py-2.5 font-mono text-xs uppercase tracking-widest hover:opacity-90">Start free</button>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32 grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-6">001 / Resume engine for serious applicants</div>
            <h1 className="text-foreground">Stop sending<br />the <span className="text-primary">same CV</span><br />to everyone.</h1>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <p className="text-foreground/80 max-w-md">ATS Engine classifies you by experience tier, matches you to the right roles, and rewrites your CV for each one — automatically.</p>
            <button onClick={onBuildCV} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-4 font-mono uppercase tracking-widest text-sm hover:opacity-90">
              Build my CV <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-6">002 / The tier ladder</div>
          <h2 className="mb-12 max-w-3xl">Apply where you actually fit.</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-px bg-border border border-border">
            {[
              { label: "Fresh Grad", desc: "Internships, entry-level" },
              { label: "Experienced Undergrad", desc: "Entry to mid-level" },
              { label: "Mid Level", desc: "Mid-level IC roles" },
              { label: "Senior", desc: "Senior IC, team-lead" },
              { label: "Executive", desc: "Director, VP, C-suite" },
            ].map((t, i) => (
              <div key={t.label} className="p-6 bg-card">
                <div className="font-mono text-xs uppercase tracking-widest text-primary mb-3">Tier {i + 1}</div>
                <div className="text-lg mb-2">{t.label}</div>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </div>
            ))}
          </div>

          {/* Build-from-JD lives on the tier ladder so users can jump straight
              from picking their tier to pasting a job description. */}
          <div className="mt-10 border border-border bg-card p-8 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="max-w-2xl">
              <div className="font-mono text-xs uppercase tracking-widest text-primary mb-2">Build with a job description</div>
              <h3 className="mb-2">Paste any LinkedIn or Indeed JD — we'll mirror its language.</h3>
              <p className="text-muted-foreground text-sm">Every bullet rewritten to match the recruiter's keywords, scoped to your tier on the ladder above.</p>
            </div>
            <button
              onClick={onBuildCV}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-4 font-mono uppercase tracking-widest text-sm hover:opacity-90 shrink-0"
            >
              <Wand2 size={16} /> Build from JD
            </button>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-12">
          {[
            { icon: Target, title: "Tier-aware matching", body: "We don't show executives internships. We don't show grads VP roles. The match is the product." },
            { icon: FileText, title: "ATS-grade CVs", body: "Clean structure, scannable keywords, no fancy layouts that confuse parsers." },
            { icon: Zap, title: "One-click tailoring", body: "Match a job, click once, get a CV rewritten to its keywords and seniority." },
          ].map((f) => (
            <div key={f.title}>
              <f.icon size={28} className="text-primary mb-4" />
              <h4 className="mb-2">{f.title}</h4>
              <p className="text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32 flex flex-col lg:flex-row items-end justify-between gap-8">
          <h2 className="text-primary-foreground max-w-3xl">Apply smart.<br/>Apply once.<br/>Get hired.</h2>
          {signedIn ? (
            <button onClick={onGoToAccount} className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-8 py-5 font-mono uppercase tracking-widest text-sm hover:opacity-90">
              Open dashboard <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={onGetStarted} className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-8 py-5 font-mono uppercase tracking-widest text-sm hover:opacity-90">
              Start free <ArrowRight size={16} />
            </button>
          )}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>© ATS Engine — 2026</span>
          <span>v0.1 · Built for the relentlessly employed</span>
        </div>
      </footer>
    </div>
  );
}
