import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Avatar";
import { ProgressRing } from "@/components/ProgressRing";
import { startOfTodayISO } from "@/lib/goal";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/friend/$id")({
  head: () => ({ meta: [{ title: "Friend — Whey" }] }),
  component: FriendDetail,
});

type Profile = { id: string; display_name: string; avatar_url: string | null; protein_goal_g: number };
type Log = { id: string; food_name: string; protein_g: number; logged_at: string };

function FriendDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    (async () => {
      const since = startOfTodayISO();
      const [{ data: p }, { data: l }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, protein_goal_g").eq("id", id).maybeSingle(),
        supabase.from("food_logs").select("id, food_name, protein_g, logged_at").eq("user_id", id).gte("logged_at", since).order("logged_at", { ascending: true }),
      ]);
      setProfile(p as Profile);
      setLogs((l ?? []) as Log[]);
    })();
  }, [id]);

  if (!profile) return <div className="p-10 text-center text-muted-foreground">{t("loading")}</div>;

  const total = logs.reduce((s, l) => s + Number(l.protein_g), 0);
  const remaining = Math.max(0, profile.protein_goal_g - total);

  return (
    <div>
      <header className="pt-8 pb-6 px-6 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/home" })} className="size-9 rounded-full bg-surface grid place-items-center"><ArrowLeft className="size-4" /></button>
        <h1 className="text-2xl font-semibold tracking-tight">{profile.display_name}</h1>
      </header>

      <section className="px-4 mb-8">
        <div className="bg-brand rounded-[32px] p-6 flex items-center gap-6">
          <ProgressRing value={total} goal={profile.protein_goal_g} />
          <div>
            <Avatar name={profile.display_name} url={profile.avatar_url} size={48} rounded="rounded-full" />
            <p className="mt-3 text-brand-ink font-semibold">{Math.round(total)}g / {profile.protein_goal_g}g</p>
            <p className="text-xs text-brand-ink/70">{remaining > 0 ? t("g_to_goal", { g: Math.round(remaining) }) : t("goal_hit")}</p>
          </div>
        </div>
      </section>

      <section className="px-4">
        <h2 className="text-sm font-semibold mb-2 px-2">{t("todays_logs")}</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("nothing_today")}</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="bg-surface rounded-2xl p-4 ring-1 ring-black/5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{l.food_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(l.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <span className="font-semibold text-brand-ink">{Math.round(Number(l.protein_g))}g</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
