import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const tags = raw.split(",").map((t) => t.trim()).filter(Boolean);
    if (!tags.length) return;
    onChange(Array.from(new Set([...value, ...tags])));
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-input-background border border-border focus-within:border-primary transition-colors">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="hover:opacity-70" aria-label={`Remove ${t}`}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => commit(draft)}
        placeholder={value.length ? "" : placeholder ?? "Type and press Enter"}
        className="flex-1 min-w-[140px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
      />
    </div>
  );
}
