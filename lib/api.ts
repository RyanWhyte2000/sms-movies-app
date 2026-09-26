import { logger } from "@/lib/logger";

export type Page<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ApiMovie = {
  id: string;
  title: string;
  description: string;
  director: string;
  cast?: string[];
  genre: string;
  releaseDate: string;
  durationMinutes: number;
  personalRating?: number | null;
  externalRatings?: Array<{
    source: string;
    score: number;
    scaleMax: number;
    voteCount: number;
    fetchedAt: string;
  }>;
};

export type Genre = { id: string; name: string };
export type User = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  role?: string;
  roles?: string[];
};
export type PersonalRating = {
  movieId: string;
  score: number;
  createdAt: string;
  updatedAt: string;
};

export type ActionContext = {
  correlationId: string;
};

export function createActionContext(): ActionContext {
  return { correlationId: crypto.randomUUID() };
}

export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  const roles = [user.role, ...(user.roles ?? [])]
    .filter((role): role is string => Boolean(role))
    .map((role) => role.toUpperCase().replace(/^ROLE_/, ""));
  return roles.includes("ADMIN");
}

type Problem = {
  detail?: string;
  errors?: Record<string, string>;
  correlationId?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: Record<string, string>,
    public readonly correlationId?: string,
  ) {
    super(message);
  }
}

function logPath(path: string) {
  const pathname = path.split("?", 1)[0];
  return pathname.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
    ":id",
  );
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  action?: ActionContext,
): Promise<T> {
  const startedAt = Date.now();
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  const endpoint = logPath(path);
  if (action && !headers.has("x-correlation-id")) {
    headers.set("x-correlation-id", action.correlationId);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch (cause) {
    logger.error("api.request.network_error", {
      method,
      endpoint,
      durationMs: Date.now() - startedAt,
      errorName: cause instanceof Error ? cause.name : "UnknownError",
    });
    throw cause;
  }

  const correlationId = response.headers.get("x-correlation-id") ?? undefined;

  if (!response.ok) {
    let problem: Problem = {};
    try {
      problem = (await response.json()) as Problem;
    } catch {}
    logger.warn("api.request.failed", {
      method,
      endpoint,
      status: response.status,
      durationMs: Date.now() - startedAt,
      correlationId: problem.correlationId ?? correlationId,
    });
    throw new ApiError(
      problem.detail ?? `Request failed (${response.status}).`,
      response.status,
      problem.errors,
      problem.correlationId ?? correlationId,
    );
  }
  logger.info("api.request.completed", {
    method,
    endpoint,
    status: response.status,
    durationMs: Date.now() - startedAt,
    correlationId,
  });
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getMovies(filters: {
  q?: string;
  cast?: string;
  director?: string;
  genreId?: string;
  page?: number;
  size?: number;
} = {}, action?: ActionContext) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.cast) params.set("cast", filters.cast);
  if (filters.director) params.set("director", filters.director);
  if (filters.genreId) params.set("genreId", filters.genreId);
  params.set("page", String(filters.page ?? 0));
  params.set("size", String(filters.size ?? 100));
  return request<Page<ApiMovie>>(`/api/movies?${params}`, {}, action);
}

export const getMovie = (id: string, action?: ActionContext) =>
  request<ApiMovie>(`/api/movies/${id}`, {}, action);
export const getGenres = (action?: ActionContext) =>
  request<Genre[]>("/api/genres", {}, action);
export const getMe = (action?: ActionContext) =>
  request<User>("/api/me", {}, action);
export const getRatings = (action?: ActionContext) =>
  request<Page<PersonalRating>>("/api/me/ratings?page=0&size=100", {}, action);

export async function login(email: string, password: string, action?: ActionContext) {
  return request<User>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, action);
}

export async function register(
  email: string,
  password: string,
  displayName: string,
  action?: ActionContext,
) {
  return request<User>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName }),
  }, action);
}

export async function logout(action?: ActionContext) {
  await request<void>("/api/auth/logout", { method: "POST" }, action);
}

export const saveRating = (movieId: string, score: number, action?: ActionContext) =>
  request<PersonalRating>(`/api/me/ratings/${movieId}`, {
    method: "PUT",
    body: JSON.stringify({ score }),
  }, action);

export const removeRating = (movieId: string, action?: ActionContext) =>
  request<void>(`/api/me/ratings/${movieId}`, { method: "DELETE" }, action);
