import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Search as SearchIcon, Clock, Globe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FiadLogo } from "@/components/fiad-logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Adhérer à La PaDI" },
      { name: "description", content: "Inscription en ligne à l'association La PaDI — création de compte, paiement de la cotisation et accès aux services." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accept) {
      toast.error("Veuillez accepter les conditions.");
      return;
    }
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { first_name: firstName, last_name: lastName },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Compte créé ! Vérifiez votre email pour confirmer votre adresse.");
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-primary-soft px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <FiadLogo to="/" />

        <div className="mt-8 grid lg:grid-cols-2 gap-12 items-center">
          {/* Form card */}
          <div className="bg-card rounded-3xl p-8 lg:p-10 shadow-[var(--shadow-elevated)]">
            <h1 className="text-3xl font-display font-extrabold text-foreground">
              Commencez votre parcours
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Rejoignez les Ambassadeurs du Développement.
            </p>

            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Prénom" placeholder="Latévi" value={firstName} onChange={setFirstName} required />
                <Field label="Nom" placeholder="LAWSON" value={lastName} onChange={setLastName} required />
              </div>
              <Field label="Email" type="email" placeholder="exemple@gmail.com" value={email} onChange={setEmail} required />
              <div>
                <label className="text-sm font-medium text-foreground">Mot de passe</label>
                <div className="mt-1.5 relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="Au moins 8 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-12 px-4 pr-12 rounded-xl bg-secondary border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <label className="flex items-start gap-2.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={accept}
                  onChange={(e) => setAccept(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-[var(--primary)]"
                />
                <span>
                  J'accepte les{" "}
                  <a className="text-primary font-medium hover:underline" href="#">Conditions d'utilisation</a> et la{" "}
                  <a className="text-primary font-medium hover:underline" href="#">Politique de confidentialité</a>.
                </span>
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition shadow-[var(--shadow-card)] disabled:opacity-60"
              >
                {submitting ? "Inscription…" : "S'inscrire"}
              </button>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex-1 h-px bg-border" />
                OU
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="flex items-center justify-center gap-3">
                <SocialBtn label="G" color="oklch(0.65 0.18 25)" />
                <SocialBtn label="f" color="oklch(0.5 0.18 255)" />
                <SocialBtn label="" color="oklch(0.3 0 0)" />
              </div>
              <div className="text-center text-sm text-muted-foreground">
                Déjà membre ?{" "}
                <Link to="/login" className="text-primary font-semibold hover:underline">Se connecter</Link>
              </div>
            </form>
          </div>

          {/* Right side */}
          <div className="hidden lg:block px-8">
            <h2 className="text-4xl font-display font-extrabold text-foreground">Rejoignez-nous</h2>
            <svg viewBox="0 0 120 10" className="h-3 w-44 mt-2 text-primary">
              <path d="M2 6 Q 30 -2, 60 5 T 118 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <ul className="mt-10 space-y-7">
              <Perk icon={SearchIcon} color="oklch(0.7 0.13 175)" text="Accédez aux cours hebdomadaires et au catalogue de formations." />
              <Perk icon={Clock} color="oklch(0.75 0.15 25)" text="Apprenez à votre rythme — replays et ressources accessibles 24/7." />
              <Perk icon={Globe} color="oklch(0.6 0.22 295)" text="Échangez avec une communauté mondiale d'Ambassadeurs." />
            </ul>
          </div>
        </div>
      </div>
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
  onChange?: (v: string) => void;
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
        className="mt-1.5 w-full h-12 px-4 rounded-xl bg-secondary border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm"
      />
    </div>
  );
}

function SocialBtn({ label, color }: { label: string; color: string }) {
  return (
    <button
      type="button"
      className="h-11 w-11 rounded-full bg-secondary hover:bg-accent flex items-center justify-center font-bold text-base"
      style={{ color }}
    >
      {label || "\uf179"}
    </button>
  );
}

function Perk({ icon: Icon, color, text }: { icon: typeof Clock; color: string; text: string }) {
  return (
    <li className="flex items-start gap-5">
      <div
        className="h-14 w-14 rounded-full flex items-center justify-center shrink-0 shadow-[var(--shadow-card)]"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 18%, white)`, color }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <p className="pt-3 text-base text-foreground">{text}</p>
    </li>
  );
}