import "server-only";

import { createHmac } from "node:crypto";

import { logger } from "@/lib/logger";

type ClickPayload = {
  eventName?: unknown;
  target?: unknown;
  path?: unknown;
  sessionId?: unknown;
  actorId?: unknown;
  metadata?: unknown;
};

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.length > 0 && value.length <= max
    ? value
    : null;

function requestIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
    request.headers.get("x-real-ip")
  );
}

function coarseLocation(request: Request) {
  const vercelCountry = request.headers.get("x-vercel-ip-country");
  const cloudflareCountry = request.headers.get("cf-ipcountry");
  const countryValue = vercelCountry ?? cloudflareCountry;
  const country =
    countryValue && /^[a-z]{2}$/i.test(countryValue)
      ? countryValue.toUpperCase()
      : null;
  const regionValue = request.headers.get("x-vercel-ip-country-region");

  return {
    country,
    region: regionValue && regionValue.length <= 100 ? regionValue : null,
    source: vercelCountry ? "vercel" : cloudflareCountry ? "cloudflare" : null,
  };
}

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4_000) {
    return Response.json({ error: "Event is too large." }, { status: 413 });
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    logger.warn("analytics.not_configured");
    return new Response(null, { status: 204 });
  }

  let body: ClickPayload;
  try {
    body = (await request.json()) as ClickPayload;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const eventName = text(body.eventName, 80);
  const target = text(body.target, 30);
  const path = text(body.path, 300);
  const sessionId = text(body.sessionId, 80);
  const actorId = body.actorId === undefined ? null : text(body.actorId, 100);
  const metadata =
    body.metadata &&
    typeof body.metadata === "object" &&
    !Array.isArray(body.metadata) &&
    JSON.stringify(body.metadata).length <= 2_000
      ? body.metadata
      : {};

  if (!eventName || !target || !path || !sessionId) {
    return Response.json({ error: "Invalid click event." }, { status: 400 });
  }

  const ip = requestIp(request);
  const ipHashSalt = process.env.IP_HASH_SALT;
  const ipHash =
    ip && ipHashSalt
      ? createHmac("sha256", ipHashSalt).update(ip).digest("hex")
      : null;
  const eventLocation = coarseLocation(request);

  const response = await fetch(`${supabaseUrl}/rest/v1/click_events`, {
    method: "POST",
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      event_name: eventName,
      target,
      path,
      session_id: sessionId,
      actor_id: actorId,
      metadata,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      ip_hash: ipHash,
      country: eventLocation.country,
      region: eventLocation.region,
      location_source: eventLocation.source,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    logger.error("analytics.insert_failed", { status: response.status });
    return Response.json({ error: "Event could not be stored." }, { status: 502 });
  }

  return new Response(null, { status: 204 });
}
