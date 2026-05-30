import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Avatar";
import { toast } from "sonner";
import { Check, X, UserPlus, UserMinus, Search } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({ meta: [{ title: "Friends — Whey" }] }),
  component: FriendsPage,
});

type Profile = { id: string; display_name: string; avatar_url: string | null };
type Friendship = { id: string; requester_id: string; addressee_id: string; status: "pending" | "accepted" };

function FriendsPage() {
  const { t } = useT();
  const [me, setMe] = useState<string>("");
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMe(user.id);
    const { data: fs } = await supabase.from("friendships").select("*");
    const list = (fs ?? []) as Friendship[];
    setFriendships(list);
    const ids = Array.from(new Set(list.flatMap((f) => [f.requester_id, f.addressee_id])));
    if (ids.length > 0) {
      const { data: ps } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      const map: Record<string, Profile> = {};
      (ps ?? []).forEach((p) => { map[p.id] = p as Profile; });
      setProfiles(map);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function searchUsers() {
    if (!search.trim()) { setResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .ilike("display_name", `%${search}%`)
      .neq("id", me)
      .limit(10);
    setResults((data ?? []) as Profile[]);
  }

  async function sendRequest(id: string) {
    const { error } = await supabase.from("friendships").insert({ requester_id: me, addressee_id: id });
    if (error) toast.error(error.message); else { toast.success(t("request_sent")); load(); setResults([]); setSearch(""); }
  }
  async function accept(id: string) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    toast.success(t("friend_added")); load();
  }
  async function remove(id: string) {
    await supabase.from("friendships").delete().eq("id", id);
    load();
  }

  const pending = friendships.filter((f) => f.status === "pending" && f.addressee_id === me);
  const sent = friendships.filter((f) => f.status === "pending" && f.requester_id === me);
  const accepted = friendships.filter((f) => f.status === "accepted");

  return (
    <div>
      <header className="pt-8 pb-6 px-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("friends")}</h1>
      </header>

      <section className="px-4 mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUsers()}
              placeholder={t("search_by_name")}
              className="w-full rounded-2xl bg-surface pl-10 pr-4 py-3 ring-1 ring-border focus:ring-2 focus:ring-brand-ink focus:outline-none"
            />
          </div>
          <button onClick={searchUsers} className="rounded-2xl bg-foreground text-brand px-5 font-medium">{t("search")}</button>
        </div>
        {results.length > 0 && (
          <div className="mt-3 space-y-2">
            {results.map((p) => (
              <div key={p.id} className="bg-surface rounded-2xl p-3 ring-1 ring-black/5 flex items-center justify-between">
                <div className="flex items-center gap-3"><Avatar name={p.display_name} url={p.avatar_url} size={40} /><span className="font-medium">{p.display_name}</span></div>
                <button onClick={() => sendRequest(p.id)} className="rounded-full bg-brand text-brand-ink px-3 py-1.5 text-xs font-semibold flex items-center gap-1"><UserPlus className="size-3" /> {t("add")}</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {pending.length > 0 && (
        <Section title={t("requests")}>
          {pending.map((f) => {
            const p = profiles[f.requester_id];
            if (!p) return null;
            return (
              <div key={f.id} className="bg-surface rounded-2xl p-3 ring-1 ring-black/5 flex items-center justify-between">
                <div className="flex items-center gap-3"><Avatar name={p.display_name} url={p.avatar_url} size={40} /><span className="font-medium">{p.display_name}</span></div>
                <div className="flex gap-2">
                  <button onClick={() => accept(f.id)} className="size-9 grid place-items-center rounded-full bg-brand text-brand-ink"><Check className="size-4" strokeWidth={3} /></button>
                  <button onClick={() => remove(f.id)} className="size-9 grid place-items-center rounded-full bg-background ring-1 ring-border"><X className="size-4" /></button>
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {sent.length > 0 && (
        <Section title={t("pending")}>
          {sent.map((f) => {
            const p = profiles[f.addressee_id];
            if (!p) return null;
            return (
              <div key={f.id} className="bg-surface rounded-2xl p-3 ring-1 ring-black/5 flex items-center justify-between">
                <div className="flex items-center gap-3"><Avatar name={p.display_name} url={p.avatar_url} size={40} /><span className="font-medium">{p.display_name}</span></div>
                <span className="text-xs text-muted-foreground">{t("awaiting")}</span>
              </div>
            );
          })}
        </Section>
      )}

      <Section title={t("your_crew", { n: accepted.length })}>
        {accepted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("no_friends_search")}</p>
        ) : accepted.map((f) => {
          const otherId = f.requester_id === me ? f.addressee_id : f.requester_id;
          const p = profiles[otherId];
          if (!p) return null;
          return (
            <div key={f.id} className="bg-surface rounded-2xl p-3 ring-1 ring-black/5 flex items-center justify-between">
              <div className="flex items-center gap-3"><Avatar name={p.display_name} url={p.avatar_url} size={40} /><span className="font-medium">{p.display_name}</span></div>
              <button onClick={() => remove(f.id)} className="text-muted-foreground hover:text-destructive p-2"><UserMinus className="size-4" /></button>
            </div>
          );
        })}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 mb-6">
      <h2 className="text-sm font-semibold mb-2 px-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
