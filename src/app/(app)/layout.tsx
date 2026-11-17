import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { ROLE_LABELS } from "@/lib/labels";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const clubAccess = can(user.role, "club.view");
  const nav: NavItem[] = [
    { href: "/", label: "Dashboard", icon: "dashboard" },
    { href: "/schwarzes-brett", label: "Schwarzes Brett", icon: "board" },
    ...(clubAccess
      ? ([
          { href: "/fahrzeuge", label: "Fahrzeuge", icon: "vehicles" },
          { href: "/kasse", label: "Kasse", icon: "treasury" },
          { href: "/waffenlager", label: "Waffenlager", icon: "weapons" },
          { href: "/schliessfaecher", label: "Schließfächer", icon: "lockers" },
          { href: "/mitglieder", label: "Mitglieder", icon: "members" },
        ] satisfies NavItem[])
      : []),
    { href: "/clubregeln", label: "Clubregeln", icon: "rules" },
  ];
  if (can(user.role, "log.view")) nav.push({ href: "/log", label: "Log", icon: "log" });

  return (
    <AppShell nav={nav} user={{ name: user.name, roadName: user.roadName, roleLabel: ROLE_LABELS[user.role] }}>
      {children}
    </AppShell>
  );
}
