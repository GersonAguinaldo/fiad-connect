import { useState, useRef } from "react";
import { Upload, Download, FileText, CheckCircle2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { AdminModal } from "@/components/admin-modal";

export type ImportColumn = {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
};

export type ImportResult = { inserted: number; skipped: number; errors: string[] };

export type CsvImportProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  columns: ImportColumn[];
  sample: Record<string, string>;
  // returns null if row should be skipped with an error
  transform: (row: Record<string, string>, index: number) => Promise<{ ok: true; payload: Record<string, unknown> } | { ok: false; error: string } | { skip: true }>;
  onCommit: (rows: Record<string, unknown>[]) => Promise<ImportResult>;
  onDone?: () => void;
};

// Robust CSV parser (handles quoted commas + newlines)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(field); rows.push(cur); cur = []; field = "";
      } else field += c;
    }
  }
  if (field !== "" || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export function CsvImport({ open, onClose, title, columns, sample, transform, onCommit, onDone }: CsvImportProps) {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() { setRaw(""); setPreview(null); setErrors([]); setResult(null); }

  function downloadTemplate() {
    const header = columns.map((c) => c.key).join(",");
    const sampleRow = columns.map((c) => {
      const v = sample[c.key] ?? "";
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(",");
    const blob = new Blob([header + "\n" + sampleRow + "\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `modele-${title.toLowerCase().replace(/\s+/g, "-")}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(f: File) {
    const txt = await f.text();
    setRaw(txt);
    doParse(txt);
  }

  function doParse(text: string) {
    const rows = parseCSV(text);
    if (rows.length < 2) { toast.error("Le fichier doit contenir un en-tête et au moins une ligne."); return; }
    const header = rows[0].map((h) => h.trim());
    const data = rows.slice(1).map((r) => {
      const o: Record<string, string> = {};
      header.forEach((h, i) => { o[h] = (r[i] ?? "").trim(); });
      return o;
    });
    setPreview(data);
    setErrors([]);
    setResult(null);
  }

  async function runImport() {
    if (!preview) return;
    setBusy(true);
    const payloads: Record<string, unknown>[] = [];
    const errs: string[] = [];
    let skipped = 0;
    for (let i = 0; i < preview.length; i++) {
      try {
        const res = await transform(preview[i], i);
        if ("skip" in res && res.skip) { skipped++; continue; }
        if ("ok" in res && res.ok) payloads.push(res.payload);
        else if ("ok" in res && !res.ok) errs.push(`Ligne ${i + 2}: ${res.error}`);
      } catch (e) { errs.push(`Ligne ${i + 2}: ${(e as Error).message}`); }
    }
    setErrors(errs);
    if (payloads.length === 0) {
      setBusy(false);
      if (errs.length) toast.error(`${errs.length} ligne(s) en erreur, aucune importée.`);
      else toast.error("Aucune ligne valide à importer.");
      return;
    }
    try {
      const r = await onCommit(payloads);
      r.skipped += skipped;
      r.errors = [...errs, ...r.errors];
      setResult(r);
      toast.success(`${r.inserted} ligne(s) importée(s)`);
      onDone?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <AdminModal open={open} onClose={() => { reset(); onClose(); }} title={`Importer — ${title}`}>
      <div className="space-y-4 max-h-[75vh] overflow-y-auto">
        <div className="rounded-xl bg-primary-soft/60 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-primary mb-1">Format attendu</p>
          <p>Fichier CSV avec en-têtes en première ligne. Colonnes :</p>
          <ul className="mt-2 space-y-0.5">
            {columns.map((c) => (
              <li key={c.key}>
                <code className="text-[11px] bg-card px-1.5 py-0.5 rounded border border-border">{c.key}</code>
                <span className="ml-2">{c.label}{c.required && <span className="text-destructive"> *</span>}</span>
                {c.hint && <span className="text-muted-foreground italic"> — {c.hint}</span>}
              </li>
            ))}
          </ul>
          <button onClick={downloadTemplate} className="mt-3 inline-flex items-center gap-1.5 text-primary font-semibold hover:underline">
            <Download className="h-3.5 w-3.5" /> Télécharger un modèle CSV
          </button>
        </div>

        {!preview ? (
          <>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary-soft/30 transition"
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Cliquer pour téléverser un fichier CSV</p>
              <p className="text-xs text-muted-foreground mt-1">ou collez le contenu ci-dessous</p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            </div>
            <textarea
              value={raw} onChange={(e) => setRaw(e.target.value)}
              placeholder={columns.map((c) => c.key).join(",") + "\n..."}
              className="w-full h-32 px-3 py-2 rounded-lg bg-background border border-border text-xs font-mono"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => onClose()} className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-secondary">Annuler</button>
              <button onClick={() => doParse(raw)} disabled={!raw.trim()} className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">Analyser</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold inline-flex items-center gap-1.5"><FileText className="h-4 w-4" /> {preview.length} ligne(s) détectée(s)</div>
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><X className="h-3 w-3" /> Recommencer</button>
            </div>
            <div className="overflow-x-auto border border-border rounded-lg max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-secondary/60 sticky top-0">
                  <tr>{columns.map((c) => <th key={c.key} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">{c.key}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {columns.map((c) => <td key={c.key} className="px-2 py-1.5 whitespace-nowrap max-w-[200px] truncate">{r[c.key] ?? ""}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 50 && <div className="text-xs text-muted-foreground text-center py-2">… et {preview.length - 50} de plus</div>}
            </div>

            {result && (
              <div className="rounded-xl border border-border p-3 space-y-1 text-sm">
                <div className="inline-flex items-center gap-2 text-emerald-700 font-semibold"><CheckCircle2 className="h-4 w-4" /> {result.inserted} ligne(s) importée(s)</div>
                {result.skipped > 0 && <div className="text-muted-foreground text-xs">{result.skipped} ligne(s) ignorée(s)</div>}
              </div>
            )}

            {errors.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 max-h-40 overflow-y-auto">
                <div className="inline-flex items-center gap-2 text-destructive font-semibold text-sm mb-2"><AlertCircle className="h-4 w-4" /> {errors.length} erreur(s)</div>
                <ul className="space-y-0.5 text-xs text-destructive">
                  {errors.slice(0, 30).map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { reset(); onClose(); }} className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-secondary">Fermer</button>
              {!result && (
                <button onClick={runImport} disabled={busy} className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5">
                  <Upload className="h-4 w-4" /> {busy ? "Import en cours…" : `Importer ${preview.length} ligne(s)`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </AdminModal>
  );
}