"use client";

import React from "react";

const S = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const Icons = {
  firstAid: (
    <svg {...S}><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M12 10v6M9 13h6" /></svg>
  ),
  lostTime: (
    <svg {...S}><circle cx="12" cy="13" r="7" /><path d="M12 13V9M12 2h4M12 13l2.5 2.5" /></svg>
  ),
  days: (
    <svg {...S}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
  ),
  gauge: (
    <svg {...S}><path d="M4 18a8 8 0 1 1 16 0" /><path d="M12 18l4-5" /></svg>
  ),
  severity: (
    <svg {...S}><path d="M3 17l5-5 4 3 6-7" /><path d="M14 8h4v4" /></svg>
  ),
  nearMiss: (
    <svg {...S}><circle cx="12" cy="12" r="3" /><path d="M3 12h3M18 12h3M12 3v3M12 18v3" /></svg>
  ),
  road: (
    <svg {...S}><path d="M8 3h8l2 18H6L8 3Z" /><path d="M12 6v2M12 11v2M12 16v2" /></svg>
  ),
  mra: (
    <svg {...S}><path d="M12 3l9 16H3L12 3Z" /><path d="M12 10v4M12 17h.01" /></svg>
  ),
  mrn: (
    <svg {...S}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
  ),
  hours: (
    <svg {...S}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  ),
  severe: (
    <svg {...S}><path d="M12 3a6 6 0 0 0-6 6c0 2 1 3 1 5h10c0-2 1-3 1-5a6 6 0 0 0-6-6Z" /><path d="M9 20h6M10 17v3M14 17v3" /></svg>
  ),
  people: (
    <svg {...S}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-5-5.9" /></svg>
  ),
};
