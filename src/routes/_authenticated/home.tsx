import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProgressRing } from "@/components/ProgressRing";
import { Avatar } from "@/components/Avatar";
import { startOfTodayISO } from "@/lib/goals";
import { Check, Plus, Utensils } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Whey" }] }),
  component: HomePage,
});

type Profile = { id: string; display_name: string; avatar_url: string | null; protein_goal_g: number };
type FriendData = { profile: Profile; total: number };
type Log = { id: string; food_name: string; protein_g: number; quantity: string | null; logged_at: string };

function HomePage() {
  const navigate = useNavigate();
  const { t } = useT();
  const [me, setMe] = useState<Profile | null>(null);
  const [myTotal, setMyTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [todayLogs, setTodayLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const since = startOfTodayISO();

      const [{ data: myProfile }, { data: myLogs }, { data: friendships }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, protein_goal_g").eq("id", user.id).maybeSingle(),
        supabase.from("food_logs").select("id, food_name, protein_g, quantity, logged_at").eq("user_id", user.id).order("logged_at", { ascending: false }),
        supabase.from("friendships").select("requester_id, addressee_id, status").eq("status", "accepted"),
      ]);

      if (!alive) return;
      setMe(myProfile as Profile);
      const logs = (myLogs ?? []) as Log[];
      setTodayLogs(logs);
      setMyTotal(logs.reduce((s, r) => s + Number(r.protein_g), 0));

      // streak: count consecutive prior days with any log
      const { data: last30 } = await supabase
        .from("food_logs")
        .select("logged_at")
        .eq("user_id", user.id)
        .gte("logged_at", new Date(Date.now() - 30 * 86400000).toISOString());
      const days = new Set<string>();
      (last30 ?? []).forEach((r) => days.add(new Date(r.logged_at).toDateString()));
      let s = 0;
      const cur = new Date(); cur.setHours(0,0,0,0);
      while (days.has(cur.toDateString())) { s++; cur.setDate(cur.getDate() - 1); }
      setStreak(s);

      const friendIds = (friendships ?? []).map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id));
      if (friendIds.length === 0) { setFriends([]); setLoading(false); return; }

      const [{ data: fProfiles }, { data: fLogs }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, protein_goal_g").in("id", friendIds),
        supabase.from("food_logs").select("user_id, protein_g").in("user_id", friendIds).gte("logged_at", since),
      ]);
      const totals = new Map<string, number>();
      (fLogs ?? []).forEach((l) => totals.set(l.user_id, (totals.get(l.user_id) ?? 0) + Number(l.protein_g)));
      const list: FriendData[] = (fProfiles ?? []).map((p) => ({ profile: p as Profile, total: totals.get(p.id) ?? 0 }));
      list.sort((a, b) => {
        const pa = a.profile.protein_goal_g > 0 ? a.total / a.profile.protein_goal_g : 0;
        const pb = b.profile.protein_goal_g > 0 ? b.total / b.profile.protein_goal_g : 0;
        return pb - pa;
      });
      setFriends(list);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, []);

  if (!me) return <div className="p-10 text-center text-muted-foreground">{t("loading")}</div>;

  const remaining = Math.max(0, me.protein_goal_g - myTotal);
  const pct = me.protein_goal_g > 0 ? Math.round((myTotal / me.protein_goal_g) * 100) : 0;

  return (
    <div>
      <header className="pt-8 pb-6 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("app_name")}</h1>
        <Link to="/profile"><Avatar name={me.display_name} url={me.avatar_url} size={40} rounded="rounded-full" /></Link>
      </header>

      <section className="px-4 mb-10">
        <Link to="/logs" className="block">
          <div className="bg-brand rounded-[32px] p-6 ring-1 ring-black/5 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 mb-1">{t("todays_progress")}</div>
                <p className="text-2xl font-semibold text-brand-ink leading-tight text-balance max-w-[20ch]">
                  {remaining > 0 ? t("on_your_whey", { g: Math.round(remaining) }) : t("goal_crushed")}
                </p>
              </div>
              {streak > 0 && (
                <div className="bg-brand-ink text-brand px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                  {t("streak_days", { n: streak })}
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center gap-8">
              <ProgressRing value={myTotal} goal={me.protein_goal_g} />
              <div className="flex flex-col gap-1">
                <p className="text-base text-brand-ink/80">{t("goal_label", { g: me.protein_goal_g })}</p>
                <p className="text-sm text-brand-ink/60">{t("pct_complete", { p: pct })}</p>
              </div>
            </div>
          </div>
        </Link>
      </section>

      <section className="px-4 mb-10">
        <div className="flex justify-between items-end mb-6 px-2">
          <h2 className="text-lg font-semibold">{t("friend_activity")}</h2>
          <Link to="/friends" className="text-sm text-muted-foreground">{t("see_all")}</Link>
        </div>

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-8">{t("loading_friends")}</div>
        ) : friends.length === 0 ? (
          <div className="rounded-[24px] bg-surface p-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">{t("no_friends_solo")}</p>
            <button onClick={() => navigate({ to: "/friends" })} className="rounded-full bg-foreground text-brand px-4 py-2 text-sm font-medium">
              {t("find_friends")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {friends.map((f) => {
              const hit = f.profile.protein_goal_g > 0 && f.total >= f.profile.protein_goal_g;
              const p = f.profile.protein_goal_g > 0 ? Math.round((f.total / f.profile.protein_goal_g) * 100) : 0;
              return (
                <Link key={f.profile.id} to="/friend/$id" params={{ id: f.profile.id }} className="block">
                  <div className="bg-surface rounded-[24px] p-4 ring-1 ring-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={f.profile.display_name} url={f.profile.avatar_url} />
                      <div>
                        <p className="text-base font-medium">{f.profile.display_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {hit ? t("goal_achieved") : `${Math.round(f.total)}g / ${f.profile.protein_goal_g}g`}
                        </p>
                      </div>
                    </div>
                    {hit ? (
                      <div className="size-10 bg-brand rounded-full grid place-items-center ring-1 ring-black/5">
                        <Check className="size-4 text-brand-ink" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ProgressRing value={f.total} goal={f.profile.protein_goal_g} size={40} stroke={4} showLabel={false} />
                        <span className="text-xs font-semibold w-9 text-right">{p}%</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="px-4 mb-10">
        <div className="flex justify-between items-end mb-4 px-2">
          <h2 className="text-lg font-semibold">{t("todays_intakes")}</h2>
          <Link to="/add" className="text-sm text-muted-foreground flex items-center gap-1"><Plus className="size-4" /> {t("add")}</Link>
        </div>
        {todayLogs.length === 0 ? (
          <div className="rounded-[24px] bg-surface p-6 text-center ring-1 ring-black/5">
            <Utensils className="size-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t("nothing_today")}</p>
            <button onClick={() => navigate({ to: "/add" })} className="mt-3 rounded-full bg-brand text-brand-ink px-4 py-2 text-sm font-medium">{t("log_first_meal")}</button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todayLogs.map((log) => (
              <div key={log.id} className="bg-surface rounded-[20px] p-4 ring-1 ring-black/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{log.food_name}</p>
                  {log.quantity && <p className="text-xs text-muted-foreground">{log.quantity}</p>}
                </div>
                <p className="text-sm font-semibold">{Math.round(Number(log.protein_g))}g</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

