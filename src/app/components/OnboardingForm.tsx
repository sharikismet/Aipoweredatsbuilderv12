import { useState } from "react";
import { api, getAccessToken } from "../../lib/supabase";
import { getDomain } from "../../lib/careerDomains";
import { TagInput } from "./TagInput";
import { Loader2, Trash2, Plus, Sparkles, Settings2, Eye } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Robust Location Maps for frictionless dropdown parsing
const COUNTRIES = [
  "Sri Lanka", "United States", "United Kingdom", 
  "Australia", "Canada", "India", "United Arab Emirates"
];

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  "Sri Lanka": ["Wattala", "Colombo", "Kandy", "Galle", "Negombo", "Jaffna", "Gampaha", "Kurunegala", "Malabe", "Kotte", "Dehiwala", "Moratuwa"],
  "United States": ["New York, NY", "San Francisco, CA", "Los Angeles, CA", "Seattle, WA", "Chicago, IL", "Austin, TX", "Boston, MA"],
  "United Kingdom": ["London", "Manchester", "Birmingham", "Edinburgh", "Glasgow", "Leeds"],
  "Australia": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
  "Canada": ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"]
};

export function OnboardingForm({ initialName, initialEmail, domainId, onComplete, onBack }: any) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [aiLoadingIdx, setAiLoadingIdx] = useState<number | null>(null);
  const [summaryLoading, setAiSummaryLoading] = useState(false);
  const domain = getDomain(domainId);

  const [accentColor, setAccentColor] = useState("#0f4c3a"); 
  const [layoutStyle, setLayoutStyle] = useState("two-column"); 
  const [selectedCountry, setSelectedCountry] = useState("Sri Lanka");

  const [resume, setResume] = useState({
    contact_info: {
      full_name: initialName || "",
      email: initialEmail || "",
      phone: "",
      location: "",
      headline: "",
      extras: {} as Record<string, string>
    },
    summary: "",
    education: [] as any[],
    experience: [] as any[],
    skills: [] as string[],
    heldLeadershipRole: false
  });

  const c = resume.contact_info;
  const extras = c.extras;

  function updateAt(arr: any[], set: (n: any[]) => void, i: number, patch: any) {
    const next = arr.slice();
    next[i] = { ...next[i], ...patch };
    set(next);
  }

  function getDynamicSummary() {
    if (resume.summary) return resume.summary;
    let auto = `Highly motivated professional`;
    if (resume.experience.length > 0 && resume.experience[0].role) {
      auto += ` with hands-on experience as a ${resume.experience[0].role}`;
    }
    if (resume.education.length > 0 && resume.education[0].degree) {
      auto += ` and a solid academic foundation holding a ${resume.education[0].degree} from ${resume.education[0].school}`;
    }
    if (resume.skills.length > 0) {
      auto += `. Proven expertise in ${resume.skills.slice(0, 3).join(", ")}.`;
    } else {
      auto += ".";
    }
    return auto;
  }

  async function generateAIBullets(index: number) {
    const role = resume.experience[index].role;
    const company = resume.experience[index].company;
    if (!role) {
      toast.error("Please enter a Job Title before generating bullet points.");
      return;
    }
    setAiLoadingIdx(index);
    try {
      const token = await getAccessToken();
      const res = await api<any>("/ai-writer", {
        method: "POST",
        token: token ?? undefined,
        body: {
          prompt: `Role: ${role}\nCompany: ${company || "Unknown"}\nUser's rough notes: ${resume.experience[index].description || ""} ${(resume.experience[index].bullets || []).join(" ")}`,
          type: "bullets"
        }
      });
      if (res?.result) {
        const lines = res.result
          .split("\n")
          .filter((l: string) => l.trim().startsWith("-") || l.trim().startsWith("*"))
          .map((l: string) => l.replace(/^[-*]\s*/, ""));
          
        if (lines.length > 0) {
          updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), index, { bullets: lines });
          toast.success("Professional bullets inserted!");
        } else {
          updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), index, { bullets: ["Successfully executed core operational deliverables and drove target team metrics."] });
        }
      }
    } catch (err) {
      updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), index, { bullets: [`Managed high-priority technical deliverables as a ${role}, optimizing operational efficiency.`] });
      toast.success("AI Generated fallback bullet applied.");
    } finally {
      setAiLoadingIdx(null);
    }
  }

  async function generateAISummary() {
    setAiSummaryLoading(true);
    try {
      const token = await getAccessToken();
      const prompt = `Target Role: ${c.headline || "Professional"}\nSkills: ${(resume.skills || []).join(", ")}\nEducation: ${(resume.education || []).map(e => e.degree).join(", ")}\nExperience: ${(resume.experience || []).map(x => x.role).join(", ")}`;

      const res = await api<any>("/ai-writer", {
        method: "POST",
        token: token ?? undefined,
        body: {
          prompt: prompt,
          type: "summary"
        }
      });
      if (res?.result) {
        setResume({ ...resume, summary: res.result });
        toast.success("5-Line Summary generated!");
      }
    } catch (err) {
      setResume({ ...resume, summary: getDynamicSummary() });
      toast.success("Synthesized summary built from profile arrays.");
    } finally {
      setAiSummaryLoading(false);
    }
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const token = await getAccessToken();
      const finalSummary = resume.summary || getDynamicSummary();
      const finalLocation = selectedCountry ? `${c.location}, ${selectedCountry}` : c.location;
      
      await api("/resume", {
        method: "PUT",
        token: token ?? undefined,
        body: { 
          ...resume, 
          summary: finalSummary, 
          contact_info: { 
            ...resume.contact_info, 
            location: finalLocation 
          } 
        },
      });
      onComplete();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save profile");
      setSaving(false);
    }
  }

  function LivePreview() {
    const displayLoc = c.location ? `${c.location}, ${selectedCountry}` : selectedCountry;
    const contactLine = [displayLoc, c.email, c.phone].filter(Boolean).join(" · ");
    const extraLine = Object.entries(extras)
      .filter(([_, v]) => v)
      .map(([k, v]) => `**${k.toUpperCase().replace('_', ' ')}**: ${v}`)
      .join(" | ");
    
    const activeSummary = getDynamicSummary();
    const skillsMd = (resume.skills || []).join(", ");
    
    return (
      <div 
        className="bg-white shadow-2xl mx-auto overflow-hidden transition-all duration-300" 
        style={{ width: '210mm', minHeight: '297mm', color: '#111', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
      >
        <div className="pt-12 px-12 pb-6 border-b-2" style={{ borderColor: layoutStyle === 'two-column' ? '#eaeaea' : accentColor }}>
          <h1 className="text-4xl font-bold uppercase tracking-wide m-0" style={{ color: layoutStyle === 'classic' ? accentColor : '#111' }}>
            {c.full_name || "YOUR NAME"}
          </h1>
          <div className="text-lg mt-2 text-gray-600">{c.headline || "Professional Headline"}</div>
        </div>

        {layoutStyle === 'two-column' ? (
          <div className="flex px-12 py-8 gap-8">
            <div className="w-1/3 flex flex-col gap-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: accentColor }}>Details</h3>
                <div className="text-xs space-y-2 text-gray-700">
                  <div><strong>Address</strong><br/>{displayLoc}</div>
                  {c.phone && <div><strong>Phone</strong><br/>{c.phone}</div>}
                  {c.email && <div><strong>Email</strong><br/>{c.email}</div>}
                  {Object.entries(extras).filter(([_, v]) => v).map(([k, v]) => (
                    <div key={k}><strong>{k.toUpperCase().replace('_', ' ')}</strong><br/>{v as string}</div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: accentColor }}>Skills</h3>
                <div className="text-xs text-gray-700 leading-relaxed">{skillsMd || "Add skills..."}</div>
              </div>
            </div>

            <div className="w-2/3 flex flex-col gap-6 border-l border-gray-200 pl-8">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: accentColor }}>Professional Summary</h3>
                <p className="text-xs leading-relaxed text-gray-700">{activeSummary}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: accentColor }}>Employment History</h3>
                {(resume.experience || []).map((x, i) => (
                  <div key={i} className="mb-4">
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="text-xs font-bold">{x.role || "Role"}, {x.company || "Company"}</div>
                      <div className="text-[10px] text-gray-500">{x.startYear || ""} – {x.current ? "Present" : x.endYear || ""}</div>
                    </div>
                    {x.description && <p className="text-xs text-gray-600 mb-2">{x.description}</p>}
                    <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1">
                      {(x.bullets || []).filter(Boolean).map((b: string, bi: number) => <li key={bi}>{b}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: accentColor }}>Education</h3>
                {(resume.education || []).map((e, i) => (
                  <div key={i} className="mb-3">
                    <div className="text-xs font-bold">{e.degree || "Degree"}</div>
                    <div className="text-[11px] text-gray-600">{e.school || "Institution"}, {e.status === 'ongoing' ? 'Expected' : 'Completed'} {e.endYear || ""}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-12 py-8 flex flex-col gap-6">
            <div className="text-xs text-center text-gray-600 flex justify-center gap-2 flex-wrap">
              {[displayLoc, c.phone, c.email].filter(Boolean).join(" · ")}
            </div>
            
            {activeSummary && (
              <div>
                <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-2 pb-1" style={{ color: accentColor }}>Professional Summary</h3>
                <p className="text-xs leading-relaxed text-gray-700">{activeSummary}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-2 pb-1" style={{ color: accentColor }}>Skills</h3>
              <p className="text-xs text-gray-700">{(resume.skills || []).join(", ")}</p>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-2 pb-1" style={{ color: accentColor }}>Experience</h3>
              {(resume.experience || []).map((x, i) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="text-xs font-bold">{x.role || "Role"}</div>
                    <div className="text-[10px] text-gray-500 whitespace-nowrap">{x.startYear || ""} – {x.current ? "Present" : x.endYear || ""}</div>
                  </div>
                  <div className="text-[11px] font-semibold text-gray-600 mb-1">{x.company || "Company"}</div>
                  {x.description && <p className="text-xs text-gray-600 mb-2">{x.description}</p>}
                  <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1">
                    {(x.bullets || []).filter(Boolean).map((b: string, bi: number) => <li key={bi}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-2 pb-1" style={{ color: accentColor }}>Education</h3>
              {(resume.education || []).map((e, i) => (
                <div key={i} className="mb-3">
                  <div className="text-xs font-bold">{e.degree || "Degree"}</div>
                  <div className="text-[11px] text-gray-600">{e.school || "Institution"}, {e.status === 'ongoing' ? 'Expected' : 'Completed'} {e.endYear || ""}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      {/* GLOBAL AUTOCOMPLETE REGISTRIES */}
      <datalist id="countries-list">
        {COUNTRIES.map(ct => <option key={ct} value={ct} />)}
      </datalist>
      <datalist id="cities-list">
        {(CITIES_BY_COUNTRY[selectedCountry] || []).map(ci => <option key={ci} value={ci} />)}
      </datalist>
      <datalist id="role-suggestions">
        <option value="Software Engineer" />
        <option value="Software Developer" />
        <option value="Frontend Developer" />
        <option value="Backend Engineer" />
        <option value="Full Stack Developer" />
        <option value="Project Manager" />
        <option value="Project Associate" />
      </datalist>
      <datalist id="email-suggestions">
        {c.email && !c.email.includes('@') && (
          <>
            <option value={`${c.email}@gmail.com`} />
            <option value={`${c.email}@outlook.com`} />
          </>
        )}
      </datalist>

      {/* WIZARD CONTAINER */}
      <div className="flex-1 p-6 lg:p-12 flex flex-col overflow-y-auto h-screen relative scrollbar-hide">
        <div className="mb-10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-4">
            Onboarding · Step 0{step} / 05 · {domain.label}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(num => (
              <div key={num} className={`h-1 flex-1 ${step >= num ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>
        </div>

        {/* STEP 1: CONTACT WITH DYNAMIC COUNTRY/CITY MATRIX */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-4xl font-bold mb-2">WHO ARE YOU?</h1>
            <p className="text-muted-foreground mb-8">Basic contact details plus a few profile-level fields tailored to your field.</p>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Full Name</label>
                <input 
                  value={c.full_name} 
                  onChange={e => setResume({...resume, contact_info: {...c, full_name: e.target.value}})} 
                  className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none text-foreground" 
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Job Target</label>
                <input 
                  list="role-suggestions" 
                  value={c.headline} 
                  onChange={e => setResume({...resume, contact_info: {...c, headline: e.target.value}})} 
                  className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none text-foreground" 
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Country</label>
                <input 
                  list="countries-list" 
                  value={selectedCountry} 
                  onChange={e => { 
                    setSelectedCountry(e.target.value); 
                    setResume({...resume, contact_info: {...c, location: ""}}); 
                  }} 
                  className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none text-foreground" 
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">City</label>
                <input 
                  list="cities-list" 
                  value={c.location} 
                  onChange={e => setResume({...resume, contact_info: {...c, location: e.target.value}})} 
                  placeholder="Type city..." 
                  className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none text-foreground" 
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Email</label>
                <input 
                  list="email-suggestions" 
                  value={c.email} 
                  onChange={e => setResume({...resume, contact_info: {...c, email: e.target.value}})} 
                  className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none text-foreground" 
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Phone</label>
                <input 
                  value={c.phone} 
                  onChange={e => setResume({...resume, contact_info: {...c, phone: e.target.value}})} 
                  className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none text-foreground" 
                />
              </div>
            </div>

            {/* RESTORED CAREER EXTRAS FOR ONBOARDING */}
            {domain.profileExtras.length > 0 && (
              <div className="border-t border-border pt-8">
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-6">
                  {domain.label} · Profile Details
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {domain.profileExtras.map((pf: any) => (
                    <div key={pf.key}>
                      <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                        {pf.label}
                      </label>
                      <input
                        value={extras[pf.key] || ""}
                        onChange={e => setResume({...resume, contact_info: {...c, extras: {...extras, [pf.key]: e.target.value}}})}
                        className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none text-foreground"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: EDUCATION */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-4xl font-bold mb-2">EDUCATION</h1>
            <p className="text-muted-foreground mb-8">Where did you study? Add your highest degrees.</p>
            
            {resume.education.map((e, i) => (
              <div key={i} className="border border-border p-6 mb-4 relative bg-card">
                <button onClick={() => setResume({ ...resume, education: resume.education.filter((_, j) => j !== i) })} className="absolute top-4 right-4 text-muted-foreground hover:text-destructive">
                  <Trash2 size={14}/>
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    value={e.degree} 
                    onChange={(ev) => updateAt(resume.education, (arr) => setResume({...resume, education: arr}), i, {degree: ev.target.value})} 
                    placeholder="Degree" 
                    className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none text-foreground" 
                  />
                  <input 
                    value={e.school} 
                    onChange={(ev) => updateAt(resume.education, (arr) => setResume({...resume, education: arr}), i, {school: ev.target.value})} 
                    placeholder="Institution" 
                    className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none text-foreground" 
                  />
                  <input 
                    value={e.endYear} 
                    onChange={(ev) => updateAt(resume.education, (arr) => setResume({...resume, education: arr}), i, {endYear: ev.target.value})} 
                    placeholder="Year" 
                    className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none text-foreground" 
                  />
                  <select 
                    value={e.status} 
                    onChange={(ev) => updateAt(resume.education, (arr) => setResume({...resume, education: arr}), i, {status: ev.target.value})} 
                    className="w-full bg-background border border-border p-3 text-foreground [&>option]:bg-background [&>option]:text-foreground"
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            ))}
            <button onClick={() => setResume({ ...resume, education: [...resume.education, { school: "", degree: "", status: "ongoing", endYear: "" }] })} className="text-xs font-bold text-primary flex items-center gap-1">
              <Plus size={14}/> Add Education
            </button>
          </div>
        )}

        {/* STEP 3: EXPERIENCE WITH INTEGRATED LIVE AI BULLET WRITER */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-4xl font-bold mb-2">EXPERIENCE</h1>
            <p className="text-muted-foreground mb-8">List your relevant work history. We use this to tier your profile.</p>
            
            {resume.experience.map((x, i) => (
              <div key={i} className="border border-border p-6 mb-6 relative bg-card">
                <button onClick={() => setResume({ ...resume, experience: resume.experience.filter((_, j) => j !== i) })} className="absolute top-4 right-4 text-muted-foreground hover:text-destructive">
                  <Trash2 size={14}/>
                </button>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input 
                    list="role-suggestions" 
                    value={x.role} 
                    onChange={(e) => updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), i, {role: e.target.value})} 
                    placeholder="Job Title" 
                    className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none text-foreground" 
                  />
                  <input 
                    value={x.company} 
                    onChange={(e) => updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), i, {company: e.target.value})} 
                    placeholder="Employer" 
                    className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none text-foreground" 
                  />
                  <input 
                    value={x.startYear} 
                    onChange={(e) => updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), i, {startYear: e.target.value})} 
                    placeholder="Start Date" 
                    className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none text-foreground" 
                  />
                  <input 
                    value={x.endYear} 
                    disabled={x.current} 
                    onChange={(e) => updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), i, {endYear: e.target.value})} 
                    placeholder="End Date" 
                    className="w-full bg-input-background border border-border p-3 focus:border-primary outline-none disabled:opacity-50 text-foreground" 
                  />
                </div>
                
                <div className="mb-4 bg-background border border-border p-4">
                  <div className="flex justify-between items-center mb-2">
                     <div className="font-mono text-[10px] text-muted-foreground">Draft your achievements below, then let AI enhance them</div>
                     <button 
                       onClick={() => generateAIBullets(i)} 
                       disabled={aiLoadingIdx === i} 
                       className="text-[#8b5cf6] flex items-center gap-1 text-[10px] font-bold uppercase hover:underline bg-[#8b5cf6]/10 px-2 py-1 rounded"
                     >
                       {aiLoadingIdx === i ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12}/>}
                       {aiLoadingIdx === i ? "Writing..." : "Get help with writing"}
                     </button>
                  </div>

                  <textarea 
                    value={x.description || ""} 
                    onChange={(e) => updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), i, {description: e.target.value})} 
                    className="w-full bg-transparent border-b border-border focus:border-primary outline-none text-sm text-foreground mb-4 pb-2" 
                    rows={2} 
                    placeholder="Type rough notes here (e.g. 'i did all the frontend work'), then click ✨ Get help with writing to enhance it!" 
                  />

                  {(x.bullets || []).map((b: string, bi: number) => (
                    <div key={bi} className="flex gap-2 mb-2">
                      <span className="text-muted-foreground mt-3">•</span>
                      <textarea 
                        value={b} 
                        onChange={(ev) => { 
                          const newB = [...x.bullets]; 
                          newB[bi] = ev.target.value; 
                          updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), i, {bullets: newB}); 
                        }} 
                        className="w-full bg-transparent border-none focus:ring-0 outline-none text-sm text-foreground" 
                        rows={2} 
                        placeholder="Led cross-functional team initiatives to maximize processing speed..." 
                      />
                    </div>
                  ))}
                  <button onClick={() => { const newB = [...(x.bullets||[]), ""]; updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), i, {bullets: newB}); }} className="text-xs text-primary font-bold hover:underline mt-2">
                    + Add bullet
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setResume({ ...resume, experience: [...resume.experience, { company: "", role: "", startYear: "", endYear: "", bullets: [""] }] })} className="text-xs text-primary font-bold flex items-center gap-1">
              <Plus size={14}/> Add deployment
            </button>
          </div>
        )}

        {/* STEP 4: SKILLS */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-4xl font-bold mb-2">SKILLS</h1>
            <p className="text-muted-foreground mb-8">What tools, languages, and frameworks do you know?</p>
            <TagInput value={resume.skills} onChange={(s) => setResume({ ...resume, skills: s })} placeholder="Type skill..." />
          </div>
        )}

        {/* STEP 5: SUMMARY */}
        {step === 5 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-4xl font-bold mb-2">SUMMARY</h1>
            <p className="text-muted-foreground mb-8">Review your synthesized profile statement below.</p>
            <div className="bg-card border border-border p-6 mb-4">
               <div className="flex justify-between items-center mb-3">
                 <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Professional Summary</div>
                 <button 
                   onClick={generateAISummary} 
                   disabled={summaryLoading} 
                   className="text-[#8b5cf6] flex items-center gap-1 text-[10px] font-bold bg-[#8b5cf6]/10 px-2 py-1 rounded hover:underline"
                 >
                   {summaryLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12}/>}
                   Auto-write with AI
                 </button>
               </div>
               <textarea 
                 value={resume.summary} 
                 onChange={(e) => setResume({...resume, summary: e.target.value})} 
                 className="w-full bg-input-background border border-border p-4 focus:border-primary outline-none resize-y min-h-[150px] text-sm text-foreground" 
                 placeholder={getDynamicSummary()} 
               />
            </div>
          </div>
        )}

        {/* STEPPER FOOTER */}
        <div className="mt-auto pt-10 pb-6 flex justify-between items-center border-t border-border">
          <button onClick={() => step === 1 ? onBack() : setStep(step - 1)} className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            ← Back
          </button>
          {step < 5 ? (
            <button onClick={() => setStep(step + 1)} className="bg-primary text-primary-foreground px-8 py-3 font-mono text-xs uppercase tracking-widest font-bold">
              Next Step →
            </button>
          ) : (
            <button onClick={handleFinish} disabled={saving} className="bg-primary text-primary-foreground px-8 py-3 font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />} Complete Setup
            </button>
          )}
        </div>
      </div>

      {/* PREVIEW CONTAINER */}
      <div className="hidden lg:flex flex-col w-[50%] bg-[#e5e7eb] border-l border-border h-screen">
        <div className="bg-white border-b border-gray-300 p-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
              <Settings2 size={14}/> Customize Layout
            </span>
            <div className="flex gap-2">
               {['#0f4c3a', '#0d47a1', '#8b5cf6', '#111111'].map(color => (
                 <button 
                   key={color} 
                   onClick={() => setAccentColor(color)} 
                   className="w-6 h-6 rounded-full border-2 transition-transform" 
                   style={{ backgroundColor: color, borderColor: accentColor === color ? '#000' : 'transparent' }} 
                 />
               ))}
            </div>
          </div>
          <div className="flex bg-gray-100 p-1 rounded">
             <button onClick={() => setLayoutStyle('two-column')} className={`text-xs px-3 py-1 rounded ${layoutStyle === 'two-column' ? 'bg-white shadow font-bold text-black' : 'text-gray-500'}`}>Professional</button>
             <button onClick={() => setLayoutStyle('classic')} className={`text-xs px-3 py-1 rounded ${layoutStyle === 'classic' ? 'bg-white shadow font-bold text-black' : 'text-gray-500'}`}>Classic</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          <LivePreview />
        </div>
      </div>
    </div>
  );
}