export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const init = name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  const hues = [255, 165, 75, 295, 25, 195];
  const hue = hues[(name.charCodeAt(0) || 0) % hues.length];
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-full object-cover shrink-0"
        style={{ height: size, width: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ height: size, width: size, fontSize: size * 0.35, background: `linear-gradient(135deg, oklch(0.65 0.18 ${hue}), oklch(0.45 0.2 ${hue + 20}))` }}
    >
      {init}
    </div>
  );
}