import { useEffect, useMemo, useState } from "react";
import { CreditCard, Smartphone, Building2, Loader2, CheckCircle2, XCircle, ShieldCheck, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminModal, Field, inputCls } from "./admin-modal";
import { PrimaryBtn } from "./page-stub";

type Method = "card" | "mobile" | "transfer";
type Step = "method" | "details" | "processing" | "success" | "failed";

export type PaymentResult = { transactionId: string; method: string; reference: string };

export function PaymentFlow({
  open,
  onClose,
  userId,
  amount,
  currency,
  reason,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  amount: number;
  currency: string;
  reason: string;
  onSuccess: (r: PaymentResult) => void | Promise<void>;
}) {
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<Method>("mobile");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [ref, setRef] = useState<string>("");

  // card
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  // mobile
  const [operator, setOperator] = useState("Orange Money");
  const [phone, setPhone] = useState("");
  // transfer
  const [iban, setIban] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("method"); setProgress(0); setErrorMsg(null); setTxId(null); setRef("");
      setCardName(""); setCardNumber(""); setCardExp(""); setCardCvv(""); setPhone(""); setIban("");
    }
  }, [open]);

  const methodLabel = useMemo(() => method === "card" ? "Carte bancaire" : method === "mobile" ? "Mobile Money" : "Virement", [method]);

  function validate(): string | null {
    if (method === "card") {
      const digits = cardNumber.replace(/\s+/g, "");
      if (cardName.trim().length < 3) return "Nom du titulaire requis";
      if (digits.length < 12 || digits.length > 19 || !/^\d+$/.test(digits)) return "Numéro de carte invalide";
      if (!/^\d{2}\/\d{2}$/.test(cardExp)) return "Expiration invalide (MM/AA)";
      if (!/^\d{3,4}$/.test(cardCvv)) return "CVV invalide";
    } else if (method === "mobile") {
      if (!/^\+?\d[\d\s]{6,}$/.test(phone)) return "Numéro de téléphone invalide";
    } else {
      if (iban.replace(/\s/g, "").length < 10) return "IBAN invalide";
    }
    return null;
  }

  async function startPayment() {
    const err = validate();
    if (err) { toast.error(err); return; }
    setErrorMsg(null);
    setStep("processing");
    setProgress(0);

    // Create pending transaction
    const reference = `FIAD-${Date.now().toString(36).toUpperCase()}`;
    setRef(reference);
    const { data: tx, error: txErr } = await supabase.from("transactions").insert({
      user_id: userId, reason, amount, currency, method: methodLabel, status: "En attente",
    } as never).select("id").single();
    if (txErr || !tx) { setStep("failed"); setErrorMsg(txErr?.message ?? "Échec de création"); return; }
    const id = (tx as { id: string }).id;
    setTxId(id);

    // simulate gateway stages
    const stages = [
      { p: 25, ms: 500, label: "Connexion au prestataire…" },
      { p: 55, ms: 700, label: "Vérification des informations…" },
      { p: 80, ms: 700, label: "Autorisation…" },
      { p: 100, ms: 500, label: "Finalisation…" },
    ];
    for (const s of stages) {
      await new Promise((r) => setTimeout(r, s.ms));
      setProgress(s.p);
    }

    // Simulated failure rules (deterministic & realistic)
    const digits = cardNumber.replace(/\s+/g, "");
    let failReason: string | null = null;
    if (method === "card" && digits.endsWith("0000")) failReason = "Carte refusée par la banque émettrice";
    if (method === "mobile" && phone.endsWith("0000")) failReason = "Solde insuffisant sur le compte mobile";
    if (method === "card" && cardCvv === "000") failReason = "Code de sécurité invalide";

    if (failReason) {
      await supabase.from("transactions").update({ status: "Échoué" } as never).eq("id", id);
      setErrorMsg(failReason);
      setStep("failed");
      return;
    }

    const { error: upErr } = await supabase.from("transactions").update({ status: "Réussi" } as never).eq("id", id);
    if (upErr) { setStep("failed"); setErrorMsg(upErr.message); return; }
    setStep("success");
    await onSuccess({ transactionId: id, method: methodLabel, reference });
  }

  function formatCard(v: string) {
    return v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  return (
    <AdminModal open={open} onClose={() => { if (step !== "processing") onClose(); }} title={step === "success" ? "Paiement confirmé" : step === "failed" ? "Paiement échoué" : "Paiement sécurisé"}>
      <div className="space-y-5">
        {/* Summary bar */}
        <div className="rounded-xl bg-primary-soft p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-primary font-bold">{reason}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Réf. {ref || "à générer"}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Montant</div>
            <div className="font-extrabold text-xl tabular-nums">{Number(amount).toLocaleString("fr-FR")} {currency}</div>
          </div>
        </div>

        {step === "method" && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "mobile", icon: Smartphone, label: "Mobile Money" },
                { id: "card", icon: CreditCard, label: "Carte" },
                { id: "transfer", icon: Building2, label: "Virement" },
              ] as const).map((m) => (
                <button key={m.id} onClick={() => setMethod(m.id)} className={"flex flex-col items-center gap-2 p-4 rounded-xl border text-xs font-semibold transition " + (method === m.id ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-secondary")}>
                  <m.icon className="h-5 w-5" /> {m.label}
                </button>
              ))}
            </div>
            <PrimaryBtn className="w-full" onClick={() => setStep("details")}>Continuer</PrimaryBtn>
            <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Environnement de simulation chiffré — aucune transaction réelle.</div>
          </>
        )}

        {step === "details" && (
          <>
            {method === "card" && (
              <div className="space-y-3">
                <Field label="Nom du titulaire"><input className={inputCls} value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Jean Dupont" /></Field>
                <Field label="Numéro de carte"><input className={inputCls + " tracking-wider"} value={cardNumber} onChange={(e) => setCardNumber(formatCard(e.target.value))} placeholder="4242 4242 4242 4242" inputMode="numeric" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expiration"><input className={inputCls} value={cardExp} onChange={(e) => { const v = e.target.value.replace(/\D/g,"").slice(0,4); setCardExp(v.length>2 ? `${v.slice(0,2)}/${v.slice(2)}` : v); }} placeholder="MM/AA" /></Field>
                  <Field label="CVV"><input className={inputCls} value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="123" /></Field>
                </div>
                <p className="text-[11px] text-muted-foreground">Astuce simulation : un numéro finissant par 0000 ou un CVV 000 sera refusé.</p>
              </div>
            )}
            {method === "mobile" && (
              <div className="space-y-3">
                <Field label="Opérateur">
                  <select className={inputCls} value={operator} onChange={(e) => setOperator(e.target.value)}>
                    {["Orange Money","MTN MoMo","Moov Money","Wave"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Numéro de téléphone"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 07 00 00 00 00" /></Field>
                <p className="text-[11px] text-muted-foreground">Vous recevrez une notification USSD simulée pour confirmer. Un numéro finissant par 0000 simule un solde insuffisant.</p>
              </div>
            )}
            {method === "transfer" && (
              <div className="space-y-3">
                <Field label="IBAN / Compte"><input className={inputCls} value={iban} onChange={(e) => setIban(e.target.value)} placeholder="CI93 CI16 0..." /></Field>
                <p className="text-[11px] text-muted-foreground">Le virement sera validé manuellement après réception.</p>
              </div>
            )}
            <div className="flex justify-between gap-2 pt-2">
              <button onClick={() => setStep("method")} className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-secondary">Retour</button>
              <PrimaryBtn onClick={startPayment}>Payer {Number(amount).toLocaleString("fr-FR")} {currency}</PrimaryBtn>
            </div>
          </>
        )}

        {step === "processing" && (
          <div className="py-6 flex flex-col items-center text-center gap-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <div className="text-sm font-medium">Traitement du paiement via {methodLabel}…</div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-xs text-muted-foreground">Ne fermez pas cette fenêtre.</div>
          </div>
        )}

        {step === "success" && (
          <div className="py-2 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-7 w-7 text-emerald-600" /></div>
            <div className="font-display font-bold text-lg">Paiement validé</div>
            <div className="rounded-xl border border-border w-full p-4 text-left text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground inline-flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5" /> Référence</span><span className="font-mono font-semibold">{ref}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground inline-flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Méthode</span><span className="font-semibold">{methodLabel}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Montant</span><span className="font-semibold">{Number(amount).toLocaleString("fr-FR")} {currency}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Transaction</span><span className="font-mono text-xs">{txId?.slice(0, 8)}</span></div>
            </div>
            <PrimaryBtn className="w-full" onClick={onClose}>Terminer</PrimaryBtn>
          </div>
        )}

        {step === "failed" && (
          <div className="py-2 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center"><XCircle className="h-7 w-7 text-destructive" /></div>
            <div className="font-display font-bold text-lg">Le paiement a échoué</div>
            <p className="text-sm text-muted-foreground">{errorMsg ?? "Une erreur est survenue."}</p>
            <div className="flex gap-2 w-full">
              <button onClick={onClose} className="flex-1 h-10 rounded-full border border-border text-sm font-medium hover:bg-secondary">Annuler</button>
              <PrimaryBtn className="flex-1" onClick={() => setStep("details")}>Réessayer</PrimaryBtn>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
}