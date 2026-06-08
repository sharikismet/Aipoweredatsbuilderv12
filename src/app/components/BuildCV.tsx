import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Download, Loader2, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import { api, getAccessToken } from "../../lib/supabase";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  credits_remaining: number;
  subscription_tier: string;
}

interface Tailored {
  id: string;
  job_title: string;
  company: string;
  markdown: string;
  created_at: string;
}

interface Props {
  profile: Profile;
  onProfileUpdate: (p: Profile) => void;
  onBack: () => void;
  onSaved?: (t: Tailored) => void;
}

export function BuildCV({ profile, onProfileUpdate, onBack, onSaved }: Props) {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [markdown, setMarkdown] = useState<string>("");
  const [meta, setMeta] = useState<Tailored | null>(null);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  async function generate() {
    if (description.trim().length < 30) {
      toast.error("Paste the full job description (at least 30 characters).");
      return;
    }
    setGenerating(true);
    setMarkdown("");
    setMeta(null);
    try {
      const token = await getAccessToken();
      const res = await api<{ tailored: Tailored; profile: Profile }>("/tailor-custom", {
        method: "POST",
        token: token ?? undefined,
        body: { jobTitle, company, location, description, template: "classic" },
      });
      onProfileUpdate(res.profile);
      setMeta(res.tailored);
      
      const full = res.tailored.markdown;
      const step = Math.max(20, Math.floor(full.length / 80));
      let i = 0;
      const tick = () => {
        i = Math.min(full.length, i + step);
        setMarkdown(full.slice(0, i));
        if (i < full.length) {
          requestAnimationFrame(tick);
        } else {
          onSaved?.(res.tailored);
          toast.success("Resume generated.");
        }
      };
      tick();
    } catch (e: any) {
      console.error("generate failed:", e);
      toast.error(e?.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadPDF() {
    if (!previewRef.current || !markdown) return;
    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const fileName = `${(meta?.job_title || jobTitle || "Resume").replace(/\s+/g, "-")}-${(meta?.company || company || "CV").replace(/\s+/g, "-")}.pdf`;
      await html2pdf()
        .set({
          margin: [12, 14, 12, 14],
          filename: fileName,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(previewRef.current)
        .save();
    } catch (e: any) {
      console.error("pdf export failed:", e);
      toast.error("PDF export failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Credits: <span className="text-primary">{profile.credits_remaining}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10 max-w-3xl">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Tailor to Job Description
          </div>
          <h1 className="mb-3">
            Beat the <span className="text-primary">ATS</span> with one paste.
          </h1>
          <p className="text-muted-foreground">
            Paste the exact LinkedIn or Indeed job description. We cross-reference it against your profile and rewrite every bullet to mirror the recruiter's keywords.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Job title</span>
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  className="mt-1 w-full bg-card border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Company</span>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Stripe"
                  className="mt-1 w-full bg-card border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                />
              </label>
            </div>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Location (optional)</span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote · EU"
                className="mt-1 w-full bg-card border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Paste job description *
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Copy everything: responsibilities, requirements, the lot. The more we get, the better the keyword match."
                rows={18}
                className="mt-1 w-full bg-card border border-border px-3 py-3 font-mono text-xs leading-relaxed focus:outline-none focus:border-primary resize-y"
              />
            </label>
            <button
              onClick={generate}
              disabled={generating || description.trim().length < 30}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-4 font-mono uppercase tracking-widest text-sm hover:opacity-90 disabled:opacity-50"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? "Generating" : "Generate ATS resume"}
            </button>
          </div>

          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Preview</div>
              <button
                onClick={downloadPDF}
                disabled={!markdown || downloading || generating}
                className="inline-flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest hover:border-primary disabled:opacity-40"
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download PDF
              </button>
            </div>

            <div className="border border-border bg-[#f5f3ee] min-h-[600px]">
              {markdown ? (
                <div
                  ref={previewRef}
                  className="resume-preview bg-white text-black mx-auto p-12"
                  style={{ maxWidth: "210mm", minHeight: "297mm", fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-12 h-[600px]">
                  <FileText size={32} className="text-muted-foreground mb-4" />
                  <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {generating ? "Talking to the model…" : "Your generated resume will appear here"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .resume-preview h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 4px; color: #111; }
        .resume-preview h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; border-bottom: 1.5px solid #111; padding-bottom: 4px; margin: 22px 0 10px; color: #111; }
        .resume-preview h3 { font-size: 14px; font-weight: 700; margin: 12px 0 2px; color: #111; }
        .resume-preview h4 { font-size: 13px; font-weight: 700; margin: 10px 0 2px; color: #111; }
        .resume-preview p { font-size: 12px; line-height: 1.55; margin: 4px 0; color: #222; }
        .resume-preview ul { padding-left: 18px; margin: 4px 0 8px; }
        .resume-preview li { font-size: 12px; line-height: 1.55; margin: 2px 0; color: #222; }
        .resume-preview strong { font-weight: 700; color: #111; }
        .resume-preview h1 + p { font-size: 11.5px; color: #333; }
      `}</style>
    </div>
  );
}