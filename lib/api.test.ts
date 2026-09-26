import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  ApiError,
  createActionContext,
  getGenres,
  getMe,
  getMovie,
  getMovies,
  getRatings,
  isAdmin,
  login,
  logout,
  register,
  removeRating,
  saveRating,
} from "@/lib/api";

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...init.headers },
    ...init,
  });

afterEach(() => vi.restoreAllMocks());

describe("action correlation", () => {
  it("creates a UUID action context", () => {
    expect(createActionContext().correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("sends one supplied correlation ID across related calls", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ id: "u1" }))
      .mockResolvedValueOnce(jsonResponse({ content: [] }))
      .mockResolvedValueOnce(jsonResponse([]));
    const action = createActionContext();

    await login("viewer@example.test", "secret", action);
    await getRatings(action);
    await getGenres(action);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get("x-correlation-id")).toBe(action.correlationId);
    }
  });
});

describe("API requests", () => {
  it("builds movie filters and supports all successful endpoints", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      jsonResponse({ content: [] }),
    );
    const action = createActionContext();

    await getMovies({ q: "dune", cast: "Actor", director: "Director", genreId: "g1", page: 2, size: 10 }, action);
    await getMovie("movie-1", action);
    await getMe(action);
    await register("new@example.test", "secret", "New User", action);
    await saveRating("movie-1", 5, action);
    await removeRating("movie-1", action);

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/movies?q=dune&cast=Actor&director=Director&genreId=g1&page=2&size=10",
    );
    expect(fetchMock.mock.calls[3][1]?.method).toBe("POST");
    expect(new Headers(fetchMock.mock.calls[4][1]?.headers).get("content-type")).toBe("application/json");
    expect(fetchMock.mock.calls[5][1]?.method).toBe("DELETE");
  });

  it("handles empty successful responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(logout(createActionContext())).resolves.toBeUndefined();
  });

  it("returns structured API errors and response correlation IDs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(
      { detail: "Invalid rating", errors: { score: "Must be 1-5" } },
      { status: 422, headers: { "x-correlation-id": "server-id" } },
    ));

    await expect(saveRating("movie-1", 9, createActionContext())).rejects.toEqual(
      new ApiError("Invalid rating", 422, { score: "Must be 1-5" }, "server-id"),
    );
  });

  it("falls back cleanly for a non-JSON error and propagates network errors", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("bad gateway", { status: 502 }))
      .mockRejectedValueOnce(new TypeError("offline"));

    await expect(getGenres()).rejects.toMatchObject({ message: "Request failed (502).", status: 502 });
    await expect(getGenres()).rejects.toThrow("offline");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("authorization helpers", () => {
  it("normalizes supported admin role shapes", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin({ id: "1", email: "a", displayName: "A", createdAt: "now", role: "ROLE_ADMIN" })).toBe(true);
    expect(isAdmin({ id: "2", email: "b", displayName: "B", createdAt: "now", roles: ["viewer"] })).toBe(false);
  });
});
