"use client";

import React from "react";
import type { Metrics } from "@/lib/metrics";
import { Panel, SectionTitle } from "./ui";
import { ZoneMonthlyBars, ZoneGroupChart } from "./charts/Charts";

export function ZoneKPIs({ m }: { m: Metrics }) {
  const metrics = m.zoneMetricNames; // all 14 metrics from the Zone_KPI sheet
  const leadingData = m.zoneGroupMonthly(m.leadingZoneMetrics);
  const laggingData = m.zoneGroupMonthly(m.laggingZoneMetrics);

  return (
    <div className="space-y-6">
      {/* Leading vs Lagging summary (from the April KPI update) */}
      <section>
        <SectionTitle
          kicker="Leading vs Lagging"
          title="Indicators Per Zone"
          hint="7 leading (proactive) · 7 lagging (outcomes) · trend line = all-zone monthly total"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Leading Indicators Per Zone" subtitle={m.leadingZoneMetrics.join(" · ")}>
            <ZoneGroupChart data={leadingData} zones={m.zoneNames} barColor="#F15A22" />
          </Panel>
          <Panel title="Lagging Indicators Per Zone" subtitle={m.laggingZoneMetrics.join(" · ")}>
            <ZoneGroupChart data={laggingData} zones={m.zoneNames} barColor="#2563EB" />
          </Panel>
        </div>
      </section>

      {/* The 14 individual zone metric charts, with target lines */}
      <section>
        <SectionTitle
          kicker="By Zone"
          title="Zone KPI Charts"
          hint={`${metrics.length} metrics · dashed red line = monthly target`}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => {
            const data = m.zoneMonthly(metric);
            const total = m.zoneTotalsByMetric(metric).reduce((a, b) => a + b.value, 0);
            const target = m.zoneTarget(metric);
            return (
              <Panel
                key={metric}
                title={metric}
                subtitle={`YTD total: ${total.toLocaleString()}${target != null ? ` · target ${target}/mo` : ""}`}
                dense
              >
                <ZoneMonthlyBars data={data} zones={m.zoneNames} height={190} target={target} />
              </Panel>
            );
          })}
        </div>
      </section>
    </div>
  );
}
