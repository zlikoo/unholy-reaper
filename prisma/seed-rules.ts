// Startinhalte der Seite "Clubregeln". Danach in der App pflegbar.
// Formatierung im Text: Zeilen mit "- " werden zur Liste, "1. " zur nummerierten Liste,
// **so** wird fett, eine Leerzeile beginnt einen neuen Absatz.

import type { RuleSection } from "../src/generated/prisma/enums";

export const DEFAULT_RULES: Array<{ section: RuleSection; title: string; content: string }> = [
  // ------------------------------------------------------------- Clubregeln
  {
    section: "CLUB_RULES",
    title: "Brotherhood Above All",
    content:
      "Die Bruderschaft steht über persönlichen Interessen. Kein Bruder wird wissentlich zurückgelassen, verraten oder für den eigenen Vorteil geopfert. Wer die Kutte trägt, trägt Verantwortung für jeden seiner Brüder.",
  },
  {
    section: "CLUB_RULES",
    title: "Loyalty Is Everything",
    content:
      "Absolute Loyalität ist die Grundlage der Mitgliedschaft. Die Weitergabe interner Informationen, Zusammenarbeit mit Feinden gegen den Club oder bewusste Schädigung der Bruderschaft gelten als Hochverrat.",
  },
  {
    section: "CLUB_RULES",
    title: "Respect The Patch",
    content:
      "Die Kutte und sämtliche Patches sind mit Respekt zu behandeln. Clubfarben dürfen nicht verkauft, verliehen oder ohne Genehmigung verändert werden. Jedes Mitglied ist für den Schutz seiner Farben verantwortlich.",
  },
  {
    section: "CLUB_RULES",
    title: "Respect The Chain Of Command",
    content:
      "Die Hierarchie ist einzuhalten. Anweisungen zuständiger Officers sind zu befolgen, solange sie nicht gegen die Grundgesetze des Clubs verstoßen. Meinungsverschiedenheiten werden intern geklärt.",
  },
  {
    section: "CLUB_RULES",
    title: "Church Is Sacred",
    content:
      "Die Church ist die offizielle Clubversammlung. Während einer Church herrschen Disziplin und Ordnung. Jedes Fullpatch-Mitglied besitzt Rederecht und bei abstimmungspflichtigen Angelegenheiten eine Stimme.",
  },
  {
    section: "CLUB_RULES",
    title: "Club Business Stays Club Business",
    content:
      "Interne Angelegenheiten bleiben innerhalb der Bruderschaft. Geschäfte, Konflikte, Mitgliederinformationen und Clubentscheidungen dürfen nicht ohne Freigabe weitergegeben werden.",
  },
  {
    section: "CLUB_RULES",
    title: "Never Turn Against Your Brother",
    content:
      "Gewalt, Diebstahl, Erpressung oder gezielte Intrigen gegen Clubbrüder sind untersagt. Streitigkeiten werden vor der Clubführung oder der Church geklärt.",
  },
  {
    section: "CLUB_RULES",
    title: "No War Without Permission",
    content:
      "Kein Mitglied darf eigenmächtig einen Krieg oder eine schwerwiegende Fehde im Namen des Clubs beginnen. Über Konflikte mit anderen Organisationen entscheidet die Clubführung beziehungsweise die Church.",
  },
  {
    section: "CLUB_RULES",
    title: "Earn Your Place",
    content:
      "Respekt wird nicht durch Worte, sondern durch Taten verdient. Jeder Rang bringt Pflichten mit sich. Niemand erhält Sonderrechte allein aufgrund seiner Herkunft, Freundschaften oder Vergangenheit.",
  },
  {
    section: "CLUB_RULES",
    title: "The Patch Is For Life",
    content:
      "Die Kutte ist eine Verpflichtung und kein Statussymbol. Ein freiwilliger Austritt ist möglich, muss jedoch offiziell erklärt werden. Clubfarben und Eigentum werden zurückgegeben. Die Verschwiegenheit über interne Angelegenheiten besteht fort.",
  },

  // ------------------------------------------------------------- Hierarchie
  {
    section: "HIERARCHY",
    title: "President",
    content:
      "Der President repräsentiert den Club nach innen und außen. Er leitet die Church, führt Verhandlungen und trägt die Gesamtverantwortung. Er darf in dringenden Situationen vorläufige Entscheidungen treffen. Dauerhafte Bündnisse, Kriegserklärungen, Ausschlüsse von Fullpatches und Änderungen der Clubgesetze benötigen jedoch einen Beschluss der Church.",
  },
  {
    section: "HIERARCHY",
    title: "Vice President",
    content:
      "Der Vice President unterstützt den President und vertritt ihn bei Abwesenheit. Er überwacht die Umsetzung von Clubbeschlüssen und vermittelt bei internen Konflikten.",
  },
  {
    section: "HIERARCHY",
    title: "Sergeant at Arms",
    content:
      "Der Sergeant at Arms ist für die Sicherheit, Disziplin und Durchsetzung der Clubordnung verantwortlich. Er untersucht Regelverstöße und spricht Empfehlungen für Sanktionen aus. Er darf jedoch nicht eigenmächtig Fullpatch-Mitglieder ausschließen.",
  },
  {
    section: "HIERARCHY",
    title: "Secretary / Treasurer",
    content:
      "Der Secretary dokumentiert Clubbeschlüsse, Anwesenheit, Mitgliederstatus und offizielle Absprachen. Zusätzlich übernimmt er die Pflichten des Treasurers und verwaltet die Clubkasse, Mitgliedsbeiträge und genehmigte Ausgaben. Einnahmen und Ausgaben müssen für die Clubführung nachvollziehbar sein.",
  },
  {
    section: "HIERARCHY",
    title: "Fullpatch-Mitglieder",
    content:
      "Fullpatches sind gleichberechtigte Vollmitglieder der Bruderschaft. Sie besitzen Stimmrecht, können Anträge stellen und haben Anspruch auf eine faire Anhörung bei Regelverstößen.",
  },
  {
    section: "HIERARCHY",
    title: "Prospect",
    content:
      "Ein Prospect ist offizieller Anwärter auf die Vollmitgliedschaft. Er repräsentiert den Club bereits nach außen, hat seine vollständigen Farben jedoch noch nicht verdient.",
  },
  {
    section: "HIERARCHY",
    title: "Aufnahme als Hangaround",
    content: "Ein Hangaround ist eine Person, die Interesse am Club zeigt, aber noch kein offizielles Mitglied ist.",
  },

  // ------------------------------------------------------------- Hangarounds
  {
    section: "HANGAROUND",
    title: "Regeln",
    content: [
      "- Er darf sich mit Genehmigung auf dem Clubgelände aufhalten.",
      "- Er trägt keine offiziellen Clubpatches.",
      "- Er besitzt weder Stimmrecht noch Zugang zu vertraulichen Clubinformationen.",
      "- Er muss sich durch Zuverlässigkeit, respektvolles Verhalten und Eigeninitiative beweisen.",
      "- Er darf den Club nicht ohne ausdrückliche Erlaubnis nach außen vertreten.",
    ].join("\n"),
  },
  {
    section: "HANGAROUND",
    title: "Übergang zum Prospect",
    content:
      "Über die Aufnahme als Prospect entscheidet die Church durch einfache Mehrheit der anwesenden stimmberechtigten Fullpatches. Voraussetzung sind ein Fullpatch als Sponsor und die Zustimmung der Clubführung.\n\n**Ein Anspruch auf Übernahme besteht nicht.**",
  },

  // ------------------------------------------------------------- Prospects
  {
    section: "PROSPECT",
    title: "Pflichten eines Prospects",
    content: [
      "1. **Respekt:** Jeder Fullpatch und Officer ist mit Respekt zu behandeln.",
      "2. **Anwesenheit:** Teilnahme an Clubveranstaltungen und Church-Terminen.",
      "3. **Verschwiegenheit:** Interne Clubinformationen dürfen nicht weitergegeben werden.",
      "4. **Eigeninitiative:** Ein Prospect soll Aufgaben erkennen und Verantwortung übernehmen.",
      "5. **Zuverlässigkeit:** Zugesagte Aufgaben sind zu erfüllen oder rechtzeitig abzusagen.",
      "6. **Keine Alleingänge:** Keine Geschäfte, Verhandlungen oder Konflikte im Namen des Clubs ohne Genehmigung.",
      "7. **Patch-Regeln:** Nur genehmigte Prospect-Abzeichen dürfen getragen werden.",
      "8. **Lernbereitschaft:** Ein Prospect muss die Clubgeschichte, Hierarchie und Regeln kennen.",
      "",
      "Ein Prospect darf Probleme seinem zuständigen Fullpatch-Sponsor oder dem Sergeant at Arms melden und erhält bei Vorwürfen Gelegenheit zur Stellungnahme.",
    ].join("\n"),
  },
  {
    section: "PROSPECT",
    title: "Beförderung zum Fullpatch",
    content: [
      "Die Beförderung erfolgt nicht automatisch nach einer bestimmten Zeit.",
      "Voraussetzungen sind nachgewiesene Loyalität, Kenntnis der Clubgesetze, aktive Teilnahme am Clubleben und die Empfehlung mindestens eines Fullpatch-Mitglieds.",
      "",
      "Die Aufnahme als Fullpatch benötigt eine Zweidrittelmehrheit der anwesenden stimmberechtigten Mitglieder. Die endgültige Übergabe der Kutte findet in einer offiziellen Clubzeremonie statt.",
    ].join("\n"),
  },
];
