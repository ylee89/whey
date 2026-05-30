import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProgressRing } from "@/components/ProgressRing";
import { startOfTodayISO } from "@/lib/goal";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/logs")({
  head: () => ({ meta: [{ title: "Logs — Whey" }] }),
  component: LogsPage,
});

type Log = { id: string; food_name: string; protein_g: number; logged_at: string };

function LogsPage() {
  const { t } = useT();
  const [logs, setLogs] = useState<Log[]>([]);
  const [goal, setGoal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: profile }, { data: rows }] = await Promise.all([
      supabase.from("profiles").select("protein_goal_g").eq("id", user.id).maybeSingle(),
      supabase.from("food_logs").select("id, food_name, protein_g, logged_at").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(200),
    ]);
    setGoal(profile?.protein_goal_g ?? 0);
    setLogs((rows ?? []) as Log[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    const { error } = await supabase.from("food_logs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setLogs((l) => l.filter((x) => x.id !== id));
  }

  const today = startOfTodayISO();
  const grouped = new Map<string, Log[]>();
  logs.forEach((l) => {
    const k = new Date(l.logged_at).toDateString();
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(l);
  });

  const todayTotal = logs.filter((l) => l.logged_at >= today).reduce((s, l) => s + Number(l.protein_g), 0);

  return (
    <div>
      <header className="pt-8 pb-6 px-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("your_logs")}</h1>
      </header>

      <section className="px-4 mb-8">
        <div className="bg-brand rounded-[28px] p-6 flex items-center gap-6">
          <ProgressRing value={todayTotal} goal={goal} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60">{t("today")}</p>
            <p className="text-2xl font-semibold text-brand-ink">{Math.round(todayTotal)}<span className="text-base text-brand-ink/60"> / {goal}g</span></p>
          </div>
        </div>
      </section>

      <section className="px-4">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-6">{t("loading")}</p>
        ) : logs.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">{t("nothing_tap_plus")}</p>
        ) : (
          [...grouped.entries()].map(([day, items]) => {
            const total = items.reduce((s, x) => s + Number(x.protein_g), 0);
            return (
              <div key={day} className="mb-6">
                <div className="flex justify-between items-baseline px-2 mb-2">
                  <h3 className="text-sm font-semibold">{day === new Date().toDateString() ? t("today") : day}</h3>
                  <span className="text-xs text-muted-foreground">{Math.round(total)}g</span>
                </div>
                <div className="space-y-2">
                  {items.map((l) => (
                    <div key={l.id} className="bg-surface rounded-2xl p-4 ring-1 ring-black/5 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{l.food_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(l.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-brand-ink">{Math.round(Number(l.protein_g))}g</span>
                        <button onClick={() => remove(l.id)} className="text-muted-foreground hover:text-destructive p-1">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
