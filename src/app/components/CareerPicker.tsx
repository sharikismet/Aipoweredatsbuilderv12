import { useState } from "react";
import { CAREER_DOMAINS, CareerDomainId } from "../../lib/careerDomains";
import { api, getAccessToken } from "../../lib/supabase";
import { Loader2, ArrowRight, LogOut } from "lucide-react";
import { toast } from "sonner";

interface Props {
  initial?: CareerDomainId | null;
  initialCustomLabel?: string | null;
  onComplete: (domain: CareerDomainId) => void;
  onBack: () => void;
  backLabel?: string;
}

export function CareerPicker({ initial, initialCustomLabel, onComplete, onBack, backLabel = "← Back" }: Props) {
  const [selected, setSelected] = useState<CareerDomainId | null>(initial ?? null);
  const [customLabel, setCustomLabel] = useState(initialCustomLabel ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!selected) return;
    if (selected === "other" && !customLabel.trim()) {
      toast.error("Tell us what your career is so we can add it as an option later.");
      return;
    }
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not signed in");
      await api("/career", {
        method: "PUT",
        token,
        body: {
          career_domain: selected,
          custom_career_label: selected === "other" ? customLabel.trim() : null,
        },
      });
      onComplete(selected);
    } catch (e: any) {
      console.error("Career save failed:", e);
      toast.error(e?.message ?? "Failed to save career");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            {backLabel.startsWith("Sign out") && <LogOut size={12} />}
            {backLabel}
          </button>
        </div>

        <div className="mb-10">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Step 00 · Pick your field
          </div>
          <h1 className="max-w-3xl">What kind of career are you building?</h1>
          <p className="text-muted-foreground mt-4 max-w-2xl">
            Your domain shapes the onboarding form, the skills we suggest, and the structure of every CV we generate for you. Pick the one that fits best — you can change it later.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border mb-6">
          {CAREER_DOMAINS.map((d) => {
            const Icon = d.icon;
            const active = selected === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelected(d.id)}
                className={`text-left p-6 transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-card/70"
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <Icon size={28} className={active ? "" : "text-primary"} />
                  <span className={`font-mono text-[10px] uppercase tracking-widest ${active ? "opacity-80" : "text-muted-foreground"}`}>
                    {active ? "Selected" : "Choose"}
                  </span>
                </div>
                <div className="mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", lineHeight: 1.1, fontWeight: 900 }}>
                  {d.label}
                </div>
                <p className={`text-sm ${active ? "" : "text-muted-foreground"}`}>{d.blurb}</p>
              </button>
            );
          })}
        </div>

        {selected === "other" && (
          <div className="border border-primary bg-card p-6 mb-6">
            <div className="font-mono text-xs uppercase tracking-widest text-primary mb-3">Tell us your career</div>
            <p className="text-sm text-muted-foreground mb-4">
              We'll log this so we can add it as a proper option in a future update. Be specific — "Logistics manager", "Marine biologist", "Civil engineer".
            </p>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="What's your career?"
              className="w-full bg-input-background border border-border focus:border-primary outline-none px-4 py-3 text-foreground"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {selected ? `→ ${CAREER_DOMAINS.find((d) => d.id === selected)?.label}` : "Select a field to continue"}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!selected || saving}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 font-mono uppercase tracking-widest text-sm hover:opacity-90 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
