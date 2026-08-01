import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FiadLogo } from "@/components/fiad-logo";
import { signIn, getCurrentUser } from "@/lib/auth-backend";
import { useAuth } from "@/hooks/use-auth";
import authBg from "@/assets/auth-bg.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — La PaDI" },
      { name: "description", content: "Connectez-vous à votre espace membre La PaDI." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      const current = await getCurrentUser();
      await refresh();
      navigate({ to: current?.role === "admin" ? "/dashboard" : "/mon-espace" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen grid place-items-center px-6 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `linear-gradient(rgba(15,23,42,0.45), rgba(15,23,42,0.45)), url(${authBg})` }}
    >
      <div className="w-full max-w-md bg-card/95 backdrop-blur rounded-3xl p-10 shadow-[var(--shadow-elevated)]">
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