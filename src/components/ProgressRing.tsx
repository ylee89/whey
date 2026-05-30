interface Props {
  value: number;
  goal: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
  trackClass?: string;
  ringClass?: string;
  labelClass?: string;
  className?: string;
}

export function ProgressRing({
  value,
  goal,
  size = 112,
  stroke = 10,
  showLabel = true,
  trackClass = "stroke-brand-ink/10",
  ringClass = "stroke-brand-ink",
  labelClass = "text-brand-ink",
  className,
}: Props) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - pct);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          className={trackClass}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className={`${ringClass} transition-[stroke-dasharray] duration-700 ease-out`}
        />
      </svg>
      {showLabel && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center ${labelClass}`}>
          <span className="text-2xl font-semibold leading-none">{Math.round(value)}</span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider opacity-60">
            grams
          </span>
        </div>
      )}
    </div>
  );
}
