import { SubscriptionTier } from "../../lib/tier";
import { Check } from "lucide-react";

interface Plan {
  id: SubscriptionTier;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  highlight?: boolean;
}

const PLANS: Plan[] = [
  { id: "free", name: "Free", price: 0, tagline: "For trying it out.", features: ["Build 1 master CV", "Manual PDF export", "Browse matched jobs"] },
  { id: "job_hunter", name: "Job Hunter Pass", price: 14, tagline: "For active applicants.", features: ["Everything in Free", "Daily job-match alerts", "10 automated tailored CVs / mo", "ATS keyword optimization"], highlight: true },
  { id: "aggressive", name: "Aggressive Campaigner", price: 29, tagline: "For full-court press.", features: ["Everything in Job Hunter", "Unlimited tailored CVs", "Priority vector matching", "Auto cover letter for every match"] },
];

interface Props {
  currentPlan: SubscriptionTier;
  onSelect: (plan: SubscriptionTier) => void;
  loading?: SubscriptionTier | null;
}

export function PricingCards({ currentPlan, onSelect, loading }: Props) {
  return (
    <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
      {PLANS.map((plan) => {
        const active = plan.id === currentPlan;
        return (
          <div key={plan.id} className={`p-8 flex flex-col ${plan.highlight ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"}`}>
            <div className="font-mono text-xs uppercase tracking-widest mb-3 opacity-70">{plan.highlight ? "Most Popular" : " "}</div>
            <div className="mb-1"><span className="font-mono text-xs uppercase tracking-widest">{plan.name}</span></div>
            <div className="flex items-baseline gap-1 mb-2">
              <span style={{ fontFamily: "var(--font-display)", fontSize: "3.5rem", lineHeight: 0.9, fontWeight: 900 }}>${plan.price}</span>
              <span className="font-mono text-xs uppercase tracking-widest opacity-70">/ mo</span>
            </div>
            <p className={`mb-6 ${plan.highlight ? "" : "text-muted-foreground"}`}>{plan.tagline}</p>
            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={16} className="mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => onSelect(plan.id)}
              disabled={active || loading === plan.id}
              className={`w-full py-4 font-mono uppercase tracking-widest text-sm transition-opacity disabled:opacity-50 ${
                plan.highlight ? "bg-primary-foreground text-primary hover:opacity-90" : active ? "border border-primary text-primary" : "border border-border text-foreground hover:border-primary"
              }`}
            >
              {loading === plan.id ? "..." : active ? "Current plan" : plan.price === 0 ? "Downgrade" : "Choose plan"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
