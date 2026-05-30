export function Avatar({ name, url, size = 48, rounded = "rounded-[18px]" }: { name: string; url?: string | null; size?: number; rounded?: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
  return (
    <div
      className={`${rounded} bg-brand-soft ring-1 ring-black/5 overflow-hidden grid place-items-center shrink-0`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-brand-ink font-semibold text-sm">{initials}</span>
      )}
    </div>
  );
}
