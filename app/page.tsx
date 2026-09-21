"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import Image from "next/image";
import Link from "next/link";

function subscribeWatchlist(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("watchlist-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("watchlist-change", callback);
  };
}
function getWatchlist() {
  try {
    return localStorage.getItem("movie-gather-watchlist") || "[]";
  } catch {
    return "[]";
  }
}

type Movie = {
  id: string;
  title: string;
  genre: string;
  year: number;
  rating: string;
  type: "Movie" | "Series";
  description: string;
};
const movies: Movie[] = [
  {
    id: "pluribus",
    title: "Pluribus",
    genre: "Sci fi",
    year: 2025,
    rating: "8.5",
    type: "Series",
    description:
      "The most miserable person on Earth must save the world from happiness. A mysterious and unexpected story from the creator of Breaking Bad.",
  },
  {
    id: "tron",
    title: "Tron: Ares",
    genre: "Sci fi",
    year: 2025,
    rating: "6.8",
    type: "Movie",
    description:
      "A highly sophisticated program crosses from the digital world into the real world on a dangerous mission.",
  },
  {
    id: "vacation",
    title: "People We Meet on Vacation",
    genre: "Comedy",
    year: 2026,
    rating: "7.2",
    type: "Movie",
    description:
      "Two best friends. Ten summer trips. One last chance to discover whether they might be something more.",
  },
  {
    id: "his-hers",
    title: "His & Hers",
    genre: "Drama",
    year: 2026,
    rating: "7.4",
    type: "Series",
    description:
      "An estranged couple, a detective and a journalist, compete to solve a murder in which each believes the other is a prime suspect.",
  },
  {
    id: "avatar",
    title: "Avatar: Fire and Ash",
    genre: "Fantasy",
    year: 2025,
    rating: "7.6",
    type: "Movie",
    description:
      "Return to Pandora as the Sully family encounters a new Na’vi clan and faces a challenge that will change their world forever.",
  },
  {
    id: "xxx",
    title: "XXX",
    genre: "Action",
    year: 2002,
    rating: "5.8",
    type: "Movie",
    description:
      "An extreme-sports athlete is recruited for an extraordinary undercover mission. The rules are about to change.",
  },
  {
    id: "greenland",
    title: "Greenland 2",
    genre: "Action",
    year: 2026,
    rating: "6.1",
    type: "Movie",
    description:
      "The Garrity family must leave the safety of their bunker and cross a shattered world in search of a new home.",
  },
  {
    id: "housemaid",
    title: "The Housemaid",
    genre: "Drama",
    year: 2025,
    rating: "7.0",
    type: "Movie",
    description:
      "A fresh start in a wealthy household becomes a dangerous game of secrets, deception, and survival.",
  },
  {
    id: "tell-me-lies",
    title: "Tell Me Lies",
    genre: "Drama",
    year: 2022,
    rating: "6.7",
    type: "Series",
    description:
      "A tumultuous relationship unfolds over eight years, drawing everyone around it into a web of secrets.",
  },
  {
    id: "fallout",
    title: "Fallout",
    genre: "Sci fi",
    year: 2024,
    rating: "8.3",
    type: "Series",
    description:
      "A sheltered vault dweller ventures into a beautifully strange and dangerously unpredictable post-apocalyptic world.",
  },
  {
    id: "dune",
    title: "Dune: Part Two",
    genre: "Sci fi",
    year: 2024,
    rating: "8.5",
    type: "Movie",
    description:
      "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. A choice between love and the fate of the universe awaits.",
  },
];
const genres = [
  { name: "Action", icon: "swords" },
  { name: "Comedy", icon: "comedy" },
  { name: "Historical", icon: "building" },
  { name: "Drama", icon: "drama" },
  { name: "Sci fi", icon: "scifi" },
  { name: "Fantasy", icon: "magic" },
  { name: "Music", icon: "music" },
  { name: "Documentary", icon: "film" },
];
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    play: <path d="m9 5 11 7-11 7Z" />,
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
function Stats({ rating, viewers }: { rating: string; viewers?: string }) {
  return (
    <div className="stats">
      {viewers && (
        <span>
          <Icon name="person" size={14} />
          {viewers}
        </span>
      )}
      <span>
        <Icon name="star" size={15} />
        {rating} IMDb
      </span>
      <span>
        <Icon name="chat" size={14} />
        18
      </span>
    </div>
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
            key={movie.id}
            onClick={() => onSelect(movie)}
          >
            <div className="poster">
              <Image
                src={`/images/${movie.id}.jpg`}
                alt={`${movie.title} poster`}
                width={300}
                height={450}
                sizes="(max-width: 540px) 30vw, (max-width: 850px) 22vw, 160px"
              />
              <span className="poster-play">
                <Icon name="play" size={28} />
              </span>
              <span className="poster-type">{movie.type}</span>
            </div>
            <Stats rating={movie.rating} />
            <h3>{movie.title}</h3>
          </button>
        ))}
      </div>
    </section>
  );
}
export default function Home() {
  const [nav, setNav] = useState("Board");
  const [genre, setGenre] = useState("");
  const [query, setQuery] = useState("");
  const [slide, setSlide] = useState(1);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [panel, setPanel] = useState<string | null>(null);
  const savedJson = useSyncExternalStore(
    subscribeWatchlist,
    getWatchlist,
    () => "[]",
  );
  let saved: string[] = [];
  try {
    const value: unknown = JSON.parse(savedJson);
    if (Array.isArray(value))
      saved = value.filter((id): id is string => typeof id === "string");
  } catch {}
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  function toggleSave(id: string) {
    const next = saved.includes(id)
      ? saved.filter((item) => item !== id)
      : [...saved, id];
    localStorage.setItem("movie-gather-watchlist", JSON.stringify(next));
    window.dispatchEvent(new Event("watchlist-change"));
  }
  const featured = [movies[4], movies[10], movies[1], movies[9]][slide];
  const filtered = movies.filter(
    (movie) =>
      (!genre || movie.genre === genre) &&
      movie.title.toLowerCase().includes(query.toLowerCase()) &&
      (nav !== "Movies" || movie.type === "Movie") &&
      (nav !== "Series" || movie.type === "Series") &&
      (nav !== "Watchlist" || saved.includes(movie.id)),
  );
  const isFiltered = !!genre || !!query || nav !== "Board";
  return (
    <div className="app-shell">
      <header className="header">
        <Link className="logo" href="/" aria-label="Movie Gather home">
          <span>
            M<span className="logo-moon" />
            VIE
          </span>
          <small>GATHER</small>
        </Link>
        <nav aria-label="Main navigation">
          {["Board", "New", "Movies", "Series"].map((item) => (
            <button
              key={item}
              className={nav === item ? "nav-active" : ""}
              onClick={() => {
                setNav(item);
                setGenre("");
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search movies and series"
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
            <span className="avatar">LP</span>
            <span className="profile-text">
              Lee Phang<small>Premium</small>
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
            {panel === "profile" ? (
              <>
                <p>Good evening, Lee. Make it a movie night.</p>
                <button
                  className="watchlist-link"
                  onClick={() => {
                    setNav("Watchlist");
                    setPanel(null);
                  }}
                >
                  My watchlist <span>{saved.length}</span>
                </button>
                <div className="plan-label">✦ Premium member</div>
              </>
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
        <div className="spotlight-layout">
          <section
            className={`hero hero-${featured.id}`}
            aria-label="Featured movie"
          >
            <Image
              width={1400}
              height={700}
              preload
              className="hero-image"
              src={`/images/${featured.id === "dune" ? "dune-hero" : featured.id}.jpg`}
              alt={
                featured.title === "Dune: Part Two"
                  ? "Lady Jessica on Arrakis"
                  : featured.title
              }
            />
            <div className="hero-shade" />
            <div className="hero-dots">
              {[0, 1, 2, 3].map((index) => (
                <button
                  key={index}
                  className={slide === index ? "active" : ""}
                  aria-label={`Show featured movie ${index + 1}`}
                  aria-pressed={slide === index}
                  onClick={() => setSlide(index)}
                />
              ))}
            </div>
            <div className="hero-copy">
              <span className="hero-year">{featured.year}</span>
              <h1>{featured.title}</h1>
              <Stats rating={featured.rating} viewers="243" />
            </div>
            <button
              className="hero-play"
              aria-label={`Watch ${featured.title}`}
              onClick={() => setSelected(featured)}
            >
              <Icon name="play" size={49} />
            </button>
          </section>
          <aside className="now-watching">
            <h2>Now watching</h2>
            {[movies[0], movies[3], movies[6]].map((movie, index) => (
              <button
                className="watching-item"
                key={movie.id}
                onClick={() => setSelected(movie)}
              >
                <div className="watching-image">
                  <Image
                    src={`/images/${movie.id}.jpg`}
                    alt=""
                    width={300}
                    height={180}
                    sizes="160px"
                  />
                  <span className="viewer-count">
                    <Icon name="person" size={11} />
                    {[123, 422, 307][index]}
                  </span>
                  <span className="small-play">
                    <Icon name="play" size={27} />
                  </span>
                  <span
                    className="watching-progress"
                    style={{ width: `${[38, 65, 22][index]}%` }}
                  />
                </div>
                <div className="watching-copy">
                  <h3>{movie.title}</h3>
                  {index === 1 && (
                    <div className="episode-tags">
                      <span>1 season</span>
                      <span>6 episodes</span>
                    </div>
                  )}
                  <Stats rating={movie.rating} />
                </div>
              </button>
            ))}
          </aside>
        </div>
        <section className="genre-bar" aria-label="Filter by genre">
          <h2>
            Find by
            <br />
            genre
          </h2>
          <div className="genre-list">
            {genres.map((item) => (
              <button
                key={item.name}
                className={genre === item.name ? "selected" : ""}
                onClick={() => setGenre(genre === item.name ? "" : item.name)}
                aria-pressed={genre === item.name}
              >
                <Icon name={item.icon} size={22} />
                {item.name}
              </button>
            ))}
          </div>
        </section>
        {isFiltered ? (
          <>
            <div className="filter-summary">
              <span>
                {query
                  ? `Results for “${query}”`
                  : genre
                    ? `${genre} picks`
                    : nav === "New"
                      ? "Fresh on the board"
                      : nav === "Watchlist"
                        ? "Your watchlist"
                        : `Explore ${nav.toLowerCase()}`}
                <small>{filtered.length} titles</small>
              </span>
              <button
                onClick={() => {
                  setNav("Board");
                  setGenre("");
                  setQuery("");
                }}
              >
                Clear filters <Icon name="close" size={14} />
              </button>
            </div>
            {filtered.length ? (
              <MovieRow
                title={
                  nav === "Watchlist"
                    ? "Saved for a good night"
                    : "Made for your next movie night"
                }
                items={
                  nav === "New"
                    ? [...filtered].sort((a, b) => b.year - a.year)
                    : filtered
                }
                onSelect={setSelected}
              />
            ) : (
              <div className="empty-state">
                <Icon name="film" size={36} />
                <h2>
                  {nav === "Watchlist"
                    ? "Your next favorite belongs here"
                    : "No titles found"}
                </h2>
                <p>
                  {nav === "Watchlist"
                    ? "Open any movie and add it to your watchlist."
                    : "Try a different title or explore another genre."}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <MovieRow title="Trending" items={movies} onSelect={setSelected} />
            <MovieRow
              title="New"
              items={[
                movies[7],
                movies[3],
                movies[2],
                movies[10],
                movies[8],
                movies[9],
                movies[4],
                movies[1],
              ]}
              onSelect={setSelected}
            />
          </>
        )}
        <footer>
          <span className="footer-wordmark">MOVIE GATHER</span>
          <span>Good stories. Better together.</span>
          <span>Make tonight a movie night.</span>
        </footer>
      </main>
      <dialog
        ref={dialog}
        className="movie-dialog"
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
              src={`/images/${selected.id}.jpg`}
              alt={`${selected.title} poster`}
            />
            <div className="modal-content">
              <span className="eyebrow">YOUR NEXT GREAT WATCH</span>
              <h2>{selected.title}</h2>
              <div className="modal-meta">
                {selected.year}
                <span>·</span>
                {selected.type}
                <span>·</span>
                {selected.genre}
              </div>
              <Stats rating={selected.rating} />
              <p>{selected.description}</p>
              <a
                className="trailer-button"
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selected.title + " official trailer")}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="play" /> Find official trailer
              </a>
              <button
                className="save-button"
                onClick={() => toggleSave(selected.id)}
              >
                <Icon name={saved.includes(selected.id) ? "check" : "plus"} />
                {saved.includes(selected.id)
                  ? "Saved to watchlist"
                  : "Add to watchlist"}
              </button>
              <small className="preview-note">
                Discover your next watch. Full streaming is not available in
                this demo.
              </small>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
