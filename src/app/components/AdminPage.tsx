import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Users, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { api, getAccessToken } from "../../lib/supabase";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  current_tier: string;
  subscription_tier: string;
  credits_remaining: number;
  career_domain: string | null;
  custom_career_label?: string | null;
  onboarded: boolean;
  created_at: string;
}

interface UserDetail {
  profile: any;
  resume: any;
  tailored: any[];
}

interface Props {
  onBack: () => void;
}

export function AdminPage({ onBack }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await api<{ users: AdminUser[] }>("/admin/users", { token: token ?? undefined });
        setUsers(res.users);
      } catch (e: any) {
        console.error("admin users load failed:", e);
        toast.error(e?.message ?? "Failed to load users");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function openUser(id: string) {
    setSelectedId(id);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const token = await getAccessToken();
      const res = await api<UserDetail>(`/admin/users/${id}`, { token: token ?? undefined });
      setDetail(res);
    } catch (e: any) {
      console.error("admin user detail failed:", e);
      toast.error(e?.message ?? "Failed to load user");
    } finally {
      setLoadingDetail(false);
    }
  }

  const filtered = users.filter((u) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (u.full_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Back to dashboard
          </button>
          <div className="font-mono text-xs uppercase tracking-widest text-primary">Admin · Users</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">All registered users</div>
              <h2 className="flex items-center gap-2"><Users size={20} className="text-primary" /> {users.length}</h2>
            </div>
          </div>

          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by name or email"
              className="w-full bg-card border border-border pl-9 pr-3 py-2 font-mono text-xs focus:outline-none focus:border-primary"
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs uppercase tracking-widest py-10">
              <Loader2 size={14} className="animate-spin" /> Loading users
            </div>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
              No users match.
            </div>
          ) : (
            <div className="space-y-px bg-border border border-border max-h-[70vh] overflow-y-auto">
              {filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openUser(u.id)}
                  className={`w-full text-left bg-card p-4 hover:bg-accent transition-colors ${selectedId === u.id ? "border-l-2 border-primary" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="truncate">{u.full_name || "(no name)"}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">{u.subscription_tier}</div>
                  </div>
                  <div className="text-muted-foreground text-xs truncate">{u.email}</div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] uppercase tracking-widest border border-border px-2 py-0.5">{u.current_tier}</span>
                    {u.career_domain && (
                      <span className="font-mono text-[10px] uppercase tracking-widest border border-border px-2 py-0.5">{u.career_domain}</span>
                    )}
                    {!u.onboarded && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-destructive">unfinished</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7">
          {!selectedId && (
            <div className="border border-dashed border-border p-12 text-center text-muted-foreground">
              <FileText size={32} className="mx-auto mb-4" />
              Select a user to see their full profile, resume and tailored CVs.
            </div>
          )}
          {selectedId && loadingDetail && (
            <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs uppercase tracking-widest py-10">
              <Loader2 size={14} className="animate-spin" /> Loading user
            </div>
          )}
          {selectedId && detail && (
            <div className="space-y-px bg-border border border-border">
              <Section title="Profile">
                <KV data={detail.profile} />
              </Section>
              <Section title="Resume / contact">
                {detail.resume ? (
                  <>
                    <KV data={detail.resume.contact_info ?? {}} />
                    <div className="mt-4">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Skills</div>
                      <div className="flex flex-wrap gap-2">
                        {(detail.resume.skills ?? []).map((s: string) => (
                          <span key={s} className="font-mono text-[10px] uppercase tracking-widest border border-border px-2 py-1">{s}</span>
                        ))}
                        {(detail.resume.skills ?? []).length === 0 && <span className="text-muted-foreground text-sm">—</span>}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-sm">No resume submitted.</div>
                )}
              </Section>

              <Section title="Experience">
                {detail.resume?.experience?.length ? (
                  <div className="space-y-3">
                    {detail.resume.experience.map((x: any, i: number) => (
                      <div key={i} className="border border-border p-3 bg-background">
                        <div className="font-medium">{x.role} · {x.company}</div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                          {x.startYear} – {x.current ? "Present" : x.endYear}
                        </div>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {(x.bullets ?? []).filter(Boolean).map((b: string, bi: number) => <li key={bi}>{b}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">No experience entries.</div>
                )}
              </Section>

              <Section title="Education">
                {detail.resume?.education?.length ? (
                  <ul className="space-y-2 text-sm">
                    {detail.resume.education.map((e: any, i: number) => (
                      <li key={i}>
                        <span className="font-medium">{e.degree || "—"}</span>
                        {e.school ? <> · {e.school}</> : null}
                        <span className="text-muted-foreground"> ({e.status}{e.endYear ? `, ${e.endYear}` : ""})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground text-sm">No education entries.</div>
                )}
              </Section>

              <Section title={`Tailored CVs (${detail.tailored?.length ?? 0})`}>
                {detail.tailored?.length ? (
                  <div className="space-y-2">
                    {detail.tailored.map((t: any) => (
                      <div key={t.id} className="border border-border p-3 bg-background">
                        <div className="flex items-baseline justify-between gap-2 flex-wrap">
                          <div className="font-medium">{t.job_title} · <span className="text-muted-foreground font-normal">{t.company}</span></div>
                          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            {new Date(t.created_at).toLocaleDateString()} · {t.generated_by}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">No tailored CVs.</div>
                )}
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card p-5">
      <div className="font-mono text-xs uppercase tracking-widest text-primary mb-3">{title}</div>
      {children}
    </section>
  );
}

function KV({ data }: { data: Record<string, any> }) {
  const entries = Object.entries(data ?? {}).filter(([k]) => k !== "extras");
  const extras = data?.extras ?? null;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {entries.map(([k, v]) => (
        <div key={k}>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{k}</div>
          <div className="text-sm break-words">{formatValue(v)}</div>
        </div>
      ))}
      {extras && Object.keys(extras).length > 0 && (
        <div className="sm:col-span-2 pt-3 border-t border-border">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">Domain extras</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(extras).map(([k, v]) => (
              <div key={k}>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{k}</div>
                <div className="text-sm break-words">{formatValue(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatValue(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
