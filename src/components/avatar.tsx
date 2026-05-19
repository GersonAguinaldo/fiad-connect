export function Avatar({ name }: { name: string }) {
  const init = name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  const hues = [255, 165, 75, 295, 25, 195];
  const hue = hues[(name.charCodeAt(0) || 0) % hues.length];
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
      style={{ background: `linear-gradient(135deg, oklch(0.65 0.18 ${hue}), oklch(0.45 0.2 ${hue + 20}))` }}
    >
      {init}
    </div>
  );
}