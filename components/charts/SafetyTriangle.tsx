"use client";

import React from "react";

type Level = { level: string; value: number; color: string };

/**
 * Heinrich safety-triangle / accident-pyramid. Renders top→bottom from the most
 * severe (Fatality) to the leading indicators (Stop & Go interventions).
 */
export function SafetyTriangle({ levels }: { levels: Level[] }) {
  const W = 360;
  const H = 250;
  const rows = levels.length;
  const rowH = H / rows;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[380px]">
        {levels.map((lv, i) => {
          // Trapezoid for each tier; apex is a triangle.
          const topHalf = ((i / rows) * W) / 2;
          const botHalf = (((i + 1) / rows) * W) / 2;
          const y0 = i * rowH;
          const y1 = (i + 1) * rowH;
          const cx = W / 2;
          const pts =
            i === 0
              ? `${cx},${y0} ${cx + botHalf},${y1} ${cx - botHalf},${y1}`
              : `${cx - topHalf},${y0} ${cx + topHalf},${y0} ${cx + botHalf},${y1} ${cx - botHalf},${y1}`;
          return (
            <g key={i} className="group">
              <polygon
                points={pts}
                fill={lv.color}
                fillOpacity={0.92}
                stroke="#ffffff"
                strokeWidth={2}
                className="transition-[fill-opacity] duration-150 group-hover:fill-opacity-100"
              />
              <text x={cx} y={(y0 + y1) / 2 + 4} textAnchor="middle" className="fill-white text-[13px] font-bold">
                {lv.value.toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 w-full space-y-1.5">
        {levels.map((lv, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: lv.color }} />
              <span className="text-slate-600">{lv.level}</span>
            </div>
            <span className="font-semibold tabular-nums text-slate-900">{lv.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
