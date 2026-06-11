import { FiadLogo } from "@/components/fiad-logo";
import { PaymentFlow } from "@/components/payment-flow";
import authBg from "@/assets/auth-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import {
  AMBASSADOR_CATEGORY,
  DEFAULT_AMBASSADOR_FEE_AMOUNT,
  DEFAULT_AMBASSADOR_FEE_CURRENCY,
  getCotisationReason,
} from "@/lib/membership";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Globe,
  Phone,
  Search as SearchIcon,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Adherer a La PaDI" },
      {
        name: "description",
        content:
          "Inscription en ligne a l'association La PaDI avec formulaire multi-etapes, profil complet et cotisation ambassadeur.",
      },
    ],
  }),
  component: RegisterPage,
});

type RegisterForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneCountry: string;
  phone: string;
  sex: string;
  birthDate: string;
  birthPlace: string;
  country: string;
  city: string;
  address: string;
  wantsAmbassador: boolean;
  accept: boolean;
};

type AppSettings = {
  ambassador_fee_amount: number;
  ambassador_fee_currency: string;
};

const STEPS = [
  { id: 0, title: "Compte", hint: "Identifiants de connexion" },
  { id: 1, title: "Identite", hint: "Informations personnelles" },
  { id: 2, title: "Coordonnees", hint: "Adresse et localisation" },
  { id: 3, title: "Adhesion", hint: "Choix ambassadeur et validation" },
] as const;

const COUNTRY_CITY_OPTIONS = {
  GA: ["Libreville", "Port-Gentil", "Franceville", "Oyem", "Lambarene", "Mouila"],
  CM: ["Yaounde", "Douala", "Bafoussam", "Garoua", "Bamenda", "Maroua"],
  CG: ["Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi", "Owando"],
  CD: ["Kinshasa", "Lubumbashi", "Goma", "Bukavu", "Kisangani", "Matadi"],
  CI: ["Abidjan", "Yamoussoukro", "Bouake", "San-Pedro", "Korhogo", "Daloa"],
  SN: ["Dakar", "Thies", "Saint-Louis", "Kaolack", "Ziguinchor", "Touba"],
  TG: ["Lome", "Sokode", "Kara", "Kpalime", "Atakpame"],
  BJ: ["Cotonou", "Porto-Novo", "Parakou", "Abomey-Calavi", "Djougou"],
  FR: ["Paris", "Lyon", "Marseille", "Toulouse", "Lille", "Bordeaux"],
  US: ["New York", "Washington", "Los Angeles", "Chicago", "Houston", "Atlanta"],
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  ambassador_fee_amount: DEFAULT_AMBASSADOR_FEE_AMOUNT,
  ambassador_fee_currency: DEFAULT_AMBASSADOR_FEE_CURRENCY,
};

const PHONE_COUNTRIES = [
  { value: "GA", label: "Gabon", flag: "🇬🇦", dialCode: "+241" },
  { value: "CM", label: "Cameroun", flag: "🇨🇲", dialCode: "+237" },
  { value: "CG", label: "Congo", flag: "🇨🇬", dialCode: "+242" },
  { value: "CD", label: "RDC", flag: "🇨🇩", dialCode: "+243" },
  { value: "CI", label: "Cote d'Ivoire", flag: "🇨🇮", dialCode: "+225" },
  { value: "SN", label: "Senegal", flag: "🇸🇳", dialCode: "+221" },
  { value: "TG", label: "Togo", flag: "🇹🇬", dialCode: "+228" },
  { value: "BJ", label: "Benin", flag: "🇧🇯", dialCode: "+229" },
  { value: "FR", label: "France", flag: "🇫🇷", dialCode: "+33" },
  { value: "US", label: "Etats-Unis", flag: "🇺🇸", dialCode: "+1" },
] as const;

function RegisterPage() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [form, setForm] = useState<RegisterForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneCountry: "GA",
    phone: "",
    sex: "",
    birthDate: "",
    birthPlace: "",
    country: "",
    city: "",
    address: "",
    wantsAmbassador: true,
    accept: true,
  });

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("ambassador_fee_amount, ambassador_fee_currency")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings({
            ambassador_fee_amount: Number(data.ambassador_fee_amount),
            ambassador_fee_currency: data.ambassador_fee_currency,
          });
        }
      });
  }, []);

  const feeLabel = useMemo(
    () =>
      `${new Intl.NumberFormat("fr-FR").format(settings.ambassador_fee_amount)} ${settings.ambassador_fee_currency}`,
    [settings],
  );
  const selectedPhoneCountry =
    PHONE_COUNTRIES.find((country) => country.value === form.phoneCountry) ?? PHONE_COUNTRIES[0];
  const selectedResidenceCountry =
    PHONE_COUNTRIES.find((country) => country.label === form.country) ?? null;
  const cityOptions = selectedResidenceCountry
    ? COUNTRY_CITY_OPTIONS[selectedResidenceCountry.value] ?? []
    : [];
  const fullPhone = `${selectedPhoneCountry.dialCode} ${form.phone.trim()}`.trim();

  useEffect(() => {
    if (selectedResidenceCountry && form.city && !cityOptions.includes(form.city as never)) {
      update("city", "");
    }
  }, [form.city, cityOptions, selectedResidenceCountry]);

  function update<K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateCurrentStep(currentStep = step) {
    if (currentStep === 0) {
      if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
        toast.error("Renseignez votre nom, prenom et email.");
        return false;
      }
      if (form.password.length < 8) {
        toast.error("Le mot de passe doit contenir au moins 8 caracteres.");
        return false;
      }
    }

    if (currentStep === 1) {
      if (!form.phone.trim() || !form.sex || !form.birthDate || !form.birthPlace.trim()) {
        toast.error("Completez vos informations personnelles.");
        return false;
      }
      if (form.phone.replace(/\D/g, "").length < 6) {
        toast.error("Le numero de telephone est incomplet.");
        return false;
      }
    }

    if (currentStep === 2) {
      if (!form.country.trim() || !form.city.trim() || !form.address.trim()) {
        toast.error("Completez votre adresse et votre localisation.");
        return false;
      }
    }

    if (currentStep === 3 && !form.accept) {
      toast.error("Veuillez accepter les conditions.");
      return false;
    }

    return true;
  }

  function nextStep() {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateCurrentStep(3)) return;

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/mon-espace`,
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          phone: fullPhone,
          sex: form.sex,
          birth_date: form.birthDate,
          birth_place: form.birthPlace.trim(),
          country: form.country.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          membership_type: "Classique",
        },
      },
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const userId = data.user?.id ?? null;
    const hasSession = !!data.session;

    if (form.wantsAmbassador && userId && hasSession) {
      setCreatedUserId(userId);
      setPaymentOpen(true);
      toast.success("Compte cree. Finalisez maintenant votre cotisation ambassadeur.");
      return;
    }

    if (form.wantsAmbassador && !hasSession) {
      toast.success(
        "Compte cree. Confirmez votre email puis connectez-vous pour regler votre cotisation ambassadeur.",
      );
      navigate({ to: "/login" });
      return;
    }

    toast.success("Compte cree. Verifiez votre email pour confirmer votre adresse.");
    navigate({ to: "/login" });
  }

  async function handleCotisationSuccess() {
    if (!createdUserId) return;

    const { error } = await supabase
      .from("profiles")
      .update({ category: AMBASSADOR_CATEGORY } as never)
      .eq("id", createdUserId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Cotisation enregistree. Votre espace membre est pret.");
    setPaymentOpen(false);
    navigate({ to: "/mon-espace" });
  }

  return (
    <div
      className="min-h-screen px-5 py-6 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.55)), url(${authBg})` }}
    >
      <div className="max-w-6xl mx-auto">
        <FiadLogo to="/" />

        <div className="mt-5 grid lg:grid-cols-[1.18fr_0.82fr] gap-6 items-start">
          <div className="bg-card rounded-[2rem] p-6 lg:p-7 shadow-[var(--shadow-elevated)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-[2rem] font-display font-extrabold text-foreground">
                  Inscription en plusieurs etapes
                </h1>
                <p className="text-[15px] text-muted-foreground mt-2 max-w-xl leading-relaxed">
                  Nous recuperons tout de suite les informations utiles a votre profil, puis nous
                  vous proposons la cotisation ambassadeur a la fin du parcours.
                </p>
              </div>
              <div className="hidden md:flex h-12 w-12 rounded-2xl bg-primary-soft text-primary items-center justify-center">
                <UserRound className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 grid md:grid-cols-4 gap-2.5">
              {STEPS.map((item, index) => {
                const active = index === step;
                const done = index < step;
                return (
                  <div
                    key={item.id}
                    className={
                      "rounded-2xl border px-3 py-3 transition " +
                      (active
                        ? "border-primary bg-primary-soft"
                        : done
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-border bg-background")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={
                          "h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold " +
                          (done
                            ? "bg-emerald-600 text-white"
                            : active
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground")
                        }
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Etape {index + 1}
                      </span>
                    </div>
                    <div className="mt-2 font-semibold text-foreground text-[15px] leading-tight">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      {item.hint}
                    </div>
                  </div>
                );
              })}
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {step === 0 && (
                <section className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field
                      label="Prenom"
                      placeholder="Latevi"
                      value={form.firstName}
                      onChange={(value) => update("firstName", value)}
                      required
                    />
                    <Field
                      label="Nom"
                      placeholder="LAWSON"
                      value={form.lastName}
                      onChange={(value) => update("lastName", value)}
                      required
                    />
                    <Field
                      label="Email"
                      type="email"
                      placeholder="exemple@gmail.com"
                      value={form.email}
                      onChange={(value) => update("email", value)}
                      required
                    />
                    <div>
                      <label className="text-sm font-medium text-foreground">Mot de passe</label>
                      <div className="mt-1.5 relative">
                        <input
                          type={showPwd ? "text" : "password"}
                          placeholder="Au moins 8 caracteres"
                          value={form.password}
                          onChange={(e) => update("password", e.target.value)}
                          required
                          className="w-full h-11 px-4 pr-12 rounded-xl bg-secondary border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((current) => !current)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ce mot de passe sera utilise pour acceder a votre espace membre.
                  </p>
                </section>
              )}

              {step === 1 && (
                <section className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <PhoneField
                      label="Telephone"
                      country={selectedPhoneCountry}
                      countryValue={form.phoneCountry}
                      value={form.phone}
                      onCountryChange={(value) => {
                        update("phoneCountry", value);
                        const nextCountry = PHONE_COUNTRIES.find(
                          (country) => country.value === value,
                        );
                        if (nextCountry && !form.country.trim())
                          update("country", nextCountry.label);
                      }}
                      onChange={(value) => update("phone", value)}
                    />
                    <SelectField
                      label="Sexe"
                      value={form.sex}
                      onChange={(value) => update("sex", value)}
                      options={[
                        { value: "", label: "Selectionner" },
                        { value: "Masculin", label: "Masculin" },
                        { value: "Feminin", label: "Feminin" },
                        { value: "Autre", label: "Autre" },
                      ]}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field
                      label="Date de naissance"
                      type="date"
                      value={form.birthDate}
                      onChange={(value) => update("birthDate", value)}
                      required
                    />
                    <Field
                      label="Lieu de naissance"
                      placeholder="Libreville"
                      value={form.birthPlace}
                      onChange={(value) => update("birthPlace", value)}
                      required
                    />
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <SelectField
                      label="Pays"
                      value={form.country}
                      onChange={(value) => {
                        update("country", value);
                        update("city", "");
                      }}
                      options={[
                        { value: "", label: "Selectionner un pays" },
                        ...PHONE_COUNTRIES.map((country) => ({
                          value: country.label,
                          label: country.label,
                        })),
                      ]}
                    />
                    <SelectField
                      label="Ville"
                      value={form.city}
                      disabled={!form.country}
                      onChange={(value) => update("city", value)}
                      options={[
                        {
                          value: "",
                          label: form.country ? "Selectionner une ville" : "Choisir d'abord un pays",
                        },
                        ...cityOptions.map((city) => ({ value: city, label: city })),
                      ]}
                    />
                  </div>
                  <Field
                    label="Adresse complete"
                    placeholder="Quartier, avenue, numero, reference"
                    value={form.address}
                    onChange={(value) => update("address", value)}
                    required
                  />
                </section>
              )}

              {step === 3 && (
                <section className="space-y-5">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          Souhaitez-vous devenir ambassadeur maintenant ?
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Si oui, la cotisation definie par l'administration est de {feeLabel}.
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid md:grid-cols-2 gap-3">
                      <ChoiceCard
                        active={form.wantsAmbassador}
                        title="Oui, je cotise maintenant"
                        description="Vous passez directement au paiement a la fin de la creation du compte."
                        onClick={() => update("wantsAmbassador", true)}
                      />
                      <ChoiceCard
                        active={!form.wantsAmbassador}
                        title="Non, plus tard"
                        description="Votre compte sera cree sans cotisation. Vous pourrez payer ensuite depuis votre espace."
                        onClick={() => update("wantsAmbassador", false)}
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.accept}
                      onChange={(e) => update("accept", e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded accent-[var(--primary)]"
                    />
                    <span>
                      J'accepte les{" "}
                      <a className="text-primary font-medium hover:underline" href="#">
                        Conditions d'utilisation
                      </a>{" "}
                      et la{" "}
                      <a className="text-primary font-medium hover:underline" href="#">
                        Politique de confidentialite
                      </a>
                      .
                    </span>
                  </label>

                  <div className="rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
                    <div className="inline-flex items-center gap-2 font-medium text-foreground">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Ce qui se passe ensuite
                    </div>
                    <p className="mt-2">
                      Votre profil sera cree avec toutes les informations saisies. Si vous
                      choisissez la cotisation maintenant, le paiement sera lance immediatement
                      quand la session utilisateur est disponible.
                    </p>
                  </div>
                </section>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <div className="text-sm text-muted-foreground">
                  Deja membre ?{" "}
                  <Link to="/login" className="text-primary font-semibold hover:underline">
                    Se connecter
                  </Link>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={() => setStep((current) => Math.max(current - 1, 0))}
                      className="h-10 px-4 rounded-xl border border-border text-sm font-semibold hover:bg-secondary inline-flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Retour
                    </button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 inline-flex items-center gap-2 shadow-[var(--shadow-card)]"
                    >
                      Continuer
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-[var(--shadow-card)] disabled:opacity-60"
                    >
                      {submitting ? "Creation du compte..." : "Finaliser l'inscription"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-[2rem] border border-border p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-[1.9rem] font-display font-extrabold text-foreground">
                Pourquoi ce nouveau parcours ?
              </h2>
              <ul className="mt-5 space-y-4">
                <Perk
                  icon={SearchIcon}
                  color="oklch(0.7 0.13 175)"
                  text="Le profil membre est complete des l'inscription, sans reprise manuelle plus tard."
                />
                <Perk
                  icon={Clock}
                  color="oklch(0.75 0.15 25)"
                  text="La cotisation ambassadeur est proposee a la fin, sans bloquer ceux qui veulent adherer d'abord."
                />
                <Perk
                  icon={Globe}
                  color="oklch(0.6 0.22 295)"
                  text="Le membre peut toujours regler sa cotisation plus tard depuis son tableau de bord."
                />
              </ul>
            </div>

            <div className="bg-gradient-to-br from-primary to-[oklch(0.45_0.22_265)] rounded-[2rem] p-5 text-primary-foreground shadow-[var(--shadow-elevated)]">
              <div className="inline-flex items-center gap-2 text-sm opacity-90">
                <Wallet className="h-4 w-4" />
                Cotisation ambassadeur
              </div>
              <div className="mt-3 text-3xl font-display font-extrabold">{feeLabel}</div>
              <p className="mt-3 text-sm/relaxed opacity-90">
                Ce montant est pilote par l'administration et reutilise dans l'inscription comme
                dans l'espace membre.
              </p>
            </div>
          </div>
        </div>
      </div>

      {createdUserId && (
        <PaymentFlow
          open={paymentOpen}
          onClose={() => {
            setPaymentOpen(false);
            navigate({ to: "/mon-espace" });
          }}
          userId={createdUserId}
          amount={settings.ambassador_fee_amount}
          currency={settings.ambassador_fee_currency}
          reason={getCotisationReason()}
          onSuccess={handleCotisationSuccess}
        />
      )}
    </div>
  );
}

function Field({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        className="mt-1.5 w-full h-11 px-4 rounded-xl bg-secondary border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full h-11 px-4 rounded-xl bg-secondary border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PhoneField({
  label,
  country,
  countryValue,
  value,
  onCountryChange,
  onChange,
}: {
  label: string;
  country: (typeof PHONE_COUNTRIES)[number];
  countryValue: string;
  value: string;
  onCountryChange: (value: string) => void;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="mt-1.5 grid grid-cols-[76px_minmax(0,2.3fr)] gap-2">
        <div className="h-11 rounded-xl bg-secondary border border-transparent px-3 flex items-center gap-2">
          <select
            value={countryValue}
            onChange={(e) => onCountryChange(e.target.value)}
            className="bg-transparent text-sm font-medium text-foreground outline-none flex-1 min-w-0"
          >
            {PHONE_COUNTRIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
            {country.dialCode}
          </span>
          <input
            type="tel"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="74 12 34 56"
            className="w-full h-11 pl-20 pr-4 rounded-xl bg-secondary border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm"
          />
        </div>
      </div>
      {/* <p className="mt-1.5 text-[11px] text-muted-foreground">
        L'indicatif du pays est applique automatiquement.
      </p> */}
    </div>
  );
}

function ChoiceCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-2xl border p-3.5 text-left transition " +
        (active
          ? "border-primary bg-primary-soft shadow-[var(--shadow-card)]"
          : "border-border bg-card hover:bg-secondary/50")
      }
    >
      <div className="font-semibold text-foreground text-[15px]">{title}</div>
      <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{description}</div>
    </button>
  );
}

function Perk({ icon: Icon, color, text }: { icon: typeof Clock; color: string; text: string }) {
  return (
    <li className="flex items-start gap-5">
      <div
        className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 shadow-[var(--shadow-card)]"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 18%, white)`, color }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="pt-2 text-[15px] leading-relaxed text-foreground">{text}</p>
    </li>
  );
}
