import { useState } from "react";
import { api, getAccessToken } from "../../lib/supabase";
import { TagInput } from "./TagInput";
import { EducationEntry, ExperienceEntry, TIER_LABEL } from "../../lib/tier";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  initialName?: string;
  initialEmail?: string;
  onComplete: () => void;
}

const STEPS = ["Contact", "Education", "Experience", "Skills"] as const;

export function OnboardingForm({ initialName, initialEmail, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [contact, setContact] = useState({
    full_name: initialName ?? "",
    email: initialEmail ?? "",
    phone: "",
    location: "",
    headline: "",
  });
  const [education, setEducation] = useState<EducationEntry[]>([{ school: "", degree: "", status: "ongoing", endYear: "" }]);
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [heldLeadership, setHeldLeadership] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not signed in");
      const res = await api<{ tier: keyof typeof TIER_LABEL }>("/resume", {
        method: "PUT",
        token,
        body: { contact_info: contact, education, experience, skills, heldLeadershipRole: heldLeadership },
      });
      toast.success(`Classified as ${TIER_LABEL[res.tier]}`);
      onComplete();
    } catch (e: any) {
      console.error("Onboarding save failed:", e);
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else save();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-12">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Onboarding · Step {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
          </div>
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1 ${i <= step ? "bg-primary" : "bg-border"} transition-colors`} />
                <div className={`mt-2 font-mono text-[10px] uppercase tracking-widest ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        {step === 0 && (
          <Section title="Who are you?" subtitle="Basic contact details for the header of your CV.">
            <Grid>
              <Field label="Full name"><Input value={contact.full_name} onChange={(v) => setContact({ ...contact, full_name: v })} /></Field>
              <Field label="Headline"><Input value={contact.headline} onChange={(v) => setContact({ ...contact, headline: v })} placeholder="e.g. Backend engineer, distributed systems" /></Field>
              <Field label="Email"><Input type="email" value={contact.email} onChange={(v) => setContact({ ...contact, email: v })} /></Field>
              <Field label="Phone"><Input value={contact.phone} onChange={(v) => setContact({ ...contact, phone: v })} /></Field>
              <Field label="Location"><Input value={contact.location} onChange={(v) => setContact({ ...contact, location: v })} placeholder="City, Country" /></Field>
            </Grid>
          </Section>
        )}

        {step === 1 && (
          <Section title="Where did you study?" subtitle="Add every degree. Ongoing degrees count.">
            {education.map((e, i) => (
              <RowCard key={i} onRemove={education.length > 1 ? () => setEducation(education.filter((_, j) => j !== i)) : undefined}>
                <Grid>
                  <Field label="School"><Input value={e.school} onChange={(v) => updateAt(education, setEducation, i, { school: v })} /></Field>
                  <Field label="Degree"><Input value={e.degree} onChange={(v) => updateAt(education, setEducation, i, { degree: v })} placeholder="BSc Computer Science" /></Field>
                  <Field label="Status">
                    <select value={e.status} onChange={(ev) => updateAt(education, setEducation, i, { status: ev.target.value as any })} className="w-full bg-input-background border border-border focus:border-primary outline-none px-4 py-3 text-foreground">
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </Field>
                  <Field label="End year"><Input value={e.endYear ?? ""} onChange={(v) => updateAt(education, setEducation, i, { endYear: v })} placeholder="2028" /></Field>
                </Grid>
              </RowCard>
            ))}
            <AddButton onClick={() => setEducation([...education, { school: "", degree: "", status: "ongoing", endYear: "" }])}>Add education</AddButton>
          </Section>
        )}

        {step === 2 && (
          <Section title="Where have you worked?" subtitle="Skip this if you're just starting out — we'll classify you as Fresh Grad.">
            {experience.length === 0 && (
              <div className="border border-dashed border-border p-8 text-center">
                <p className="text-muted-foreground mb-4">No experience yet — that's fine. Add one if you have any.</p>
              </div>
            )}
            {experience.map((x, i) => (
              <RowCard key={i} onRemove={() => setExperience(experience.filter((_, j) => j !== i))}>
                <Grid>
                  <Field label="Company"><Input value={x.company} onChange={(v) => updateAt(experience, setExperience, i, { company: v })} /></Field>
                  <Field label="Role"><Input value={x.role} onChange={(v) => updateAt(experience, setExperience, i, { role: v })} /></Field>
                  <Field label="Start year"><Input value={x.startYear} onChange={(v) => updateAt(experience, setExperience, i, { startYear: v })} placeholder="2022" /></Field>
                  <Field label="End year">
                    <Input value={x.current ? "Present" : (x.endYear ?? "")} onChange={(v) => updateAt(experience, setExperience, i, { endYear: v, current: false })} placeholder="2024 or leave empty" disabled={x.current} />
                  </Field>
                </Grid>
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <input type="checkbox" id={`current-${i}`} checked={!!x.current} onChange={(ev) => updateAt(experience, setExperience, i, { current: ev.target.checked, endYear: ev.target.checked ? "" : x.endYear })} className="accent-primary" />
                  <label htmlFor={`current-${i}`} className="cursor-pointer">Currently working here</label>
                  <input type="checkbox" id={`lead-${i}`} checked={!!x.isLeadership} onChange={(ev) => updateAt(experience, setExperience, i, { isLeadership: ev.target.checked })} className="ml-6 accent-primary" />
                  <label htmlFor={`lead-${i}`} className="cursor-pointer">Leadership role</label>
                </div>
                <Field label="Achievements (one per line)">
                  <textarea value={x.bullets.join("\n")} onChange={(ev) => updateAt(experience, setExperience, i, { bullets: ev.target.value.split("\n") })} rows={4} className="w-full bg-input-background border border-border focus:border-primary outline-none px-4 py-3 text-foreground resize-none" placeholder={"Shipped X, reducing Y by Z%\nLed a team of N engineers"} />
                </Field>
              </RowCard>
            ))}
            <AddButton onClick={() => setExperience([...experience, { company: "", role: "", startYear: "", endYear: "", bullets: [""] }])}>Add experience</AddButton>

            <div className="mt-8 flex items-center gap-3 p-4 border border-border bg-card">
              <input type="checkbox" id="exec-lead" checked={heldLeadership} onChange={(e) => setHeldLeadership(e.target.checked)} className="accent-primary" />
              <label htmlFor="exec-lead" className="cursor-pointer">I've held a Director / VP / C-suite leadership role</label>
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section title="Your core skills" subtitle="Type a skill, press Enter. These power our job matching.">
            <TagInput value={skills} onChange={setSkills} placeholder="e.g. react, typescript, system design" />
            {skills.length > 0 && (
              <div className="mt-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {skills.length} skill{skills.length === 1 ? "" : "s"} added
              </div>
            )}
          </Section>
        )}

        <div className="mt-12 flex items-center justify-between gap-4">
          <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-30">← Back</button>
          <button type="button" onClick={next} disabled={saving} className="bg-primary text-primary-foreground px-8 py-4 font-mono uppercase tracking-widest text-sm hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving..." : step === STEPS.length - 1 ? "Finish & Classify →" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function updateAt<T>(arr: T[], set: (n: T[]) => void, i: number, patch: Partial<T>) {
  const next = arr.slice();
  next[i] = { ...next[i], ...patch };
  set(next);
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-foreground">{title}</h2>
        {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block">{label}</label>
      {children}
    </div>
  );
}

function Input(props: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean }) {
  return (
    <input
      type={props.type ?? "text"}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      disabled={props.disabled}
      className="w-full bg-input-background border border-border focus:border-primary outline-none px-4 py-3 text-foreground disabled:opacity-50"
    />
  );
}

function RowCard({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <div className="relative border border-border p-5 bg-card">
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-destructive" aria-label="Remove">
          <Trash2 size={16} />
        </button>
      )}
      {children}
    </div>
  );
}

function AddButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center justify-center gap-2 border border-dashed border-border py-4 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary">
      <Plus size={14} /> {children}
    </button>
  );
}
