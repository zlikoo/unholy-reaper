"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Crosshair,
  Gavel,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Motorbike,
  NotebookPen,
  ScrollText,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";
import { Logo, Wordmark } from "./logo";

const ICONS = {
  dashboard: LayoutDashboard,
  board: NotebookPen,
  vehicles: Motorbike,
  treasury: Wallet,
  weapons: Crosshair,
  lockers: KeyRound,
  members: Users,
  rules: Gavel,
  log: ScrollText,
} as const;

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

type ShellUser = { name: string; roadName: string | null; roleLabel: string };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ nav, user, onNavigate }: { nav: NavItem[]; user: ShellUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-5 pb-5 pt-6">
        <Logo className="size-14 shrink-0 drop-shadow-[0_0_12px_rgb(181_18_27/0.35)]" />
        <Wordmark />
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 scrollbar-thin" aria-label="Hauptnavigation">
        {nav.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 font-display text-sm uppercase tracking-wider transition-colors",
                active
                  ? "border-blood-bright bg-blood/15 text-bone"
                  : "border-transparent text-ash hover:bg-panel-2 hover:text-bone",
              )}
            >
              <Icon className={cn("size-[18px]", active ? "text-blood-bright" : "text-ash group-hover:text-bone")} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <Link
          href="/profil"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-panel-2",
            isActive(pathname, "/profil") && "bg-panel-2",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-ink">
            <UserRound className="size-4 text-ash" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-bone">{user.roadName ?? user.name}</span>
            <span className="block truncate font-display text-[11px] uppercase tracking-wider text-brass">{user.roleLabel}</span>
          </span>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 font-display text-sm uppercase tracking-wider text-ash transition-colors hover:bg-panel-2 hover:text-bone"
          >
            <LogOut className="size-[18px]" aria-hidden />
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({ nav, user, children }: { nav: NavItem[]; user: ShellUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Desktop-Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-coal/95 lg:block">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-blood" />
        <SidebarContent nav={nav} user={user} />
      </aside>

      {/* Mobile Kopfzeile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-coal/95 px-4 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-9" />
          <span className="font-brand text-base text-bone">Unholy Reaper</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-ash hover:bg-panel-2 hover:text-bone"
          aria-label="Menü öffnen"
          aria-expanded={open}
        >
          <Menu className="size-6" />
        </button>
      </header>

      {/* Mobile Menü */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-coal shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-blood" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 rounded-md p-2 text-ash hover:bg-panel-2 hover:text-bone"
              aria-label="Menü schließen"
            >
              <X className="size-5" />
            </button>
            <SidebarContent nav={nav} user={user} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
