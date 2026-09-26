"use client";

const SESSION_KEY = "sms_movies_analytics_session";

type ClickEvent = {
  eventName: string;
  target: string;
  path: string;
  sessionId: string;
  actorId?: string;
  metadata?: Record<string, string>;
};

let actorId: string | undefined;

export function identifyClickActor(id?: string) {
  actorId = id;
}

function sessionId() {
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const created = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function safeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}

export function captureClick(event: MouseEvent) {
  if (!(event.target instanceof Element)) return;

  const target = event.target.closest<HTMLElement>(
    "[data-track-event], button, a, input[type='submit']",
  );
  if (!target || target.dataset.track === "off") return;

  const label =
    target.dataset.trackEvent ??
    target.getAttribute("aria-label") ??
    target.getAttribute("name") ??
    target.textContent ??
    target.tagName;
  const name = safeName(label);
  if (!name) return;

  const metadata = Object.fromEntries(
    Object.entries(target.dataset)
      .filter(([key]) => key.startsWith("track") && key !== "trackEvent")
      .map(([key, value]) => [key.slice(5).toLowerCase(), String(value).slice(0, 120)]),
  );
  const payload: ClickEvent = {
    eventName: name,
    target: target.tagName.toLowerCase(),
    path: window.location.pathname.slice(0, 300),
    sessionId: sessionId(),
    actorId,
    metadata: Object.keys(metadata).length ? metadata : undefined,
  };

  void fetch("/api/events/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt the user's action.
  });
}
