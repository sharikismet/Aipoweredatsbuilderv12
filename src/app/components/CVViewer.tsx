import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Download, Loader2, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

interface Tailored {
  id: string;
  job_title: string;
  company: string;
  markdown: string;
  created_at: string;
}

interface Props {
  cv: Tailored;
  onBack: () => void;
}

export function CVViewer({ cv, onBack }: Props) {
  const [template, setTemplate] = useState<"classic" | "modern" | "minimal">("classic");
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  async function downloadPDF() {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const fileName = `${(cv.job_title || "Resume").replace(/\s+/g, "-")}.pdf`;
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <button
            onClick={downloadPDF}
            disabled={downloading}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 font-mono text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download PDF
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-border bg-card p-6 overflow-y-auto hidden md:block">
          <div className="flex items-center gap-2 mb-6 text-primary">
            <LayoutTemplate size={18} />
            <h3 className="font-mono text-sm uppercase tracking-widest m-0">Visual Layout</h3>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => setTemplate("classic")}
              className={`w-full text-left p-4 border transition-colors ${template === "classic" ? "border-primary bg-primary/5" : "border-border hover:border-foreground"}`}
            >
              <div className="font-mono text-xs uppercase tracking-widest mb-1">Harvard Classic</div>
              <div className="text-xs text-muted-foreground">Standard serif, centered headers, highly traditional.</div>
            </button>
            
            <button
              onClick={() => setTemplate("modern")}
              className={`w-full text-left p-4 border transition-colors ${template === "modern" ? "border-primary bg-primary/5" : "border-border hover:border-foreground"}`}
            >
              <div className="font-mono text-xs uppercase tracking-widest mb-1">Modern Clean</div>
              <div className="text-xs text-muted-foreground">Sans-serif, left-aligned, blue accent colors.</div>
            </button>

            <button
              onClick={() => setTemplate("minimal")}
              className={`w-full text-left p-4 border transition-colors ${template === "minimal" ? "border-primary bg-primary/5" : "border-border hover:border-foreground"}`}
            >
              <div className="font-mono text-xs uppercase tracking-widest mb-1">Executive Minimal</div>
              <div className="text-xs text-muted-foreground">Stark typography, heavy weighting, maximum whitespace.</div>
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#1a1a1a] p-8 overflow-y-auto flex justify-center">
          <div
            ref={previewRef}
            className={`resume-preview template-${template} bg-white mx-auto shadow-2xl`}
            style={{ width: "210mm", minHeight: "297mm", padding: "12mm 15mm" }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{cv.markdown}</ReactMarkdown>
          </div>
        </div>
      </div>

      <style>{`
        .resume-preview { color: #000; box-sizing: border-box; }
        .resume-preview p { margin: 4px 0; }
        .resume-preview ul { padding-left: 18px; margin: 4px 0 8px; }
        .resume-preview li { margin: 2px 0; }
        .resume-preview a { color: inherit; text-decoration: none; }
        
        .template-classic { font-family: 'Times New Roman', Times, serif; }
        .template-classic h1 { font-size: 26px; font-weight: 700; text-align: center; margin: 0 0 4px; text-transform: uppercase; }
        .template-classic h1 + p { text-align: center; font-size: 11px; margin-bottom: 12px; }
        .template-classic h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 2px; margin: 16px 0 8px; }
        .template-classic h3 { font-size: 12px; font-weight: 700; margin: 10px 0 2px; }
        .template-classic h4 { font-size: 11px; font-weight: 700; font-style: italic; margin: 2px 0; }
        .template-classic p, .template-classic li { font-size: 11px; line-height: 1.5; }

        .template-modern { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; }
        .template-modern h1 { font-size: 28px; font-weight: 800; color: #2563eb; margin: 0 0 2px; letter-spacing: -0.5px; }
        .template-modern h1 + p { font-size: 11px; color: #666; margin-bottom: 16px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
        .template-modern h2 { font-size: 14px; font-weight: 700; color: #2563eb; text-transform: uppercase; margin: 20px 0 8px; letter-spacing: 0.5px; }
        .template-modern h3 { font-size: 13px; font-weight: 700; color: #111; margin: 10px 0 2px; }
        .template-modern h4 { font-size: 11px; font-weight: 600; color: #666; margin: 2px 0; }
        .template-modern p, .template-modern li { font-size: 11px; line-height: 1.6; }

        .template-minimal { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .template-minimal h1 { font-size: 32px; font-weight: 300; letter-spacing: 1px; margin: 0 0 4px; }
        .template-minimal h1 + p { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 20px; }
        .template-minimal h2 { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #000; margin: 24px 0 10px; border-top: 1px solid #eaeaea; padding-top: 16px; }
        .template-minimal h3 { font-size: 12px; font-weight: 700; margin: 12px 0 2px; display: inline-block; padding-right: 8px; }
        .template-minimal h4 { font-size: 11px; font-weight: 400; color: #666; margin: 2px 0 4px; }
        .template-minimal p, .template-minimal li { font-size: 11px; line-height: 1.6; color: #444; }
      `}</style>
    </div>
  );
}