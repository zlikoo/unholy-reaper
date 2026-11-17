"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { DayPoint } from "../queries";

// Farben gegen die dunkle Kartenfläche (#18191c) geprüft: Helligkeitsband, Kontrast >= 3:1,
// Unterscheidbarkeit bei Farbsehschwäche. Text nutzt nie die Datenfarbe.
const COLORS = {
  balance: "#b8893a",
  deposit: "#3987e5",
  withdrawal: "#e0262f",
  grid: "#2e3035",
  surface: "#18191c",
  textMuted: "#9d988f",
  textPrimary: "#ebe4d6",
};

const MARGIN = { left: 60, right: 14 };
const BALANCE = { top: 22, height: 150 };
const FLOW_GAP = 44;
const FLOW_HEIGHT = 120;
const AXIS_HEIGHT = 26;

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function formatAxis(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio.`;
  if (abs >= 10_000) return `${sign}${(abs / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Tsd.`;
  return `${sign}${abs.toLocaleString("de-DE")}`;
}

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude;
  const ticks: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + step / 1e6; v += step) {
    ticks.push(Math.round(v));
  }
  return ticks;
}

/** Säule mit 4px abgerundetem Datenende und gerader Kante an der Nulllinie. */
function barPath(x: number, width: number, baseline: number, end: number) {
  const height = Math.abs(baseline - end);
  if (height < 0.5) return "";
  const r = Math.min(4, width / 2, height);
  if (end < baseline) {
    return `M${x},${baseline} L${x},${end + r} Q${x},${end} ${x + r},${end} L${x + width - r},${end} Q${x + width},${end} ${x + width},${end + r} L${x + width},${baseline} Z`;
  }
  return `M${x},${baseline} L${x},${end - r} Q${x},${end} ${x + r},${end} L${x + width - r},${end} Q${x + width},${end} ${x + width},${end - r} L${x + width},${baseline} Z`;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export function TreasuryChart({ data }: { data: DayPoint[] }) {
  const [containerRef, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);

  const flowTop = BALANCE.top + BALANCE.height + FLOW_GAP;
  const totalHeight = flowTop + FLOW_HEIGHT + AXIS_HEIGHT;
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const band = data.length > 0 ? plotWidth / data.length : 0;
  const xCenter = (i: number) => MARGIN.left + band * i + band / 2;

  // Kontostand: Achse muss nicht bei 0 beginnen (reine Linie, keine Fläche).
  const balances = data.map((d) => d.balance);
  const balanceTicks = niceTicks(Math.min(...balances), Math.max(...balances));
  const bMin = balanceTicks[0];
  const bMax = balanceTicks[balanceTicks.length - 1];
  const yBalance = (v: number) => BALANCE.top + BALANCE.height - ((v - bMin) / (bMax - bMin || 1)) * BALANCE.height;

  // Tagesbewegungen: Einzahlungen nach oben, Auszahlungen nach unten, gemeinsame Nulllinie.
  const maxDeposit = Math.max(0, ...data.map((d) => d.deposits));
  const maxWithdrawal = Math.max(0, ...data.map((d) => d.withdrawals));
  const flowTicks = niceTicks(-maxWithdrawal, maxDeposit, 3);
  const fMin = Math.min(0, flowTicks[0]);
  const fMax = Math.max(0, flowTicks[flowTicks.length - 1]);
  const yFlow = (v: number) => flowTop + FLOW_HEIGHT - ((v - fMin) / (fMax - fMin || 1)) * FLOW_HEIGHT;
  const barWidth = Math.max(2, Math.min(24, band - 2));

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xCenter(i)},${yBalance(d.balance)}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(plotWidth / 56))));

  function handlePointer(event: PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - rect.left) / band);
    setHover(Math.min(data.length - 1, Math.max(0, index)));
  }

  const last = data[data.length - 1];
  const hovered = hover !== null ? data[hover] : null;
  const tooltipLeft = hover !== null ? Math.min(Math.max(xCenter(hover) - 90, 0), Math.max(0, width - 180)) : 0;

  const summary = last
    ? `Kontostand der letzten ${data.length} Tage, aktuell ${money.format(last.balance)}. Einzahlungen gesamt ${money.format(
        data.reduce((s, d) => s + d.deposits, 0),
      )}, Auszahlungen gesamt ${money.format(data.reduce((s, d) => s + d.withdrawals, 0))}.`
    : "Keine Daten";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ash">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 rounded" style={{ background: COLORS.balance }} aria-hidden /> Kontostand
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ background: COLORS.deposit }} aria-hidden /> Einzahlungen
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ background: COLORS.withdrawal }} aria-hidden /> Auszahlungen
        </span>
      </div>

      <div ref={containerRef} className="relative w-full select-none" style={{ height: totalHeight }}>
        {width > 0 && data.length > 0 && (
          <svg width={width} height={totalHeight} role="img" aria-label={summary} className="block">
            {/* Kontostand: Gitter und Achse */}
            <text x={MARGIN.left} y={12} fill={COLORS.textMuted} fontSize={11}>
              Kontostand in $
            </text>
            {balanceTicks.map((t) => (
              <g key={`b${t}`}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={yBalance(t)} y2={yBalance(t)} stroke={COLORS.grid} strokeWidth={1} />
                <text x={MARGIN.left - 8} y={yBalance(t)} dy="0.32em" textAnchor="end" fill={COLORS.textMuted} fontSize={11}>
                  {formatAxis(t)}
                </text>
              </g>
            ))}
            <path d={linePath} fill="none" stroke={COLORS.balance} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {last && (
              <>
                <circle cx={xCenter(data.length - 1)} cy={yBalance(last.balance)} r={4} fill={COLORS.balance} stroke={COLORS.surface} strokeWidth={2} />
                <text
                  x={xCenter(data.length - 1)}
                  y={yBalance(last.balance) - 10}
                  textAnchor="end"
                  fill={COLORS.textPrimary}
                  fontSize={12}
                  fontWeight={600}
                >
                  {money.format(last.balance)}
                </text>
              </>
            )}

            {/* Tagesbewegungen */}
            <text x={MARGIN.left} y={flowTop - 12} fill={COLORS.textMuted} fontSize={11}>
              Ein- und Auszahlungen pro Tag in $
            </text>
            {flowTicks.map((t) => (
              <g key={`f${t}`}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={yFlow(t)}
                  y2={yFlow(t)}
                  stroke={t === 0 ? COLORS.textMuted : COLORS.grid}
                  strokeOpacity={t === 0 ? 0.5 : 1}
                  strokeWidth={1}
                />
                <text x={MARGIN.left - 8} y={yFlow(t)} dy="0.32em" textAnchor="end" fill={COLORS.textMuted} fontSize={11}>
                  {formatAxis(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = xCenter(i) - barWidth / 2;
              const dimmed = hover !== null && hover !== i;
              return (
                <g key={d.key} opacity={dimmed ? 0.45 : 1}>
                  {d.deposits > 0 && <path d={barPath(x, barWidth, yFlow(0) - 1, yFlow(d.deposits))} fill={COLORS.deposit} />}
                  {d.withdrawals > 0 && <path d={barPath(x, barWidth, yFlow(0) + 1, yFlow(-d.withdrawals))} fill={COLORS.withdrawal} />}
                </g>
              );
            })}

            {/* X-Achse */}
            {data.map((d, i) =>
              (data.length - 1 - i) % labelEvery === 0 ? (
                <text key={`x${d.key}`} x={xCenter(i)} y={totalHeight - 8} textAnchor="middle" fill={COLORS.textMuted} fontSize={11}>
                  {d.label}
                </text>
              ) : null,
            )}

            {/* Hover: Fadenkreuz und Punkt */}
            {hover !== null && hovered && (
              <g pointerEvents="none">
                <line
                  x1={xCenter(hover)}
                  x2={xCenter(hover)}
                  y1={BALANCE.top}
                  y2={flowTop + FLOW_HEIGHT}
                  stroke={COLORS.textMuted}
                  strokeOpacity={0.6}
                  strokeWidth={1}
                />
                <circle cx={xCenter(hover)} cy={yBalance(hovered.balance)} r={5} fill={COLORS.balance} stroke={COLORS.surface} strokeWidth={2} />
              </g>
            )}

            {/* Trefferfläche über die ganze Höhe */}
            <rect
              x={MARGIN.left}
              y={0}
              width={plotWidth}
              height={flowTop + FLOW_HEIGHT}
              fill="transparent"
              style={{ touchAction: "pan-y" }}
              onPointerMove={handlePointer}
              onPointerDown={handlePointer}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}

        {hovered && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-[180px] rounded-md border border-line bg-ink/95 px-3 py-2 text-xs shadow-xl"
            style={{ left: tooltipLeft }}
          >
            <p className="mb-1 font-display uppercase tracking-wider text-ash">{hovered.fullLabel}</p>
            <p className="flex items-center justify-between gap-2 text-bone">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded" style={{ background: COLORS.balance }} /> Kontostand
              </span>
              <span className="font-semibold">{money.format(hovered.balance)}</span>
            </p>
            <p className="flex items-center justify-between gap-2 text-bone">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ background: COLORS.deposit }} /> Ein
              </span>
              <span>{money.format(hovered.deposits)}</span>
            </p>
            <p className="flex items-center justify-between gap-2 text-bone">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ background: COLORS.withdrawal }} /> Aus
              </span>
              <span>{money.format(hovered.withdrawals)}</span>
            </p>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-ash hover:text-bone">Werte als Tabelle anzeigen</summary>
        <div className="mt-2 max-h-72 overflow-y-auto scrollbar-thin">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-panel text-ash">
              <tr>
                <th className="py-1.5 pr-2 font-normal">Tag</th>
                <th className="py-1.5 pr-2 text-right font-normal">Einzahlungen</th>
                <th className="py-1.5 pr-2 text-right font-normal">Auszahlungen</th>
                <th className="py-1.5 text-right font-normal">Kontostand</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.key} className="border-t border-line/50">
                  <td className="py-1.5 pr-2 text-ash">{d.fullLabel}</td>
                  <td className="py-1.5 pr-2 text-right">{d.deposits ? money.format(d.deposits) : "–"}</td>
                  <td className="py-1.5 pr-2 text-right">{d.withdrawals ? money.format(d.withdrawals) : "–"}</td>
                  <td className="py-1.5 text-right text-bone">{money.format(d.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
