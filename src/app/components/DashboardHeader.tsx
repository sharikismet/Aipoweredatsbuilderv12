import { TIER_LABEL, TIER_BLURB, SUBSCRIPTION_LABEL, CareerTier, SubscriptionTier } from "../../lib/tier";
import { getDomain, CareerDomainId } from "../../lib/careerDomains";
import { LogOut } from "lucide-react";

interface Props {
  fullName: string;
  email: string;
  tier: CareerTier;
  subscription: SubscriptionTier;
  creditsRemaining: number;
  domainId: CareerDomainId | null;
  onSignOut: () => void;
  onUpgrade: () => void;
  onOpenAccount: () => void;
}

export function DashboardHeader({ fullName, email, tier, subscription, creditsRemaining, domainId, onSignOut, onUpgrade, onOpenAccount }: Props) {
  const domain = getDomain(domainId);
  const DomainIcon = domain.icon;
  return (
    <header className="border-b border-border bg-background sticky top-0 z-30 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-6">
        <div className="font-mono text-xs uppercase tracking-widest">
          <span className="text-primary">●</span> ATS Engine
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-2 border border-border px-3 py-1.5">
            <DomainIcon size={12} className="text-primary" />
            <span className="font-mono text-xs uppercase tracking-widest">{domain.label}</span>
          </div>

          <div className="flex items-center gap-2 border border-primary px-3 py-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tier</span>
            <span className="font-mono text-xs uppercase tracking-widest text-primary">{TIER_LABEL[tier]}</span>
          </div>

          <button onClick={onUpgrade} className="flex items-center gap-2 border border-border px-3 py-1.5 hover:border-primary transition-colors">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Plan</span>
            <span className="font-mono text-xs uppercase tracking-widest">{SUBSCRIPTION_LABEL[subscription]}</span>
            {subscription !== "aggressive" && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">· {creditsRemaining} credits</span>
            )}
          </button>

          <div className="hidden md:flex items-center gap-3 pl-3 border-l border-border">
            <button onClick={onOpenAccount} className="text-right group" aria-label="Open my account">
              <div className="text-sm leading-tight group-hover:text-primary transition-colors">{fullName || "—"}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground group-hover:text-foreground">{email} · my account</div>
            </button>
            <button onClick={onSignOut} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{TIER_BLURB[tier]}</p>
      </div>
    </header>
  );
}
