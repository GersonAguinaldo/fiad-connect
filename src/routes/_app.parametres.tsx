import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings, Save, Wallet, Timer } from "lucide-react";
import { toast } from "sonner";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { Field, inputCls } from "@/components/admin-modal";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_AMBASSADOR_FEE_AMOUNT,
  DEFAULT_AMBASSADOR_FEE_CURRENCY,
} from "@/lib/membership";

export const Route = createFileRoute("/_app/parametres")({
  head: () => ({ meta: [{ title: "Parametres - La PaDI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [amount, setAmount] = useState(String(DEFAULT_AMBASSADOR_FEE_AMOUNT));
  const [currency, setCurrency] = useState(DEFAULT_AMBASSADOR_FEE_CURRENCY);
  const [period, setPeriod] = useState("12");
  const [grace, setGrace] = useState("30");
  const [reminder, setReminder] = useState("15");
  const [autoStatus, setAutoStatus] = useState(true);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select(
        "ambassador_fee_amount, ambassador_fee_currency, dues_period_months, grace_period_days, reminder_days_before, auto_status_enabled, last_status_run_at",
      )
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAmount(String(Number(data.ambassador_fee_amount)));
          setCurrency(data.ambassador_fee_currency);
          setPeriod(String(data.dues_period_months ?? 12));
          setGrace(String(data.grace_period_days ?? 30));
          setReminder(String(data.reminder_days_before ?? 15));
          setAutoStatus(data.auto_status_enabled ?? true);
          setLastRun(data.last_status_run_at ?? null);
        }
        setLoading(false);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Le montant de la cotisation doit etre superieur a zero.");
      return;
    }

    if (!currency.trim()) {
      toast.error("La devise est obligatoire.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert({
      id: true,
      ambassador_fee_amount: parsed,
      ambassador_fee_currency: currency.trim().toUpperCase(),
      dues_period_months: Math.max(1, Number(period) || 12),
      grace_period_days: Math.max(0, Number(grace) || 0),
      reminder_days_before: Math.max(0, Number(reminder) || 0),
      auto_status_enabled: autoStatus,
      updated_by: user?.id ?? null,
    } as never);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Parametres enregistres.");
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="max-w-[980px] mx-auto">
      <PageHeader
        icon={<Settings className="h-6 w-6" />}
        eyebrow="Administration"
        title="Parametres"
        subtitle="Definissez ici le montant applique a la cotisation ambassadeur."
      />

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <Card>
          <form onSubmit={save} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Montant de cotisation">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={inputCls}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <Field label="Devise">
                <input
                  className={inputCls}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="XOF"
                  maxLength={5}
                />
              </Field>
            </div>

            <div className="rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
              Ce montant est reutilise dans le formulaire d'inscription et dans l'espace membre
              pour permettre aux personnes de regler leur cotisation plus tard.
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="h-4 w-4 text-primary" />
                <h2 className="font-display font-bold text-foreground">Automatisation des statuts</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Chaque nuit, les ambassadeurs dont la cotisation reste impayee au-dela du delai de
                grace passent automatiquement en « Inactif ». Une relance leur est envoyee avant
                l'echeance.
              </p>

              <label className="flex items-center gap-3 text-sm mb-4">
                <input
                  type="checkbox"
                  checked={autoStatus}
                  onChange={(e) => setAutoStatus(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary,#046bd2)]"
                />
                Activer la bascule automatique des statuts
              </label>

              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Periodicite (mois)">
                  <input type="number" min="1" className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)} />
                </Field>
                <Field label="Delai de grace (jours)">
                  <input type="number" min="0" className={inputCls} value={grace} onChange={(e) => setGrace(e.target.value)} />
                </Field>
                <Field label="Relance avant echeance (jours)">
                  <input type="number" min="0" className={inputCls} value={reminder} onChange={(e) => setReminder(e.target.value)} />
                </Field>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Dernier passage automatique :{" "}
                {lastRun ? new Date(lastRun).toLocaleString("fr-FR") : "jamais execute"}
              </p>
            </div>

            <div className="flex justify-end">
              <PrimaryBtn type="submit" disabled={saving}>
                <span className="inline-flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </span>
              </PrimaryBtn>
            </div>
          </form>
        </Card>

        <Card>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Montant actuellement diffuse</div>
              <div className="mt-2 text-3xl font-display font-extrabold text-foreground">
                {new Intl.NumberFormat("fr-FR").format(Number(amount || 0))} {currency || "XOF"}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <p>Les nouveaux inscrits voient ce montant au moment de choisir s'ils deviennent ambassadeurs.</p>
            <p>Les membres deja crees pourront aussi le regler plus tard depuis l'onglet principal de leur tableau de bord.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
