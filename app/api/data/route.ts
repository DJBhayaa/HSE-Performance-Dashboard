// Central dataset storage — one JSON document per project, kept in Vercel Blob.
// Enable it in Vercel: project → Storage → Create → Blob (this injects
// BLOB_READ_WRITE_TOKEN automatically). Until then GET reports storage:"none"
// and the client falls back to device-local storage.
//
// Optional: set EDIT_PIN to require a PIN (x-edit-pin header) for saves.

import { NextRequest, NextResponse } from "next/server";
import { head, put } from "@vercel/blob";
import { PROJECTS } from "@/lib/projects";

export const dynamic = "force-dynamic";

const blobPath = (projectId: string) => `hse-data/${projectId}.json`;
const validProject = (id: string | null): id is string => !!id && PROJECTS.some((p) => p.id === id);
const storageEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function GET(req: NextRequest) {
  const project = req.nextUrl.searchParams.get("project");
  if (!validProject(project)) {
    return NextResponse.json({ ok: false, error: "Unknown project." }, { status: 400 });
  }
  if (!storageEnabled()) {
    return NextResponse.json({ ok: true, storage: "none", dataset: null });
  }
  try {
    const meta = await head(blobPath(project));
    const res = await fetch(`${meta.url}?ts=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`blob fetch ${res.status}`);
    const dataset = await res.json();
    return NextResponse.json({ ok: true, storage: "blob", dataset });
  } catch {
    // Not saved yet for this project.
    return NextResponse.json({ ok: true, storage: "blob", dataset: null });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const project: string | null = typeof body.project === "string" ? body.project : null;
  const dataset = body.dataset;

  if (!validProject(project)) {
    return NextResponse.json({ ok: false, error: "Unknown project." }, { status: 400 });
  }
  if (
    !dataset ||
    !Array.isArray(dataset.kpiMonthly) ||
    !Array.isArray(dataset.incidents) ||
    !Array.isArray(dataset.violations) ||
    !Array.isArray(dataset.zoneKpi)
  ) {
    return NextResponse.json({ ok: false, error: "Invalid dataset." }, { status: 400 });
  }

  const pin = process.env.EDIT_PIN;
  if (pin && req.headers.get("x-edit-pin") !== pin) {
    return NextResponse.json({ ok: false, error: "pin", needPin: true }, { status: 401 });
  }

  if (!storageEnabled()) {
    return NextResponse.json(
      { ok: false, storage: "none", error: "Cloud storage is not enabled (add Vercel Blob to this project)." },
      { status: 501 }
    );
  }

  await put(blobPath(project), JSON.stringify(dataset), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
  return NextResponse.json({ ok: true, storage: "blob" });
}
