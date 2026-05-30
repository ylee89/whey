import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, ClipboardList, Users, User, Plus } from "lucide-react";
import { useT } from "@/lib/i18n";

export function BottomNav() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useT();

  const tabs = [
    { to: "/home" as const, label: t("nav_home"), icon: Home },
    { to: "/logs" as const, label: t("nav_logs"), icon: ClipboardList },
  ];
  const rightTabs = [
    { to: "/friends" as const, label: t("nav_friends"), icon: Users },
    { to: "/profile" as const, label: t("nav_profile"), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-background/85 backdrop-blur-xl border-t border-border">
      <div className="max-w-md mx-auto flex justify-between items-center px-6 pt-3 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        {tabs.map((tab) => {
          const active = pathname === tab.to;
          const Icon = tab.icon;
          return (
            <Link key={tab.to} to={tab.to} className={`flex flex-col items-center gap-1 ${active ? "text-brand-ink" : "text-muted-foreground"}`}>
              <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}

        <div className="-mt-10">
          <button
            type="button"
            onClick={() => navigate({ to: "/add" })}
            className="size-16 rounded-full bg-foreground text-brand flex items-center justify-center shadow-2xl ring-4 ring-background transition-transform active:scale-95"
            aria-label={t("nav_add_log")}
          >
            <Plus className="size-8" strokeWidth={2.5} />
          </button>
        </div>

        {rightTabs.map((tab) => {
          const active = pathname === tab.to;
          const Icon = tab.icon;
          return (
            <Link key={tab.to} to={tab.to} className={`flex flex-col items-center gap-1 ${active ? "text-brand-ink" : "text-muted-foreground"}`}>
              <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
