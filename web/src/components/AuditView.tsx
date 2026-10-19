import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function AuditView({ record }: { record: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(record, null, 2);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
      </button>
      <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100">{text}</pre>
      <p className="mt-2 text-[11px] text-slate-400">The same record is appended to out/api_audit.jsonl on the server.</p>
    </div>
  );
}
