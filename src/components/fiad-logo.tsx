import { Link } from "@tanstack/react-router";
import logoUrl from "@/assets/lapadi-logo.png";

export function FiadLogo({ to = "/dashboard" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center group" aria-label="La PaDI">
      <img
        src={logoUrl}
        alt="La PaDI — Association internationale La Panafricaine du Développement Intégral"
        className="h-11 w-auto object-contain"
      />
    </Link>
  );
}