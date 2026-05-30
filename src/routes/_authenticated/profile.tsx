import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateProteinGoal, type ActivityLevel, type GoalType } from "@/lib/goal";
import { Avatar } from "@/components/Avatar";
import { toast } from "sonner";
import { LogOut, Camera, Loader2 } from "lucide-react";
import { useT, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Whey" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useT();
  const [profile, setProfile] = useState<{
    id: string; display_name: string; avatar_url: string | null;
    weight_kg: number | null; height_cm: number | null; age: number | null;
    sex: "male" | "female" | "other" | null;
    activity_level: ActivityLevel | null; goal_type: GoalType | null;
    protein_goal_g: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) setProfile(data as typeof profile extends infer T ? T : never);
    })();
  }, []);

  if (!profile) return <div className="p-10 text-center text-muted-foreground">{t("loading")}</div>;

  function set<K extends keyof NonNullable<typeof profile>>(k: K, v: NonNullable<typeof profile>[K]) {
    setProfile((p) => p ? { ...p, [k]: v } : p);
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: profile.display_name,
      weight_kg: profile.weight_kg,
      height_cm: profile.height_cm,
      age: profile.age,
      sex: profile.sex,
      activity_level: profile.activity_level,
      goal_type: profile.goal_type,
      protein_goal_g: profile.protein_goal_g,
    }).eq("id", profile.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success(t("saved"));
  }

  async function recalc() {
    if (!profile) return;
    if (!profile.weight_kg || !profile.activity_level || !profile.goal_type) return;
    const g = calculateProteinGoal(Number(profile.weight_kg), profile.activity_level, profile.goal_type);
    set("protein_goal_g", g);
    toast.success(t("suggested_g", { g }));
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;
    if (!file.type.startsWith("image/")) { toast.error(t("pick_image")); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t("max_5mb")); return; }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600", upsert: true, contentType: file.type,
    });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicUrl}?v=${Date.now()}`;
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    setUploading(false);
    if (updErr) { toast.error(updErr.message); return; }
    set("avatar_url", url);
    toast.success(t("avatar_updated"));
  }

  return (
    <div>
      <header className="pt-8 pb-6 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("profile")}</h1>
        <button onClick={signOut} className="size-9 rounded-full bg-surface grid place-items-center" aria-label={t("sign_out")}><LogOut className="size-4" /></button>
      </header>

      <section className="px-4 space-y-4">
        <div className="bg-surface rounded-3xl p-5 flex items-center gap-4">
          <label className="relative cursor-pointer group">
            <Avatar name={profile.display_name} url={profile.avatar_url} size={64} rounded="rounded-full" />
            <span className="absolute inset-0 rounded-full bg-black/40 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? <Loader2 className="size-5 text-white animate-spin" /> : <Camera className="size-5 text-white" />}
            </span>
            {uploading && (
              <span className="absolute inset-0 rounded-full bg-black/40 grid place-items-center">
                <Loader2 className="size-5 text-white animate-spin" />
              </span>
            )}
            <input type="file" accept="image/*" onChange={onAvatarChange} disabled={uploading} className="sr-only" />
          </label>
          <div>
            <p className="font-semibold text-lg">{profile.display_name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="bg-brand rounded-3xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60">{t("daily_protein_goal")}</p>
          <div className="flex items-end gap-1 mt-1">
            <input type="number" value={profile.protein_goal_g} onChange={(e) => set("protein_goal_g", Number(e.target.value))} className="text-4xl font-bold text-brand-ink bg-transparent w-24 focus:outline-none" />
            <span className="text-xl text-brand-ink/60 mb-1">g</span>
          </div>
          <button onClick={recalc} className="mt-2 text-xs font-medium text-brand-ink/80 underline-offset-4 hover:underline">{t("recalc_from_stats")}</button>
        </div>

        <Group title={t("profile")}>
          <Row label={t("name")}><input value={profile.display_name} onChange={(e) => set("display_name", e.target.value)} className="bg-transparent text-right focus:outline-none" /></Row>
          <Row label={t("language")}>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="bg-transparent text-right focus:outline-none">
              <option value="en">English</option>
              <option value="ko">한국어</option>
            </select>
          </Row>
        </Group>

        <Group title={t("health_factors")}>
          <Row label={t("weight_kg")}><input type="number" value={profile.weight_kg ?? ""} onChange={(e) => set("weight_kg", e.target.value ? Number(e.target.value) : null)} className="bg-transparent text-right w-24 focus:outline-none" /></Row>
          <Row label={t("height_cm")}><input type="number" value={profile.height_cm ?? ""} onChange={(e) => set("height_cm", e.target.value ? Number(e.target.value) : null)} className="bg-transparent text-right w-24 focus:outline-none" /></Row>
          <Row label={t("age")}><input type="number" value={profile.age ?? ""} onChange={(e) => set("age", e.target.value ? Number(e.target.value) : null)} className="bg-transparent text-right w-24 focus:outline-none" /></Row>
          <Row label={t("sex")}>
            <select value={profile.sex ?? "other"} onChange={(e) => set("sex", e.target.value as "male" | "female" | "other")} className="bg-transparent text-right focus:outline-none">
              <option value="male">{t("sex_male")}</option><option value="female">{t("sex_female")}</option><option value="other">{t("sex_other")}</option>
            </select>
          </Row>
          <Row label={t("activity")}>
            <select value={profile.activity_level ?? "moderate"} onChange={(e) => set("activity_level", e.target.value as ActivityLevel)} className="bg-transparent text-right focus:outline-none">
              <option value="sedentary">{t("act_sedentary")}</option><option value="light">{t("act_light")}</option><option value="moderate">{t("act_moderate")}</option><option value="active">{t("act_active")}</option><option value="very_active">{t("act_very_active")}</option>
            </select>
          </Row>
          <Row label={t("goal")}>
            <select value={profile.goal_type ?? "maintain"} onChange={(e) => set("goal_type", e.target.value as GoalType)} className="bg-transparent text-right focus:outline-none">
              <option value="cut">{t("goal_cut")}</option><option value="maintain">{t("goal_maintain")}</option><option value="bulk">{t("goal_bulk")}</option>
            </select>
          </Row>
        </Group>

        <button onClick={save} disabled={saving} className="w-full rounded-2xl bg-foreground text-brand py-3.5 font-semibold disabled:opacity-50">
          {saving ? t("saving") : t("save")}
        </button>
      </section>
    </div>
  );
}


function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">{title}</h3>
      <div className="bg-surface rounded-2xl divide-y divide-border">{children}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="px-4 py-3.5 flex items-center justify-between text-sm"><span className="text-muted-foreground">{label}</span>{children}</div>;
}
