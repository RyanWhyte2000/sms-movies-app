"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import Image from "next/image";
import Link from "next/link";
import { identifyClickActor } from "@/lib/click-tracking";
import {
  ApiError,
  ApiMovie,
  Genre,
  User,
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

type Movie = ApiMovie;

const posterByTitle: Record<string, string> = {
  pluribus: "pluribus",
  "tron: ares": "tron",
  "people we meet on vacation": "vacation",
  "his & hers": "his-hers",
  "avatar: fire and ash": "avatar",
  xxx: "xxx",
  "greenland 2": "greenland",
  "the housemaid": "housemaid",
  "tell me lies": "tell-me-lies",
  fallout: "fallout",
  "dune: part two": "dune",
};
function poster(movie: Movie, hero = false) {
  const slug = posterByTitle[movie.title.toLowerCase()] ?? "dune";
  return `/images/${hero && slug === "dune" ? "dune-hero" : slug}.jpg`;
}
function year(movie: Movie) {
  return movie.releaseDate ? new Date(`${movie.releaseDate}T00:00:00`).getUTCFullYear() : "—";
}
function displayRating(movie: Movie) {
  return movie.externalRatings?.length ? movie.externalRatings : null;
}
const genreIcon: Record<string, string> = {
  action: "swords", comedy: "comedy", historical: "building", drama: "drama",
  "sci fi": "scifi", "science fiction": "scifi", fantasy: "magic", music: "music",
  documentary: "film",
};
function formatAuthError(cause: unknown, fallback: string) {
  if (!(cause instanceof Error)) return fallback;
  if (cause instanceof ApiError && cause.errors) {
    const details = Object.values(cause.errors).join(" ");
    if (details) return details;
  }
  return cause.message;
}
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    star: (
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />
    ),
    chat: <path d="M4 4h16v13H8l-4 4Zm4 4h8M8 12h6" />,
    bell: (
      <>
        <path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4M12 2v2" />
      </>
    ),
    down: <path d="m7 10 5 5 5-5" />,
    left: <path d="m14 7-5 5 5 5" />,
    right: <path d="m10 7 5 5-5 5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    person: (
      <>
        <circle cx="12" cy="6" r="3" />
        <path d="M6 21v-5a6 6 0 0 1 12 0v5Z" />
      </>
    ),
    flame: (
      <path d="M13 2c2 6-4 7-1 11 2-1 3-3 3-5 8 8 3 14-3 14S3 16 6 11c2-3 4-3 7-9Z" />
    ),
    swords: (
      <>
        <path d="m4 3 14 14M3 3l1 5 12 12 4-4L8 4ZM16 4l5-1-1 5-6 6M4 16l4 4M3 21l4-4M17 17l4 4" />
      </>
    ),
    comedy: (
      <>
        <path d="M4 3h16v10a8 8 0 0 1-16 0ZM8 13c2 4 6 4 8 0" />
        <path d="M8 8h1m6 0h1" />
      </>
    ),
    building: (
      <>
        <path d="m3 7 9-5 9 5ZM3 21h18M5 10v8m7-8v8m7-8v8M3 18h18" />
      </>
    ),
    drama: (
      <>
        <path d="M2 7c5 3 7 3 10 0v6a5 5 0 0 1-10 0Zm10 1c4 0 6-1 10-3v6a5 5 0 0 1-8 4M5 11h1m2 0h1M5 15h4m7-6h1m2-1h1m-4 4 4-1" />
      </>
    ),
    scifi: (
      <>
        <path d="M3 8h13a4 4 0 0 1 0 8H3m-1-4h13M6 8v8" />
        <circle cx="17" cy="12" r="3" />
      </>
    ),
    magic: (
      <>
        <path d="m4 21 12-12m-3-3 5 5M6 2v5M3 4h6m9 12v6m-3-3h6M18 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
      </>
    ),
    music: (
      <>
        <path d="M9 17V5l11-3v13M9 9l11-3" />
        <ellipse cx="6" cy="18" rx="3" ry="3" />
        <ellipse cx="17" cy="16" rx="3" ry="3" />
      </>
    ),
    film: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="6.5" r="1.5" />
        <circle cx="7" cy="13" r="1.5" />
        <circle cx="17" cy="13" r="1.5" />
        <path d="M12 16v6" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.film}
    </svg>
  );
}
function Stats({ movie }: { movie: Movie }) {
  const externalRatings = displayRating(movie);
  return (
    <div className="stats" aria-label="Third-party ratings">
      {externalRatings ? externalRatings.map((rating) => (
        <span key={`${rating.source}-${rating.fetchedAt}`}>
          <Icon name="star" size={15} />
          {rating.score}/{rating.scaleMax} {rating.source}
        </span>
      )) : <span>Not rated by third-party sources</span>}
    </div>
  );
}

function ThirdPartyRatings({ movie }: { movie: Movie }) {
  const externalRatings = displayRating(movie);

  return (
    <section className="third-party-ratings" aria-labelledby="third-party-ratings-title">
      <div className="third-party-ratings-heading">
        <div>
          <span className="eyebrow">CRITICS &amp; AUDIENCES</span>
          <h3 id="third-party-ratings-title">Third-party ratings</h3>
        </div>
        <span className="ratings-access">Available to everyone</span>
      </div>
      {externalRatings ? (
        <ul>
          {externalRatings.map((rating) => (
            <li key={`${rating.source}-${rating.fetchedAt}`}>
              <span className="rating-source">{rating.source}</span>
              <strong>
                <Icon name="star" size={17} />
                {rating.score}<small>/{rating.scaleMax}</small>
              </strong>
              {rating.voteCount > 0 && (
                <span className="rating-votes">
                  {new Intl.NumberFormat().format(rating.voteCount)} votes
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="ratings-empty">No third-party ratings are available yet.</p>
      )}
    </section>
  );
}

function RatingControl({
  movie,
  rating,
  onRate,
}: {
  movie: Movie;
  rating?: number;
  onRate: (id: string, rating: number | null) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function rate(value: number | null) {
    setSaving(true);
    setError("");
    try {
      await onRate(movie.id, value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your rating could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="rating-control" aria-label={`Rate ${movie.title}`}>
      <h3>Your rating</h3>
      <div
        className="rating-options"
        role="group"
        aria-label="Choose a score out of 5"
      >
        {Array.from({ length: 5 }, (_, index) => index + 1).map((score) => (
          <button
            key={score}
            aria-label={`Rate ${score} out of 5`}
            aria-pressed={rating === score}
            disabled={saving}
            data-track-event="rating_clicked"
            data-track-movie-id={movie.id}
            data-track-score={score}
            onClick={() => rate(score)}
          >
            {score}
          </button>
        ))}
      </div>
      <p className="rating-status" role="status">
        {rating
          ? `You rated this ${rating}/5. Select another score to update it.`
          : "Select a score from 1 to 5."}
      </p>
      {rating && (
        <button
          className="remove-rating"
          disabled={saving}
          data-track-event="rating_removed"
          data-track-movie-id={movie.id}
          onClick={() => rate(null)}
        >
          Remove my rating
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      <small className="rating-note">Your rating is saved to your account.</small>
    </section>
  );
}
function MovieRow({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: Movie[];
  onSelect: (movie: Movie) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <section className="movie-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <div className="arrows">
          <button
            aria-label={`Scroll ${title} left`}
            onClick={() =>
              ref.current?.scrollBy({ left: -540, behavior: "smooth" })
            }
          >
            <Icon name="left" />
          </button>
          <button
            aria-label={`Scroll ${title} right`}
            onClick={() =>
              ref.current?.scrollBy({ left: 540, behavior: "smooth" })
            }
          >
            <Icon name="right" />
          </button>
        </div>
      </div>
      <div className="movie-row" ref={ref}>
        {items.map((movie) => (
          <button
            className="movie-card"
            aria-label={`View details for ${movie.title}`}
            key={movie.id}
            onClick={() => onSelect(movie)}
          >
            <div className="poster">
              <Image
                src={poster(movie)}
                alt={`${movie.title} poster`}
                width={300}
                height={450}
                sizes="(max-width: 540px) 30vw, (max-width: 850px) 22vw, 160px"
              />
              <span className="poster-rate">
                <Icon name="star" size={28} />
              </span>
              <span className="poster-type">Movie</span>
            </div>
            <Stats movie={movie} />
            <h3>{movie.title}</h3>
          </button>
        ))}
      </div>
    </section>
  );
}
export default function Home() {
  const [nav, setNav] = useState("Board");
  const [genre, setGenre] = useState<Genre | null>(null);
  const [query, setQuery] = useState("");
  const [castQuery, setCastQuery] = useState("");
  const [directorQuery, setDirectorQuery] = useState("");
  const [slide, setSlide] = useState(0);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [panel, setPanel] = useState<string | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const admin = isAdmin(user);

  useEffect(() => {
    const action = createActionContext();
    void getGenres(action).then(setGenres).catch(() => setGenres([]));
    void getMe(action)
      .then(async (account) => {
        setUser(account);
        const page = await getRatings(action);
        setRatings(Object.fromEntries(page.content.map((rating) => [rating.movieId, rating.score])));
      })
      .catch((cause) => {
        // A missing session means guest mode, not a catalogue failure. Keep
        // account errors in the account UI so public browsing stays available.
        if (!(cause instanceof ApiError) || cause.status !== 401) {
          setAuthError(cause instanceof Error ? cause.message : "Account data could not be loaded.");
        }
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const action = createActionContext();
      setLoading(true);
      getMovies({
        q: query.trim() || undefined,
        cast: castQuery.trim() || undefined,
        director: directorQuery.trim() || undefined,
        genreId: genre?.id,
      }, action)
        .then((page) => {
          if (!controller.signal.aborted) {
            setMovies(page.content);
            setApiError("");
            setSlide(0);
          }
        })
        .catch((cause) => {
          if (!controller.signal.aborted) {
            setMovies([]);
            setApiError(cause instanceof Error ? cause.message : "Movies could not be loaded.");
          }
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, query || castQuery || directorQuery ? 300 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query, castQuery, directorQuery, genre]);

  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);

  useEffect(() => {
    identifyClickActor(user?.id);
  }, [user]);

  async function rateMovie(id: string, score: number | null) {
    if (!user) throw new Error("Sign in to submit a personal rating.");
    const action = createActionContext();
    if (score === null) await removeRating(id, action);
    else await saveRating(id, score, action);
    setRatings((current) => {
      const next = { ...current };
      if (score === null) delete next[id]; else next[id] = score;
      return next;
    });
  }
  async function finishAuthentication(account: User, action: ReturnType<typeof createActionContext>) {
    setUser(account);
    setPassword("");
    setPasswordConfirmation("");
    setShowPassword(false);
    setAuthError("");
    setAuthMessage("");
    setPanel(null);

    const [ratingsResult, genresResult] = await Promise.allSettled([
      getRatings(action),
      getGenres(action),
    ]);
    if (ratingsResult.status === "fulfilled") {
      setRatings(Object.fromEntries(ratingsResult.value.content.map((rating) => [rating.movieId, rating.score])));
    }
    if (genresResult.status === "fulfilled") {
      setGenres(genresResult.value);
    }
  }
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthError(""); setAuthMessage(""); setAuthPending(true);
    const action = createActionContext();
    try {
      const account = await login(email, password, action);
      await finishAuthentication(account, action);
    } catch (cause) { setAuthError(formatAuthError(cause, "Sign in failed.")); }
    finally { setAuthPending(false); }
  }
  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthError(""); setAuthMessage("");
    if (password !== passwordConfirmation) {
      setAuthError("Passwords do not match.");
      return;
    }
    setAuthPending(true);
    const action = createActionContext();
    try {
      const account = await register(email, password, displayName, action);
      await finishAuthentication(account, action);
    } catch (cause) {
      setAuthError(formatAuthError(cause, "Registration failed."));
    }
    finally { setAuthPending(false); }
  }
  async function signOut() {
    try { await logout(createActionContext()); setUser(null); setRatings({}); setPanel(null); }
    catch (cause) { setAuthError(cause instanceof Error ? cause.message : "Sign out failed."); }
  }
  async function shareCollection() {
    if (!isAdmin(user)) {
      setShareMessage("Only an admin can share the personal collection.");
      return;
    }
    const entries = movies
      .filter((movie) => ratings[movie.id] !== undefined)
      .map((movie) => `${movie.title} — ${ratings[movie.id]}/5`);
    if (!entries.length) {
      setShareMessage("Add a rating before sharing the collection.");
      return;
    }
    const text = `My SMS Movies collection:\n${entries.join("\n")}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My SMS Movies collection", text });
        setShareMessage("Collection shared.");
      } else {
        await navigator.clipboard.writeText(text);
        setShareMessage("Collection copied to the clipboard.");
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setShareMessage("The collection could not be shared.");
    }
  }
  async function selectMovie(movie: Movie) {
    try { setSelected(await getMovie(movie.id, createActionContext())); }
    catch { setSelected(movie); }
  }
  const featured = movies.length ? movies[slide % Math.min(movies.length, 4)] : null;
  const filtered = movies.filter(
    (movie) =>
      (nav !== "Ratings" || ratings[movie.id] !== undefined),
  );
  const isFiltered = !!genre || !!query || !!castQuery || !!directorQuery || nav !== "Board";
  return (
    <div className="app-shell">
      <header className="header">
        <Link className="logo" href="/" aria-label="SMS Movies home">
          <span>SMS</span>
          <small>MOVIES</small>
        </Link>
        <nav aria-label="Main navigation">
          {["Board", "New"].map((item) => (
            <button
              key={item}
              className={nav === item ? "nav-active" : ""}
              onClick={() => {
                setNav(item);
                setGenre(null);
              }}
            >
              {item === "Board" && <Icon name="flame" size={17} />}
              {item}
            </button>
          ))}
        </nav>
        <div className="header-tools">
          <label className="search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles"
              aria-label="Search by movie title"
            />
            {query ? (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <Icon name="close" size={16} />
              </button>
            ) : (
              <Icon name="search" size={16} />
            )}
          </label>
          <button
            className="icon-button"
            aria-label="Messages"
            onClick={() => setPanel(panel === "messages" ? null : "messages")}
          >
            <Icon name="chat" />
          </button>
          <button
            className="icon-button notification-button"
            aria-label="Notifications"
            onClick={() =>
              setPanel(panel === "notifications" ? null : "notifications")
            }
          >
            <Icon name="bell" />
            <i />
          </button>
          <button
            className="profile"
            onClick={() => setPanel(panel === "profile" ? null : "profile")}
            aria-expanded={panel === "profile"}
          >
            <span className="avatar">{user ? user.displayName.slice(0, 2).toUpperCase() : "?"}</span>
            <span className="profile-text">
              {user?.displayName ?? "Guest"}<small>{user ? user.email : "Sign in"}</small>
            </span>
            <span className="profile-chevron">
              <Icon name="down" size={16} />
            </span>
          </button>
        </div>
        {panel && (
          <div className="header-panel">
            <div className="panel-heading">
              <h3>
                {panel === "profile"
                  ? "Your space"
                  : panel === "messages"
                    ? "Your conversations"
                    : "You’re all caught up"}
              </h3>
              <button aria-label="Close panel" onClick={() => setPanel(null)}>
                <Icon name="close" size={17} />
              </button>
            </div>
            {panel === "profile" && user ? (
              <>
                <p>Welcome back, {user.displayName}. {admin ? "You can maintain and share the personal collection." : "Collection management is restricted to administrators."}</p>
                {admin && (
                  <>
                    <button
                      className="ratings-link"
                      onClick={() => {
                        setNav("Ratings");
                        setPanel(null);
                      }}
                    >
                      Personal collection <span>{Object.keys(ratings).length}</span>
                    </button>
                    <button className="ratings-link" onClick={() => void shareCollection()}>
                      Share collection
                    </button>
                    {shareMessage && <p role="status">{shareMessage}</p>}
                  </>
                )}
                <button className="remove-rating" onClick={() => void signOut()}>Sign out</button>
              </>
            ) : panel === "profile" ? (
              <form onSubmit={authMode === "login" ? signIn : createAccount}>
                <div className="auth-tabs" role="tablist" aria-label="Account access">
                  <button type="button" role="tab" aria-selected={authMode === "login"} onClick={() => { setAuthMode("login"); setPasswordConfirmation(""); setAuthError(""); setAuthMessage(""); }}>Sign in</button>
                  <button type="button" role="tab" aria-selected={authMode === "register"} onClick={() => { setAuthMode("register"); setAuthError(""); setAuthMessage(""); }}>Register</button>
                </div>
                <p>{authMode === "login" ? "Browse and search the catalogue as a guest. Sign in to add personal ratings." : "Create an account and you’ll be signed in automatically."}</p>
                {authMode === "register" && <label>Display name<input type="text" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} required /></label>}
                <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                <label>Password<input type={showPassword ? "text" : "password"} autoComplete={authMode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={authMode === "register" ? 12 : undefined} maxLength={128} required /></label>
                {authMode === "register" && <label>Confirm password<input type={showPassword ? "text" : "password"} autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} minLength={12} maxLength={128} required /></label>}
                <label className="password-visibility"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />Show password{authMode === "register" ? "s" : ""}</label>
                {authMode === "register" && <small>Use 12–128 characters.</small>}
                <button className="auth-submit" type="submit" disabled={authPending}>{authPending ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}</button>
                {authMessage && <p className="auth-success" role="status">{authMessage}</p>}
                {authError && <p className="auth-error" role="alert">{authError}</p>}
              </form>
            ) : (
              <p>
                {panel === "messages"
                  ? "No conversations yet. Your movie-night conversations will appear here."
                  : "New worlds are waiting. Explore the latest additions below."}
              </p>
            )}
          </div>
        )}
      </header>
      <main>
        {apiError && <div className="filter-summary" role="alert"><span>{apiError}<small>{apiError === "Sign in to continue." ? "Open the profile menu to sign in." : "Check the API origin and backend availability."}</small></span></div>}
        {loading && <p className="filter-summary" role="status">Loading catalogue…</p>}
        {featured && (
        <div className="spotlight-layout">
          <section
            className="hero"
            aria-label="Featured movie"
          >
            <Image
              width={1400}
              height={700}
              preload
              className="hero-image"
              src={poster(featured, true)}
              alt={featured.title}
            />
            <div className="hero-shade" />
            <div className="hero-dots">
              {movies.slice(0, 4).map((movie, index) => (
                <button
                  key={movie.id}
                  className={slide === index ? "active" : ""}
                  aria-label={`Show featured movie ${index + 1}`}
                  aria-pressed={slide === index}
                  onClick={() => setSlide(index)}
                />
              ))}
            </div>
            <div className="hero-copy">
              <span className="hero-year">{year(featured)}</span>
              <h1>{featured.title}</h1>
              <Stats movie={featured} />
            </div>
            <button
              className="hero-rate"
              aria-label={`Rate ${featured.title}`}
              onClick={() => void selectMovie(featured)}
            >
              <Icon name="star" size={30} />
              <span>Rate it</span>
            </button>
          </section>
          <aside className="community-picks">
            <h2>Community picks</h2>
            {movies.slice(1, 4).map((movie) => (
              <button
                className="pick-item"
                aria-label={`Rate ${movie.title}`}
                key={movie.id}
                onClick={() => void selectMovie(movie)}
              >
                <div className="pick-image">
                  <Image
                    src={poster(movie)}
                    alt=""
                    width={300}
                    height={180}
                    sizes="160px"
                  />
                  <span className="small-rate">
                    <Icon name="star" size={25} />
                  </span>
                </div>
                <div className="pick-copy">
                  <h3>{movie.title}</h3>
                  <Stats movie={movie} />
                </div>
              </button>
            ))}
          </aside>
        </div>
        )}
        <section className="genre-bar" aria-label="Filter by genre">
          <h2>
            Find by
            <br />
            genre
          </h2>
          <div className="genre-list">
            {genres.map((item) => (
              <button
                key={item.id}
                className={genre?.id === item.id ? "selected" : ""}
                onClick={() => setGenre(genre?.id === item.id ? null : item)}
                aria-pressed={genre?.id === item.id}
              >
                <Icon name={genreIcon[item.name.toLowerCase()] ?? "film"} size={22} />
                {item.name}
              </button>
            ))}
          </div>
        </section>
        <section className="people-filters" aria-label="Search by cast or director">
          <label>
            <span>Cast member</span>
            <input
              type="search"
              value={castQuery}
              onChange={(event) => setCastQuery(event.target.value)}
              placeholder="Search cast"
            />
          </label>
          <label>
            <span>Director</span>
            <input
              type="search"
              value={directorQuery}
              onChange={(event) => setDirectorQuery(event.target.value)}
              placeholder="Search directors"
            />
          </label>
        </section>
        {isFiltered ? (
          <>
            <div className="filter-summary">
              <span>
                {castQuery
                  ? `Cast results for “${castQuery}”`
                  : directorQuery
                    ? `Directed by “${directorQuery}”`
                    : query
                  ? `Results for “${query}”`
                  : genre
                    ? `${genre.name} picks`
                    : nav === "New"
                      ? "Fresh on the board"
                      : nav === "Ratings"
                        ? "Your ratings"
                        : `Explore ${nav.toLowerCase()}`}
                <small>{filtered.length} titles</small>
              </span>
              <button
                onClick={() => {
                  setNav("Board");
                  setGenre(null);
                  setQuery("");
                  setCastQuery("");
                  setDirectorQuery("");
                }}
              >
                Clear filters <Icon name="close" size={14} />
              </button>
            </div>
            {filtered.length ? (
              <MovieRow
                title={
                  nav === "Ratings"
                    ? "Movies you’ve rated"
                    : "Discover and rate"
                }
                items={
                  nav === "New"
                    ? [...filtered].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
                    : filtered
                }
                onSelect={(movie) => void selectMovie(movie)}
              />
            ) : (
              <div className="empty-state">
                <Icon name="film" size={36} />
                <h2>
                  {nav === "Ratings"
                    ? "Your ratings start here"
                    : "No titles found"}
                </h2>
                <p>
                  {nav === "Ratings"
                    ? "Open any movie and choose a score from 1 to 5."
                    : "Try a different title or explore another genre."}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <MovieRow title="Catalogue" items={movies} onSelect={(movie) => void selectMovie(movie)} />
            <MovieRow
              title="New"
              items={[...movies].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)).slice(0, 8)}
              onSelect={(movie) => void selectMovie(movie)}
            />
          </>
        )}
        <footer>
          <span className="footer-wordmark">SMS MOVIES</span>
          <span>Good stories. Better together.</span>
          <span>Your movies. Your opinion.</span>
        </footer>
      </main>
      <dialog
        ref={dialog}
        className="movie-dialog"
        aria-labelledby="movie-title"
        onCancel={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
      >
        {selected && (
          <>
            <button
              className="modal-close"
              aria-label="Close movie details"
              onClick={() => setSelected(null)}
            >
              <Icon name="close" />
            </button>
            <Image
              width={400}
              height={600}
              className="modal-poster"
              src={poster(selected)}
              alt={`${selected.title} poster`}
            />
            <div className="modal-content">
              <span className="eyebrow">DISCOVER & RATE</span>
              <h2 id="movie-title">{selected.title}</h2>
              <div className="modal-meta">
                {year(selected)}
                <span>·</span>
                {selected.durationMinutes} min
                <span>·</span>
                {selected.genre}
              </div>
              <div className="movie-credits">
                <span><strong>Director</strong> {selected.director}</span>
                {selected.cast?.length ? <span><strong>Cast</strong> {selected.cast.join(", ")}</span> : null}
              </div>
              <p>{selected.description}</p>
              <ThirdPartyRatings movie={selected} />
              {user ? (
                <RatingControl
                  key={selected.id}
                  movie={selected}
                  rating={ratings[selected.id]}
                  onRate={rateMovie}
                />
              ) : (
                <p className="rating-note">
                  Sign in to submit one personal rating for this movie, or{" "}
                  <button
                    className="register-link"
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setAuthMode("register");
                      setAuthError("");
                      setAuthMessage("");
                      setPanel("profile");
                    }}
                  >
                    register
                  </button>
                  .
                </p>
              )}
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
