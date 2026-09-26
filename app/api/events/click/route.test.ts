import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

import { POST } from "@/app/api/events/click/route";

const validPayload = {
  eventName: "save_rating",
  target: "button",
  path: "/movies",
  sessionId: "session-1",
  actorId: "user-1",
  metadata: { section: "details" },
};

function request(body: BodyInit = JSON.stringify(validPayload), headers: HeadersInit = {}) {
  return new Request("http://localhost/api/events/click", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://project.supabase.co/");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/events/click", () => {
  it("rejects cross-site and oversized requests", async () => {
    expect((await POST(request(undefined, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await POST(request(undefined, { "content-length": "4001" }))).status).toBe(413);
  });

  it("is a no-op when analytics is not configured", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect((await POST(request())).status).toBe(204);
  });

  it("rejects malformed JSON and invalid fields", async () => {
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ eventName: "missing-fields" })))).status).toBe(400);
  });

  it("writes a validated event using the server credential", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 201 }));
    const response = await POST(request());

    expect(response.status).toBe(204);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://project.supabase.co/rest/v1/click_events");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer sb_secret_test");
    expect(JSON.parse(String(init?.body))).toMatchObject({ event_name: "save_rating", actor_id: "user-1" });
  });

  it("normalizes optional fields and caps the user agent", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 201 }));
    const payload = { ...validPayload, actorId: undefined, metadata: ["not", "an", "object"] };
    const response = await POST(request(JSON.stringify(payload), { "user-agent": "x".repeat(600) }));
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

    expect(response.status).toBe(204);
    expect(body.actor_id).toBeNull();
    expect(body.metadata).toEqual({});
    expect(body.user_agent).toHaveLength(500);
  });

  it("rejects fields beyond their accepted length", async () => {
    const payload = { ...validPayload, eventName: "x".repeat(81) };
    expect((await POST(request(JSON.stringify(payload)))).status).toBe(400);
  });

  it("maps upstream failures to 502", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));
    expect((await POST(request())).status).toBe(502);
  });
});
