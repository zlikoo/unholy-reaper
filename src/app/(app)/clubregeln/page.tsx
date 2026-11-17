import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { RichText } from "@/components/ui/rich-text";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { moveRuleAction } from "@/features/rules/actions";
import { db } from "@/lib/db";
import { RULE_SECTION_LABELS, RULE_SECTIONS } from "@/lib/labels";

export const metadata: Metadata = { title: "Clubregeln" };

export default async function RulesPage() {
  const user = await requireUser();
  const rules = await db.clubRule.findMany({ orderBy: [{ section: "asc" }, { sortOrder: "asc" }] });
  const canManage = can(user.role, "rules.manage");

  return (
    <>
      <PageHeader
        title="Clubregeln"
        description="Grundgesetze, Hierarchie und die Regeln für Hangarounds und Prospects. Änderungen beschließt die Church."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {RULE_SECTIONS.map((section) => {
          const entries = rules.filter((r) => r.section === section);
          return (
            <Card key={section} id={section} className="scroll-mt-20 overflow-hidden">
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-brass/90 to-[#a07a35] px-5 py-3">
                <h2 className="font-brand text-xl tracking-wide text-ink">{RULE_SECTION_LABELS[section]}</h2>
                {canManage && (
                  <Link
                    href={`/clubregeln/neu?bereich=${section}`}
                    className="inline-flex items-center gap-1 rounded bg-ink/80 px-2 py-1 font-display text-[11px] uppercase tracking-wider text-bone hover:bg-ink"
                  >
                    <Plus className="size-3.5" /> Eintrag
                  </Link>
                )}
              </div>
              <div className="divide-y divide-line/70">
                {entries.length === 0 && <p className="px-5 py-4 text-sm text-ash">Noch keine Einträge.</p>}
                {entries.map((rule, index) => (
                  <section key={rule.id} className="px-5 py-4">
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <h3 className="font-display text-base font-semibold uppercase tracking-wider text-red-300">{rule.title}</h3>
                      {canManage && (
                        <div className="flex shrink-0 items-center gap-0.5">
                          {index > 0 && (
                            <ActionButton action={moveRuleAction.bind(null, rule.id, "up")} variant="ghost" className="px-2" title="Nach oben">
                              <ArrowUp className="size-3.5" />
                              <span className="sr-only">Nach oben</span>
                            </ActionButton>
                          )}
                          {index < entries.length - 1 && (
                            <ActionButton action={moveRuleAction.bind(null, rule.id, "down")} variant="ghost" className="px-2" title="Nach unten">
                              <ArrowDown className="size-3.5" />
                              <span className="sr-only">Nach unten</span>
                            </ActionButton>
                          )}
                          <Link href={`/clubregeln/${rule.id}`} className={buttonClasses("ghost", "sm", "px-2")} title="Bearbeiten">
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Bearbeiten</span>
                          </Link>
                        </div>
                      )}
                    </div>
                    <RichText text={rule.content} />
                  </section>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
