import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateProteinGoal, type ActivityLevel, type GoalType } from "@/lib/goal";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — Whey" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const { t } = useT();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "other">("male");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<GoalType>("maintain");
  const [customGoal, setCustomGoal] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const activityOptions = useMemo<{ value: ActivityLevel; label: string; hint: string }[]>(() => [
    { value: "sedentary", label: t("act_sedentary"), hint: t("act_sedentary_h") },
    { value: "light", label: t("act_light"), hint: t("act_light_h") },
    { value: "moderate", label: t("act_moderate"), hint: t("act_moderate_h") },
    { value: "active", label: t("act_active"), hint: t("act_active_h") },
    { value: "very_active", label: t("act_very_active"), hint: t("act_very_active_h") },
  ], [t]);

  const goalOptions = useMemo<{ value: GoalType; label: string; emoji: string }[]>(() => [
    { value: "cut", label: t("goal_cut"), emoji: "🔻" },
    { value: "maintain", label: t("goal_maintain"), emoji: "⚖️" },
    { value: "bulk", label: t("goal_bulk"), emoji: "🔺" },
  ], [t]);

  const suggested = calculateProteinGoal(Number(weight), activity, goal);
  const finalGoal = customGoal ? Number(customGoal) : suggested;

  async function save() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("not_signed_in"));
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: name || user.email?.split("@")[0] || "Whey user",
        weight_kg: Number(weight) || null,
        height_cm: Number(height) || null,
        age: Number(age) || null,
        sex,
        activity_level: activity,
        goal_type: goal,
        protein_goal_g: finalGoal,
        onboarded: true,
      });
      if (error) throw error;
      toast.success(t("all_set"));
      navigate({ to: "/home", replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("save_failed"));
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    <div key="name" className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{t("onb_name_q")}</h2>
      <p className="text-sm text-muted-foreground">{t("onb_name_hint")}</p>
      <input className="w-full rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-border focus:ring-2 focus:ring-brand-ink focus:outline-none" placeholder={t("onb_your_name")} value={name} onChange={(e) => setName(e.target.value)} />
    </div>,
    <div key="stats" className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{t("onb_stats")}</h2>
      <p className="text-sm text-muted-foreground">{t("onb_stats_hint")}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("weight_kg")} value={weight} onChange={setWeight} type="number" />
        <Field label={t("height_cm")} value={height} onChange={setHeight} type="number" />
        <Field label={t("age")} value={age} onChange={setAge} type="number" />
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("sex")}</label>
          <select value={sex} onChange={(e) => setSex(e.target.value as "male" | "female" | "other")} className="mt-1 w-full rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-border focus:ring-2 focus:ring-brand-ink focus:outline-none">
            <option value="male">{t("sex_male")}</option><option value="female">{t("sex_female")}</option><option value="other">{t("sex_other")}</option>
          </select>
        </div>
      </div>
    </div>,
    <div key="activity" className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{t("onb_activity_q")}</h2>
      <div className="space-y-2">
        {activityOptions.map((o) => (
          <button key={o.value} onClick={() => setActivity(o.value)} className={`w-full text-left rounded-2xl p-4 ring-1 transition ${activity === o.value ? "bg-brand ring-brand-ink" : "bg-surface ring-border"}`}>
            <div className="font-medium">{o.label}</div>
            <div className="text-xs text-muted-foreground">{o.hint}</div>
          </button>
        ))}
      </div>
    </div>,
    <div key="goal" className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{t("onb_goal_q")}</h2>
      <div className="grid grid-cols-3 gap-3">
        {goalOptions.map((o) => (
          <button key={o.value} onClick={() => setGoal(o.value)} className={`rounded-2xl p-4 ring-1 transition flex flex-col items-center gap-1 ${goal === o.value ? "bg-brand ring-brand-ink" : "bg-surface ring-border"}`}>
            <div className="text-2xl">{o.emoji}</div>
            <div className="text-sm font-medium">{o.label}</div>
          </button>
        ))}
      </div>
    </div>,
    <div key="confirm" className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{t("onb_target")}</h2>
      <p className="text-sm text-muted-foreground">{t("onb_target_hint")}</p>
      <div className="rounded-[28px] bg-brand p-6 text-brand-ink">
        <div className="text-5xl font-bold">{suggested}<span className="text-2xl">g</span></div>
        <div className="text-sm font-medium opacity-70 mt-1">{t("protein_per_day")}</div>
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("override_optional")}</label>
        <input type="number" placeholder={String(suggested)} value={customGoal} onChange={(e) => setCustomGoal(e.target.value)} className="mt-1 w-full rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-border focus:ring-2 focus:ring-brand-ink focus:outline-none" />
      </div>
    </div>,
  ];

  const isLast = step === steps.length - 1;
  const canNext =
    (step === 0 && name.length > 0) ||
    (step === 1 && weight && height && age) ||
    step === 2 || step === 3 || step === 4;

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-10 max-w-md mx-auto w-full">
      <div className="flex gap-1.5 mb-8">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-ink" : "bg-border"}`} />
        ))}
      </div>
      <div className="flex-1">{steps[step]}</div>
      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="rounded-2xl bg-surface ring-1 ring-border px-5 py-3.5 text-sm font-medium">{t("back")}</button>
        )}
        <button
          disabled={!canNext || saving}
          onClick={() => (isLast ? save() : setStep(step + 1))}
          className="flex-1 rounded-2xl bg-foreground text-brand py-3.5 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? t("saving") : isLast ? t("find_my_whey") : t("continue")}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-border focus:ring-2 focus:ring-brand-ink focus:outline-none" />
    </div>
  );
}
