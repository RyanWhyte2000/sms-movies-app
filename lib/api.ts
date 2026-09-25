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

export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  const roles = [user.role, ...(user.roles ?? [])]
    .filter((role): role is string => Boolean(role))
    .map((role) => role.toUpperCase().replace(/^ROLE_/, ""));
  return roles.includes("ADMIN");
}

type Csrf = { headerName: string; token: string };
type Problem = { detail?: string; errors?: Record<string, string> };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: Record<string, string>,
  ) {
    super(message);
  }
}

let csrf: Csrf | null = null;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    csrf ??= await request<Csrf>("/api/csrf");
    headers.set(csrf.headerName, csrf.token);
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let problem: Problem = {};
    try {
      problem = (await response.json()) as Problem;
    } catch {}
    throw new ApiError(
      problem.detail ?? `Request failed (${response.status}).`,
      response.status,
      problem.errors,
    );
  }
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
} = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.cast) params.set("cast", filters.cast);
  if (filters.director) params.set("director", filters.director);
  if (filters.genreId) params.set("genreId", filters.genreId);
  params.set("page", String(filters.page ?? 0));
  params.set("size", String(filters.size ?? 100));
  return request<Page<ApiMovie>>(`/api/movies?${params}`);
}

export const getMovie = (id: string) => request<ApiMovie>(`/api/movies/${id}`);
export const getGenres = () => request<Genre[]>("/api/genres");
export const getMe = () => request<User>("/api/me");
export const getRatings = () =>
  request<Page<PersonalRating>>("/api/me/ratings?page=0&size=100");

export async function login(email: string, password: string) {
  const user = await request<User>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  csrf = await request<Csrf>("/api/csrf");
  return user;
}

export const register = (email: string, password: string, displayName: string) =>
  request<User>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName }),
  });

export async function logout() {
  await request<void>("/api/auth/logout", { method: "POST" });
  csrf = null;
}

export const saveRating = (movieId: string, score: number) =>
  request<PersonalRating>(`/api/me/ratings/${movieId}`, {
    method: "PUT",
    body: JSON.stringify({ score }),
  });

export const removeRating = (movieId: string) =>
  request<void>(`/api/me/ratings/${movieId}`, { method: "DELETE" });
