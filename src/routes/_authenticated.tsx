import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", data.session.user.id)
      .maybeSingle();
    if (!profile?.onboarded) throw redirect({ to: "/onboarding" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto pb-32">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
