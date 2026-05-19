import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FiadLogo } from "@/components/fiad-logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — FIAD-Monde" },
      { name: "description", content: "Connectez-vous à votre espace membre FIAD-Monde." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid place-items-center bg-primary-soft px-6">
      <div className="w-full max-w-md bg-card rounded-3xl p-10 shadow-[var(--shadow-elevated)]">
        <FiadLogo to="/" />
        <h1 className="mt-8 text-2xl font-display font-extrabold">Bon retour parmi nous</h1>
        <p className="text-sm text-muted-foreground mt-1">Accédez à votre espace Ambassadeur.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-12 px-4 rounded-xl bg-secondary border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-12 px-4 rounded-xl bg-secondary border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            {submitting ? "Connexion…" : "Se connecter"}
          </button>
          <div className="text-center text-sm text-muted-foreground">
            Pas encore membre ? <Link to="/register" className="text-primary font-semibold hover:underline">Adhérer</Link>
          </div>
        </form>
      </div>
    </div>
  );
}