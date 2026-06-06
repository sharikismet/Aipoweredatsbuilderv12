import { useState } from "react";
import { supabase, api } from "../../lib/supabase";
import { toast } from "sonner";

interface Props {
  onAuthed: () => void;
  onBack: () => void;
  initialMode?: "signin" | "signup";
}

export function AuthScreen({ onAuthed, onBack, initialMode = "signup" }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        await api("/signup", { method: "POST", body: { email, password, full_name: fullName } });
        const { error } = await supabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Account created");
        onAuthed();
      } else {
        const { error } = await supabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        onAuthed();
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-2/5 bg-primary text-primary-foreground p-12 flex-col justify-between">
        <button onClick={onBack} className="font-mono text-xs uppercase tracking-widest hover:underline self-start">← Back</button>
        <div>
          <div className="font-mono text-xs uppercase tracking-widest mb-6">ATS / Resume Engine</div>
          <h1 className="text-primary-foreground">Get<br/>Hired<br/>Faster.</h1>
          <p className="mt-8 max-w-sm">A resume engine that knows where you actually fit — and applies you there.</p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest opacity-70">v0.1 · Tier-aware matching · ATS-grade output</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <form onSubmit={submit} className="w-full max-w-md space-y-6">
          <div className="lg:hidden mb-8">
            <button onClick={onBack} type="button" className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Back</button>
          </div>

          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
              {mode === "signup" ? "Step 01 / Create account" : "Welcome back"}
            </div>
            <h2 className="text-foreground">{mode === "signup" ? "Make it official." : "Sign in."}</h2>
          </div>

          {mode === "signup" && (
            <Field label="Full name">
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-input-background border border-border focus:border-primary outline-none px-4 py-3 text-foreground" placeholder="Ada Lovelace" />
            </Field>
          )}
          <Field label="Email">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-input-background border border-border focus:border-primary outline-none px-4 py-3 text-foreground" placeholder="you@domain.com" />
          </Field>
          <Field label="Password">
            <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-input-background border border-border focus:border-primary outline-none px-4 py-3 text-foreground" placeholder="Min 6 characters" />
          </Field>

          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-4 font-mono uppercase tracking-widest text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? "..." : mode === "signup" ? "Create account →" : "Sign in →"}
          </button>

          <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="w-full font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block">{label}</label>
      {children}
    </div>
  );
}
