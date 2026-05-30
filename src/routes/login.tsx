import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Whey" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useT();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/", replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        toast.success(t("account_created"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("something_wrong"));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error(t("google_failed"));
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-2">
          <select value={lang} onChange={(e) => setLang(e.target.value as "en" | "ko")} className="text-xs bg-surface rounded-full px-3 py-1.5 ring-1 ring-border focus:outline-none">
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </div>
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center size-16 rounded-3xl bg-brand mb-4">
            <span className="text-2xl font-bold text-brand-ink">W</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("app_name")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("tagline")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              className="w-full rounded-2xl bg-surface px-4 py-3.5 text-sm ring-1 ring-border focus:ring-2 focus:ring-brand-ink focus:outline-none"
              placeholder={t("name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            type="email" required autoComplete="email"
            className="w-full rounded-2xl bg-surface px-4 py-3.5 text-sm ring-1 ring-border focus:ring-2 focus:ring-brand-ink focus:outline-none"
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password" required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="w-full rounded-2xl bg-surface px-4 py-3.5 text-sm ring-1 ring-border focus:ring-2 focus:ring-brand-ink focus:outline-none"
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit" disabled={loading}
            className="w-full rounded-2xl bg-foreground text-brand py-3.5 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "…" : mode === "signup" ? t("create_account") : t("sign_in")}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> {lang === "ko" ? "또는" : "or"} <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full rounded-2xl bg-surface ring-1 ring-border py-3.5 text-sm font-medium hover:bg-accent"
        >
          {t("continue_google")}
        </button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? t("new_here") : t("have_account")}{" "}
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-brand-ink font-medium underline-offset-4 hover:underline">
            {mode === "signin" ? t("create_one") : t("sign_in")}
          </button>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <Link to="/">{t("skip")}</Link>
        </p>
      </div>
    </div>
  );
}
