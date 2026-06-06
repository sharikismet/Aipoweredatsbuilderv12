import { useEffect, useState } from "react";
import { api, getAccessToken } from "../../lib/supabase";
import { CareerDomainId, getDomain, EMPLOYMENT_TYPES } from "../../lib/careerDomains";
import { CareerTier, EducationEntry, ExperienceEntry, SubscriptionTier, TIER_LABEL } from "../../lib/tier";
import { TagInput } from "./TagInput";
import { Loader2, Pencil, Save, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

interface Resume {
  contact_info: {
    full_name?: string;
    email?: string;
    phone?: string;
    location?: string;
    headline?: string;
    extras?: Record<string, string>;
  };
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: string[];
  heldLeadershipRole?: boolean;
}

interface Props {
  profile: Profile;
  onProfileUpdate: (p: Profile) => void;
  onChangeCareer: () => void;
}

export function AccountView({ profile, onProfileUpdate, onChangeCareer }: Props) {
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const domain = getDomain(profile.career_domain);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const res = await api<{ resume: Resume | null }>("/resume", { token: token ?? undefined });
        setResume(res.resume ?? blankResume(profile));
      } catch (e: any) {
        console.error("Account: load resume failed:", e);
        toast.error(e?.message ?? "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [profile.id]);

  async function save() {
    if (!resume) return;
    setSaving(true);
    try {
      const token = await getAccessToken();
      const res = await api<{ profile: Profile; tier: CareerTier }>("/resume", {
        method: "PUT",
        token: token ?? undefined,
        body: resume,
      });
      onProfileUpdate(res.profile);
      toast.success(`Saved · re-classified as ${TIER_LABEL[res.tier]}`);
      setEditing(false);
    } catch (e: any) {
      console.error("Account save failed:", e);
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !resume) {
    return (
      <div className="py-20 flex justify-center text-muted-foreground font-mono text-xs uppercase tracking-widest">
        <Loader2 size={14} className="animate-spin mr-2" /> Loading account
      </div>
    );
  }

  const c = resume.contact_info ?? {};
  const extras = c.extras ?? {};

  return (
    <div className="py-10 space-y-px bg-border border border-border">
      {/* Header card */}
      <div className="bg-card p-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-primary mb-2">My account</div>
          <h2>{profile.full_name || "—"}</h2>
          <div className="text-muted-foreground mt-1">{profile.email}</div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="inline-flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest hover:border-foreground">
                <X size={14} /> Cancel
              </button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 font-mono text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest hover:border-primary">
              <Pencil size={14} /> Edit profile
            </button>
          )}
        </div>
      </div>

      {/* Career domain */}
      <Card label="Career field">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Domain</div>
            <div className="text-lg">{domain.label}</div>
          </div>
          <button onClick={onChangeCareer} className="font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            Change field →
          </button>
        </div>
      </Card>

      {/* Subscription */}
      <Card label="Plan & credits">
        <Grid>
          <Stat label="Subscription" value={profile.subscription_tier} />
          <Stat label="Tier classification" value={TIER_LABEL[profile.current_tier]} />
          <Stat label="Tailoring credits" value={String(profile.credits_remaining)} />
        </Grid>
      </Card>

      {/* Contact */}
      <Card label="Contact">
        <Grid>
          <FieldRow label="Full name" value={c.full_name} editing={editing} onChange={(v) => setResume({ ...resume, contact_info: { ...c, full_name: v } })} />
          <FieldRow label="Headline" value={c.headline} editing={editing} onChange={(v) => setResume({ ...resume, contact_info: { ...c, headline: v } })} />
          <FieldRow label="Email" value={c.email} editing={editing} onChange={(v) => setResume({ ...resume, contact_info: { ...c, email: v } })} />
          <FieldRow label="Phone" value={c.phone} editing={editing} onChange={(v) => setResume({ ...resume, contact_info: { ...c, phone: v } })} />
          <FieldRow label="Location" value={c.location} editing={editing} onChange={(v) => setResume({ ...resume, contact_info: { ...c, location: v } })} />
        </Grid>

        {domain.profileExtras.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">{domain.label} profile details</div>
            <Grid>
              {domain.profileExtras.map((pf) => (
                <FieldRow
                  key={pf.key}
                  label={pf.label}
                  value={extras[pf.key]}
                  editing={editing}
                  onChange={(v) => setResume({ ...resume, contact_info: { ...c, extras: { ...extras, [pf.key]: v } } })}
                />
              ))}
            </Grid>
          </div>
        )}
      </Card>

      {/* Education */}
      <Card label="Education">
        <div className="space-y-3">
          {resume.education.map((e, i) => (
            <div key={i} className="border border-border p-4 bg-background relative">
              {editing && resume.education.length > 1 && (
                <button
                  onClick={() => setResume({ ...resume, education: resume.education.filter((_, j) => j !== i) })}
                  className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <Grid>
                <FieldRow label="School" value={e.school} editing={editing} onChange={(v) => updateAt(resume.education, (arr) => setResume({ ...resume, education: arr }), i, { school: v })} />
                <FieldRow label="Degree" value={e.degree} editing={editing} onChange={(v) => updateAt(resume.education, (arr) => setResume({ ...resume, education: arr }), i, { degree: v })} />
                {editing ? (
                  <div className="space-y-2">
                    <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Status</label>
                    <select
                      value={e.status}
                      onChange={(ev) => updateAt(resume.education, (arr) => setResume({ ...resume, education: arr }), i, { status: ev.target.value as any })}
                      className="w-full bg-input-background border border-border focus:border-primary outline-none px-4 py-3 text-foreground"
                    >
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                ) : (
                  <Stat label="Status" value={e.status} />
                )}
                <FieldRow label="End year" value={e.endYear} editing={editing} onChange={(v) => updateAt(resume.education, (arr) => setResume({ ...resume, education: arr }), i, { endYear: v })} />
              </Grid>
            </div>
          ))}
          {editing && (
            <button
              onClick={() => setResume({ ...resume, education: [...resume.education, { school: "", degree: "", status: "ongoing", endYear: "" }] })}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-border py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary"
            >
              <Plus size={14} /> Add education
            </button>
          )}
        </div>
      </Card>

      {/* Experience */}
      <Card label={`${domain.experienceSectionLabel}`}>
        <div className="space-y-3">
          {resume.experience.length === 0 && (
            <div className="border border-dashed border-border p-6 text-center text-muted-foreground text-sm">
              No experience entries yet.
            </div>
          )}
          {resume.experience.map((x, i) => (
            <div key={i} className="border border-border p-4 bg-background relative">
              {editing && (
                <button
                  onClick={() => setResume({ ...resume, experience: resume.experience.filter((_, j) => j !== i) })}
                  className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <Grid>
                <FieldRow label="Company" value={x.company} editing={editing} onChange={(v) => updateAt(resume.experience, (arr) => setResume({ ...resume, experience: arr }), i, { company: v })} />
                <FieldRow label="Role" value={x.role} editing={editing} onChange={(v) => updateAt(resume.experience, (arr) => setResume({ ...resume, experience: arr }), i, { role: v })} />
                {editing ? (
                  <div className="space-y-2">
                    <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Employment type</label>
                    <select
                      value={x.employmentType ?? "full_time"}
                      onChange={(ev) => updateAt(resume.experience, (arr) => setResume({ ...resume, experience: arr }), i, { employmentType: ev.target.value })}
                      className="w-full bg-input-background border border-border focus:border-primary outline-none px-4 py-3 text-foreground"
                    >
                      {EMPLOYMENT_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <Stat label="Type" value={EMPLOYMENT_TYPES.find((t) => t.id === (x.employmentType ?? "full_time"))?.label ?? "Full-time"} />
                )}
                <Stat label="Dates" value={`${x.startYear || "?"} – ${x.current ? "Present" : (x.endYear || "?")}`} />
              </Grid>

              {domain.experienceMeta.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{domain.label} details</div>
                  <Grid>
                    {domain.experienceMeta.map((mf) => (
                      <FieldRow
                        key={mf.key}
                        label={mf.label}
                        value={x.meta?.[mf.key]}
                        editing={editing}
                        onChange={(v) => updateAt(resume.experience, (arr) => setResume({ ...resume, experience: arr }), i, { meta: { ...(x.meta ?? {}), [mf.key]: v } })}
                      />
                    ))}
                  </Grid>
                </div>
              )}

              <div className="mt-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Achievements</div>
                {editing ? (
                  <textarea
                    value={x.bullets.join("\n")}
                    onChange={(ev) => updateAt(resume.experience, (arr) => setResume({ ...resume, experience: arr }), i, { bullets: ev.target.value.split("\n") })}
                    rows={4}
                    className="w-full bg-input-background border border-border focus:border-primary outline-none px-4 py-3 text-foreground resize-none"
                  />
                ) : (
                  <ul className="space-y-1 list-disc pl-5 text-sm">
                    {x.bullets.filter(Boolean).map((b, bi) => <li key={bi}>{b}</li>)}
                    {x.bullets.filter(Boolean).length === 0 && <li className="list-none text-muted-foreground">No achievements listed.</li>}
                  </ul>
                )}
              </div>
            </div>
          ))}
          {editing && (
            <button
              onClick={() => setResume({ ...resume, experience: [...resume.experience, { company: "", role: "", startYear: "", endYear: "", bullets: [""], employmentType: "full_time", meta: {} }] })}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-border py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary"
            >
              <Plus size={14} /> Add experience
            </button>
          )}
        </div>

        {editing && (
          <div className="mt-6 flex items-center gap-3 p-4 border border-border bg-background">
            <input
              type="checkbox"
              id="acc-exec-lead"
              checked={!!resume.heldLeadershipRole}
              onChange={(e) => setResume({ ...resume, heldLeadershipRole: e.target.checked })}
              className="accent-primary"
            />
            <label htmlFor="acc-exec-lead" className="cursor-pointer">I've held a Director / VP / C-suite leadership role</label>
          </div>
        )}
      </Card>

      {/* Skills */}
      <Card label="Skills">
        {editing ? (
          <TagInput value={resume.skills} onChange={(s) => setResume({ ...resume, skills: s })} placeholder="Add a skill" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {resume.skills.length === 0 && <span className="text-muted-foreground text-sm">No skills listed.</span>}
            {resume.skills.map((s) => (
              <span key={s} className="font-mono text-[10px] uppercase tracking-widest border border-border px-2 py-1">{s}</span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function blankResume(p: Profile): Resume {
  return {
    contact_info: { full_name: p.full_name, email: p.email, extras: {} },
    education: [{ school: "", degree: "", status: "ongoing", endYear: "" }],
    experience: [],
    skills: [],
  };
}

function updateAt<T>(arr: T[], set: (n: T[]) => void, i: number, patch: Partial<T>) {
  const next = arr.slice();
  next[i] = { ...next[i], ...patch };
  set(next);
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="bg-card p-6">
      <div className="font-mono text-xs uppercase tracking-widest text-primary mb-4">{label}</div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div>{value || "—"}</div>
    </div>
  );
}

function FieldRow({ label, value, editing, onChange }: { label: string; value?: string; editing: boolean; onChange: (v: string) => void }) {
  if (editing) {
    return (
      <div className="space-y-2">
        <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-input-background border border-border focus:border-primary outline-none px-4 py-3 text-foreground"
        />
      </div>
    );
  }
  return <Stat label={label} value={value ?? ""} />;
}
