import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Eye, ArrowRight, Sparkles, Users, GraduationCap, Globe2 } from "lucide-react";
import { FiadLogo } from "@/components/fiad-logo";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft via-background to-primary-soft">
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between">
        <FiadLogo to="/" />
        <div className="flex items-center gap-2">
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary">
            Se connecter
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-[var(--shadow-card)]"
          >
            Adhérer
          </Link>
        </div>
      </header>

      <section className="px-6 lg:px-12 pt-12 lg:pt-20 pb-24 max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Plateforme officielle La PaDI
          </div>
          <h1 className="mt-6 text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-foreground leading-[1.05]">
            La maison numérique des
            <span className="block text-primary">Ambassadeurs du Développement.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            Centralisez les adhésions, suivez les formations, animez les événements et gérez les
            cotisations de l'association — au sein d'une console pensée pour les leaders La PaDI.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-elevated)] hover:bg-primary/90 transition"
            >
              Commencer mon adhésion <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-card text-foreground font-semibold border border-border hover:bg-secondary transition"
            >
              <Eye className="h-4 w-4" /> Voir la console
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5 grid gap-4">
          {[
            { icon: Users, title: "Gestion des membres", desc: "Adhésions, statuts, catégories et avantages — tout au même endroit." },
            { icon: GraduationCap, title: "Cours & formations", desc: "Sessions hebdomadaires, replays, suivi des progrès et certificats." },
            { icon: Globe2, title: "Réseaux de proximité", desc: "Groupes locaux, messagerie interne et accès direct au Président Mondial." },
          ].map((f) => (
            <div key={f.title} className="bg-card rounded-2xl border border-border p-5 flex items-start gap-4 shadow-[var(--shadow-card)]">
              <div className="h-11 w-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{f.title}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
