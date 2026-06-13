import { useEffect, useState } from "react";
import { api, getAccessToken } from "../../lib/supabase";
import { CareerDomainId, getDomain } from "../../lib/careerDomains";
import { CareerTier, EducationEntry, ExperienceEntry, SubscriptionTier } from "../../lib/tier";
import { TagInput } from "./TagInput";
import { Loader2, Save, Trash2, Plus, Sparkles, Settings2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const COUNTRIES = [
  "Sri Lanka", "United States", "United Kingdom", 
  "Australia", "Canada", "India", "United Arab Emirates"
];

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  "Sri Lanka": ["Wattala", "Colombo", "Kandy", "Galle", "Negombo", "Jaffna", "Gampaha", "Kurunegala", "Malabe", "Kotte", "Dehiwala", "Moratuwa"],
  "United States": ["New York, NY", "San Francisco, CA", "Los Angeles, CA", "Seattle, WA", "Chicago, IL", "Austin, TX", "Boston, MA"],
  "United Kingdom": ["London", "Manchester", "Birmingham", "Edinburgh", "Glasgow", "Leeds"]
};

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
  summary?: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: string[];
}

export function AccountView({ profile, onProfileUpdate }: any) {
  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoadingIdx, setAiLoadingIdx] = useState<number | null>(null);
  const [summaryLoading, setAiSummaryLoading] = useState(false);
  
  const [accentColor, setAccentColor] = useState("#0f4c3a");
  const [layoutStyle, setLayoutStyle] = useState("two-column");
  const [selectedCountry, setSelectedCountry] = useState("Sri Lanka");

  const domain = getDomain(profile.career_domain);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const res = await api<{ resume: any | null }>("/resume", { token: token ?? undefined });
        setResume(res.resume || { 
          contact_info: { full_name: profile.full_name, email: profile.email }, 
          summary: "", 
          education: [], 
          experience: [], 
          skills: [] 
        });
      } catch (e: any) {
        toast.error("Failed to fetch resume information");
      } finally {
        setLoading(false);
      }
    })();
  }, [profile.id]);

  function updateAt<T>(arr: T[], set: (n: T[]) => void, i: number, patch: Partial<T>) {
    const next = arr.slice();
    next[i] = { ...next[i], ...patch };
    set(next);
  }

  function getDynamicSummary() {
    if (resume?.summary) return resume.summary;
    if (!resume) return "";
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
    const exp = resume.experience[index];
    if (!exp.role) { 
      toast.error("Enter job title first."); 
      return; 
    }
    setAiLoadingIdx(index);
    try {
      const token = await getAccessToken();
      const rawNotes = `Role: ${exp.role}\nCompany: ${exp.company || "Unknown"}\nUser's rough notes: ${exp.description || ""} ${(exp.bullets || []).join(" ")}`;

      const res = await api<any>("/ai-writer", {
        method: "POST",
        token: token ?? undefined,
        body: { 
          prompt: rawNotes, 
          type: "bullets" 
        }
      });

      if (res.result) {
        const lines = res.result
          .split("\n")
          .filter((l: string) => l.trim().startsWith("-"))
          .map((l: string) => l.replace(/^-\s*/, ""));
        
        if (lines.length > 0) {
          updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), index, { bullets: lines });
          toast.success("Professional bullets inserted!");
        }
      }
    } catch (err) {
      toast.error("AI enhancement failed. Please try again.");
    } finally { 
      setAiLoadingIdx(null); 
    }
  }

  async function generateAISummary() {
    setAiSummaryLoading(true);
    try {
      const token = await getAccessToken();
      const prompt = `Target Role: ${resume.contact_info.headline || "Professional"}\nSkills: ${(resume.skills || []).join(", ")}\nEducation: ${(resume.education || []).map((e:any) => e.degree).join(", ")}\nExperience: ${(resume.experience || []).map((x:any) => x.role).join(", ")}`;

      const res = await api<any>("/ai-writer", {
        method: "POST",
        token: token ?? undefined,
        body: { 
          prompt: prompt + "\n\nWrite a comprehensive 5-sentence summary.", 
          type: "summary" 
        }
      });

      if (res?.result) {
        setResume({ ...resume, summary: res.result });
        toast.success("5-Line Summary generated!");
      }
    } catch (err) {
      toast.error("AI connection failed. Ensure Gemini is configured.");
    } finally { 
      setAiSummaryLoading(false); 
    }
  }

  async function save() {
    if (!resume) return;
    setSaving(true);
    try {
      const token = await getAccessToken();
      const payloadLoc = resume.contact_info.location.includes(selectedCountry) 
        ? resume.contact_info.location 
        : `${resume.contact_info.location}, ${selectedCountry}`;
      
      await api("/resume", { 
        method: "PUT", 
        token: token ?? undefined, 
        body: { 
          ...resume, 
          summary: resume.summary || getDynamicSummary(), 
          contact_info: { ...resume.contact_info, location: payloadLoc } 
        } 
      });
      toast.success(`Profile Saved Successfully`);
    } catch (e: any) { 
      toast.error("Save failed"); 
    } finally { 
      setSaving(false); 
    }
  }

  function LivePreview() {
    if (!resume) return null;
    const c = resume.contact_info || {};
    const extras = c.extras || {};
    const displayLoc = c.location ? (c.location.includes(selectedCountry) ? c.location : `${c.location}, ${selectedCountry}`) : selectedCountry;
    const contactLine = [displayLoc, c.email, c.phone].filter(Boolean).join(" · ");
    const extraLine = Object.entries(extras).filter(([_, v]) => v).map(([k, v]) => `**${k.toUpperCase().replace('_', ' ')}**: ${v}`).join(" | ");
    
    const activeSummary = getDynamicSummary();
    const skillsMd = (resume.skills || []).join(", ");

    return (
      <div className="bg-white shadow-2xl mx-auto overflow-hidden text-left" style={{ width: '210mm', minHeight: '297mm', color: '#111', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
        <div className="pt-12 px-12 pb-6 border-b-2" style={{ borderColor: accentColor }}>
          <h1 className="text-4xl font-bold uppercase tracking-wide m-0">{c.full_name || "YOUR NAME"}</h1>
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
                  {Object.entries(extras).filter(([_, v]) => v).map(([k, v]) => <div key={k}><strong>{k.toUpperCase().replace('_', ' ')}</strong><br/>{v as string}</div>)}
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
                {(resume.experience || []).map((x: any, i: number) => (
                  <div key={i} className="mb-4">
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="text-xs font-bold">{x.role}, {x.company}</div>
                      <div className="text-[10px] text-gray-500">{x.startYear} – {x.current ? "Present" : x.endYear}</div>
                    </div>
                    {x.description && <p className="text-xs text-gray-600 mb-2">{x.description}</p>}
                    <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1">
                      {(x.bullets || []).filter(Boolean).map((b: string, bi: number) => (
                        <li key={bi}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: accentColor }}>Education</h3>
                {(resume.education || []).map((e: any, i: number) => (
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
              {(resume.experience || []).map((x: any, i: number) => (
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
              {(resume.education || []).map((e: any, i: number) => (
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

  if (loading || !resume) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary"/></div>;
  const c = resume.contact_info ?? {};
  const extras = c.extras ?? {};

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] w-full relative">
      <datalist id="countries-list">
        {COUNTRIES.map(ct => <option key={ct} value={ct} />)}
      </datalist>
      <datalist id="cities-list">
        {(CITIES_BY_COUNTRY[selectedCountry] || []).map(ci => <option key={ci} value={ci} />)}
      </datalist>
      <datalist id="role-suggestions">
        <option value="Software Engineer" />
        <option value="Backend Engineer" />
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

      <div className="flex-1 space-y-6 p-6 lg:p-10 overflow-y-auto pb-32">
        <div className="flex justify-between items-center bg-card p-6 border border-border">
          <div><h2 className="text-xl">Account Data</h2></div>
          <button 
            onClick={save} 
            disabled={saving} 
            className="bg-primary text-primary-foreground px-6 py-2 font-mono text-xs font-bold flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Save Data
          </button>
        </div>

        <div className="bg-card border border-border p-6">
          <div className="font-mono text-xs uppercase text-primary mb-4">Contact & Links</div>
          <div className="space-y-4">
             <input 
               value={c.full_name || ""} 
               onChange={(e) => setResume({...resume, contact_info: {...c, full_name: e.target.value}})} 
               className="w-full bg-background border border-border p-3 text-sm text-foreground" 
               placeholder="Full Name" 
             />
             <input 
               list="role-suggestions" 
               value={c.headline || ""} 
               onChange={(e) => setResume({...resume, contact_info: {...c, headline: e.target.value}})} 
               className="w-full bg-background border border-border p-3 text-sm text-foreground" 
               placeholder="Headline" 
             />
             <div className="grid grid-cols-2 gap-4">
               <input 
                 list="countries-list" 
                 value={selectedCountry} 
                 onChange={e => { setSelectedCountry(e.target.value); setResume({...resume, contact_info: {...c, location: ""}}); }} 
                 className="w-full bg-background border border-border p-3 text-sm text-foreground" 
                 placeholder="Country" 
               />
               <input 
                 list="cities-list" 
                 value={c.location || ""} 
                 onChange={(e) => setResume({...resume, contact_info: {...c, location: e.target.value}})} 
                 className="w-full bg-background border border-border p-3 text-sm text-foreground" 
                 placeholder="City" 
               />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <input 
                 list="email-suggestions" 
                 value={c.email || ""} 
                 onChange={(e) => setResume({...resume, contact_info: {...c, email: e.target.value}})} 
                 className="w-full bg-background border border-border p-3 text-sm text-foreground" 
                 placeholder="Email" 
               />
               <input 
                 value={c.phone || ""} 
                 onChange={(e) => setResume({...resume, contact_info: {...c, phone: e.target.value}})} 
                 className="w-full bg-background border border-border p-3 text-sm text-foreground" 
                 placeholder="Phone Number" 
               />
             </div>

             {domain.profileExtras.length > 0 && (
               <div className="mt-4 pt-4 border-t border-border">
                 <div className="text-xs text-muted-foreground mb-3">{domain.label} Credentials</div>
                 {domain.profileExtras.map((pf: any) => (
                   <input 
                     key={pf.key} 
                     value={extras[pf.key] || ""} 
                     onChange={(e) => setResume({...resume, contact_info: {...c, extras: {...extras, [pf.key]: e.target.value}}})} 
                     className="w-full bg-background border border-border focus:border-primary outline-none p-3 mb-2 text-sm text-foreground" 
                     placeholder={pf.label} 
                   />
                 ))}
               </div>
             )}
          </div>
        </div>

        <div className="bg-card border border-border p-6">
          <div className="flex justify-between items-center mb-4">
             <div className="font-mono text-xs text-primary">Summary</div>
             <button 
               onClick={generateAISummary} 
               disabled={summaryLoading} 
               className="text-[#8b5cf6] flex items-center gap-1 text-[10px] font-bold bg-[#8b5cf6]/10 px-2 py-1 rounded"
             >
               {summaryLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12}/>} Auto-write with AI
             </button>
          </div>
          <textarea 
            value={resume.summary || ""} 
            onChange={(e) => setResume({...resume, summary: e.target.value})} 
            className="w-full bg-background border border-border p-4 text-sm text-foreground" 
            rows={4} 
            placeholder={getDynamicSummary()} 
          />
        </div>

        <div className="bg-card border border-border p-6">
          <div className="flex justify-between items-center mb-4">
             <div className="font-mono text-xs text-primary">Experience</div>
             <button 
               onClick={() => setResume({ ...resume, experience: [...resume.experience, { company: "", role: "", startYear: "", endYear: "", bullets: [""] }] })} 
               className="text-xs text-primary font-bold"
             >
               + Add Role
             </button>
          </div>
          {resume.experience.map((x: any, i: number) => (
            <div key={i} className="border border-border p-4 bg-background mb-4 relative shadow-sm">
              <button 
                onClick={() => setResume({ ...resume, experience: resume.experience.filter((_, j) => j !== i) })} 
                className="absolute top-4 right-4 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14}/>
              </button>
              <div className="grid grid-cols-2 gap-3 mb-3">
                 <input 
                   list="role-suggestions" 
                   value={x.role} 
                   onChange={(e) => updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), i, {role: e.target.value})} 
                   placeholder="Role" 
                   className="p-2 border border-border bg-background text-sm text-foreground" 
                 />
                 <input 
                   value={x.company} 
                   onChange={(e) => updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), i, {company: e.target.value})} 
                   placeholder="Company" 
                   className="p-2 border border-border bg-background text-sm text-foreground" 
                 />
                 <input 
                   value={x.startYear} 
                   onChange={(e) => updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), i, {startYear: e.target.value})} 
                   placeholder="Start Date" 
                   className="p-2 border border-border bg-background text-sm text-foreground" 
                 />
                 <input 
                   value={x.endYear} 
                   disabled={x.current} 
                   onChange={(e) => updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), i, {endYear: e.target.value})} 
                   placeholder="End Date" 
                   className="p-2 border border-border bg-background text-sm disabled:opacity-50 text-foreground" 
                 />
              </div>
              <div className="space-y-3 bg-card border border-border p-4">
                 <div className="flex justify-between items-center mb-2">
                    <div className="font-mono text-[10px] text-muted-foreground">Draft your achievements below, then let AI enhance them</div>
                    <button 
                      onClick={() => generateAIBullets(i)} 
                      disabled={aiLoadingIdx === i} 
                      className="text-[#8b5cf6] flex items-center gap-1 text-[10px] font-bold bg-[#8b5cf6]/10 px-2 py-1 rounded"
                    >
                      {aiLoadingIdx === i ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12}/>} Get help with writing
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
                   <div key={bi} className="flex gap-2">
                     <span className="text-muted-foreground mt-1">•</span>
                     <textarea 
                       value={b} 
                       onChange={(e) => { 
                         const newB = [...x.bullets]; 
                         newB[bi] = e.target.value; 
                         updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), i, {bullets: newB}); 
                       }} 
                       className="w-full bg-transparent border-none text-sm text-foreground mb-2" 
                       rows={2} 
                     />
                   </div>
                 ))}
                 <button onClick={() => { const newB = [...(x.bullets||[]), ""]; updateAt(resume.experience, (arr) => setResume({...resume, experience: arr}), i, {bullets: newB}); }} className="text-xs text-primary font-bold hover:underline mt-2">
                    + Add bullet
                 </button>
              </div>
            </div>
          ))}
          <button 
            onClick={() => setResume({ ...resume, experience: [...resume.experience, { company: "", role: "", startYear: "", endYear: "", bullets: [""] }] })} 
            className="text-xs text-primary font-bold"
          >
            + Add Role
          </button>
        </div>
        
        <div className="bg-card border border-border p-6">
          <div className="font-mono text-xs text-primary mb-4">Education</div>
          {resume.education.map((e: any, i: number) => (
            <div key={i} className="grid grid-cols-2 gap-3 mb-4 p-4 border border-border bg-background relative">
              <button 
                onClick={() => setResume({ ...resume, education: resume.education.filter((_, j) => j !== i) })} 
                className="absolute top-4 right-4 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14}/>
              </button>
              <input 
                value={e.degree} 
                onChange={(ev) => updateAt(resume.education, (arr) => setResume({...resume, education: arr}), i, {degree: ev.target.value})} 
                placeholder="Degree" 
                className="p-2 border border-border bg-background text-sm text-foreground" 
              />
              <input 
                value={e.school} 
                onChange={(ev) => updateAt(resume.education, (arr) => setResume({...resume, education: arr}), i, {school: ev.target.value})} 
                placeholder="Institution" 
                className="p-2 border border-border bg-background text-sm text-foreground" 
              />
              <input 
                value={e.endYear} 
                onChange={(ev) => updateAt(resume.education, (arr) => setResume({...resume, education: arr}), i, {endYear: ev.target.value})} 
                placeholder="Year" 
                className="p-2 border border-border bg-background text-sm text-foreground" 
              />
              <select 
                value={e.status} 
                onChange={(ev) => updateAt(resume.education, (arr) => setResume({...resume, education: arr}), i, {status: ev.target.value as any})} 
                className="p-2 border border-border bg-background text-sm text-foreground [&>option]:bg-background [&>option]:text-foreground"
              >
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          ))}
          <button 
            onClick={() => setResume({ ...resume, education: [...resume.education, { school: "", degree: "", status: "ongoing", endYear: "" }] })} 
            className="text-xs text-primary font-bold"
          >
            + Add Education
          </button>
        </div>

        <div className="bg-card border border-border p-6">
          <div className="font-mono text-xs text-primary mb-4">Skills</div>
          <TagInput 
            value={resume.skills} 
            onChange={(s: string[]) => setResume({ ...resume, skills: s })} 
            placeholder="Skills" 
          />
        </div>
      </div>

      <div className="hidden lg:flex flex-col w-[50%] bg-[#e5e7eb] border-l border-border fixed right-0 top-0 bottom-0 z-10 pt-20">
        <div className="bg-white border-b border-gray-300 p-4 flex items-center justify-between shadow-sm z-20 absolute top-[80px] left-0 right-0">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
              <Settings2 size={14}/> Customize Layout
            </span>
            <div className="flex gap-2">
               {['#0f4c3a', '#0d47a1', '#8b5cf6', '#111111'].map(color => (
                 <button 
                   key={color} 
                   onClick={() => setAccentColor(color)} 
                   className="w-6 h-6 rounded-full border-2" 
                   style={{ backgroundColor: color, borderColor: accentColor === color ? '#000' : 'transparent' }} 
                 />
               ))}
            </div>
          </div>
          <div className="flex bg-gray-100 p-1 rounded">
             <button 
               onClick={() => setLayoutStyle('two-column')} 
               className={`text-xs px-3 py-1 rounded ${layoutStyle === 'two-column' ? 'bg-white shadow font-bold text-black' : 'text-gray-500'}`}
             >
               Professional
             </button>
             <button 
               onClick={() => setLayoutStyle('classic')} 
               className={`text-xs px-3 py-1 rounded ${layoutStyle === 'classic' ? 'bg-white shadow font-bold text-black' : 'text-gray-500'}`}
             >
               Classic
             </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 pt-24 pb-32 flex justify-center">
          <LivePreview />
        </div>
      </div>
    </div>
  );
}