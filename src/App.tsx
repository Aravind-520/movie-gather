import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, MouseEvent } from "react";
import "./App.css";

import SearchBar from "./components/SearchBar";
import MovieCard from "./components/MovieCard";
import CinePet from "./components/CinePet";

import type { Movie, ApiResponse } from "./types";

const API_KEY = import.meta.env.VITE_OMDB_API_KEY || "cb331034";
const OMDB_API_URL = "https://www.omdbapi.com/";
const OMDB_CACHE_PREFIX = "movie-gather:omdb:";
const OMDB_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

type OmdbMovieResponse = Movie & {
  Response?: string;
  Error?: string;
};

interface CachedOmdbValue<T> {
  data: T;
  expiresAt: number;
}

const NEW_RELEASE_TITLES = [
  "Dune: Part Two",
  "Furiosa: A Mad Max Saga",
  "Inside Out 2",
  "Deadpool & Wolverine",
  "Civil War",
  "The Fall Guy",
  "Twisters",
  "Challengers",
  "A Quiet Place: Day One",
  "Kingdom of the Planet of the Apes",
];

const FALLBACK_RELEASES: Movie[] = NEW_RELEASE_TITLES.map((title, index) => ({
  imdbID: `fallback-${index}`,
  Title: title,
  Year: "2024",
  Poster: "N/A",
  Type: "movie",
  imdbRating: index % 3 === 0 ? "7.8" : "7.1",
  Genre: index % 2 === 0 ? "Action, Adventure" : "Drama, Thriller",
  Runtime: "2h",
}));

const createFallbackMovie = (
  title: string,
  index: number,
  prefix = "fallback"
): Movie => ({
  imdbID: `${prefix}-${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  Title: title,
  Year: "Top rated",
  Poster: "N/A",
  Type: "movie",
  imdbRating: "N/A",
});

const buildOmdbCacheKey = (params: Record<string, string>) => {
  const normalizedParams = Object.entries(params)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}:${value.trim().toLowerCase()}`)
    .join("|");

  return `${OMDB_CACHE_PREFIX}${normalizedParams}`;
};

const readOmdbCache = <T,>(cacheKey: string): T | null => {
  let cachedValue: string | null;

  try {
    cachedValue = window.localStorage.getItem(cacheKey);
  } catch {
    return null;
  }

  if (!cachedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(cachedValue) as CachedOmdbValue<T>;

    if (parsedValue.expiresAt > Date.now()) {
      return parsedValue.data;
    }
  } catch {
    // Bad cache values are ignored and replaced by the next successful request.
  }

  try {
    window.localStorage.removeItem(cacheKey);
  } catch {
    return null;
  }

  return null;
};

const writeOmdbCache = <T,>(cacheKey: string, data: T) => {
  const payload: CachedOmdbValue<T> = {
    data,
    expiresAt: Date.now() + OMDB_CACHE_TTL_MS,
  };

  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch {
    // Storage can fail in private browsing or when quota is full; API still works.
  }
};

const fetchOmdb = async <T extends { Response?: string; Error?: string }>(
  params: Record<string, string>
) => {
  const cacheKey = buildOmdbCacheKey(params);
  const cachedValue = readOmdbCache<T>(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const searchParams = new URLSearchParams({
    apikey: API_KEY,
    ...params,
  });
  const response = await fetch(`${OMDB_API_URL}?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`OMDb request failed with status ${response.status}`);
  }

  const data = (await response.json()) as T;
  const isRequestLimitError =
    data.Response === "False" && data.Error?.toLowerCase().includes("request limit");

  if (!isRequestLimitError) {
    writeOmdbCache(cacheKey, data);
  }

  return data;
};

const fetchMovieByTitle = async (title: string) => {
  try {
    const data = await fetchOmdb<OmdbMovieResponse>({
      plot: "short",
      t: title,
    });

    return data.Response === "True" ? data : null;
  } catch {
    return null;
  }
};

const CATEGORIES = [
  "Action",
  "Comedy",
  "Drama",
  "Sci-Fi",
  "Fantasy",
  "Documentary",
] as const;

type Category = (typeof CATEGORIES)[number];
type Page = "home" | "top-rated" | "top-rated-detail";

interface TopRatedGroup {
  id: string;
  title: string;
  kicker: string;
  titles: string[];
}

interface TopRatedSection extends Omit<TopRatedGroup, "titles"> {
  movies: Movie[];
}

const GENRE_TITLES: Record<Category, string[]> = {
  Action: [
    "Mad Max: Fury Road",
    "John Wick",
    "The Dark Knight",
    "Top Gun: Maverick",
    "Gladiator",
    "Mission: Impossible - Fallout",
  ],
  Comedy: [
    "The Hangover",
    "Superbad",
    "The Grand Budapest Hotel",
    "Free Guy",
    "Game Night",
    "Paddington 2",
  ],
  Drama: [
    "Oppenheimer",
    "The Shawshank Redemption",
    "Forrest Gump",
    "The Social Network",
    "Whiplash",
    "Parasite",
  ],
  "Sci-Fi": [
    "Interstellar",
    "Blade Runner 2049",
    "Arrival",
    "The Matrix",
    "Dune",
    "Inception",
  ],
  Fantasy: [
    "The Lord of the Rings: The Fellowship of the Ring",
    "Harry Potter and the Sorcerer's Stone",
    "The Hobbit: An Unexpected Journey",
    "Pan's Labyrinth",
    "Stardust",
    "The Princess Bride",
  ],
  Documentary: [
    "Free Solo",
    "Won't You Be My Neighbor?",
    "The Last Dance",
    "13th",
    "Icarus",
    "My Octopus Teacher",
  ],
};

const TOP_RATED_GROUPS: TopRatedGroup[] = [
  {
    id: "action",
    title: "Top Rated Action",
    kicker: "Genre",
    titles: [
      "The Dark Knight",
      "Gladiator",
      "Mad Max: Fury Road",
      "Terminator 2: Judgment Day",
      "Top Gun: Maverick",
      "John Wick: Chapter 4",
      "Die Hard",
      "Heat",
      "The Raid: Redemption",
      "Casino Royale",
      "The Bourne Ultimatum",
      "Kill Bill: Vol. 1",
      "Aliens",
      "Logan",
      "The Avengers",
      "Skyfall",
      "Baby Driver",
      "Edge of Tomorrow",
      "The Equalizer",
      "Nobody",
    ],
  },
  {
    id: "drama",
    title: "Top Rated Drama",
    kicker: "Genre",
    titles: [
      "The Shawshank Redemption",
      "Forrest Gump",
      "Fight Club",
      "Whiplash",
      "The Social Network",
      "Oppenheimer",
      "The Godfather",
      "Goodfellas",
      "12 Angry Men",
      "There Will Be Blood",
      "The Green Mile",
      "A Beautiful Mind",
      "The Pianist",
      "Manchester by the Sea",
      "Moonlight",
      "The Departed",
      "No Country for Old Men",
      "The Prestige",
      "A Star Is Born",
      "La La Land",
    ],
  },
  {
    id: "sci-fi",
    title: "Top Rated Sci-Fi",
    kicker: "Genre",
    titles: [
      "Interstellar",
      "Inception",
      "The Matrix",
      "Blade Runner 2049",
      "Arrival",
      "Dune: Part Two",
      "Alien",
      "2001: A Space Odyssey",
      "The Terminator",
      "Ex Machina",
      "Star Wars: Episode V - The Empire Strikes Back",
      "Back to the Future",
      "Her",
      "Minority Report",
      "The Martian",
      "Children of Men",
      "District 9",
      "Looper",
      "Moon",
      "Source Code",
    ],
  },
  {
    id: "hindi",
    title: "Hindi Language Picks",
    kicker: "Language",
    titles: [
      "3 Idiots",
      "Dangal",
      "Lagaan",
      "Sholay",
      "Drishyam",
      "Gangs of Wasseypur",
      "Taare Zameen Par",
      "Andhadhun",
      "Queen",
      "Swades",
      "Rang De Basanti",
      "Zindagi Na Milegi Dobara",
      "Barfi!",
      "PK",
      "Kahaani",
      "Dil Chahta Hai",
      "Article 15",
      "Black Friday",
      "Haider",
      "Chak De! India",
    ],
  },
  {
    id: "korean",
    title: "Korean Language Picks",
    kicker: "Language",
    titles: [
      "Parasite",
      "Oldboy",
      "Memories of Murder",
      "Train to Busan",
      "The Handmaiden",
      "Past Lives",
      "The Wailing",
      "Burning",
      "Decision to Leave",
      "The Host",
      "I Saw the Devil",
      "A Tale of Two Sisters",
      "The Man from Nowhere",
      "Mother",
      "Joint Security Area",
      "The Chaser",
      "The Age of Shadows",
      "Minari",
      "Broker",
      "Secret Sunshine",
    ],
  },
  {
    id: "japanese",
    title: "Japanese Language Picks",
    kicker: "Language",
    titles: [
      "Spirited Away",
      "Your Name.",
      "Seven Samurai",
      "Princess Mononoke",
      "Akira",
      "Godzilla Minus One",
      "Grave of the Fireflies",
      "Rashomon",
      "Drive My Car",
      "Howl's Moving Castle",
      "My Neighbor Totoro",
      "Tokyo Story",
      "Yojimbo",
      "Ikiru",
      "High and Low",
      "Shoplifters",
      "The Boy and the Heron",
      "Perfect Days",
      "Battle Royale",
      "Harakiri",
    ],
  },
];

function TopRatedCarousel({
  onMoreClick,
  section,
  offset,
}: {
  onMoreClick: (sectionId: string) => void;
  section: TopRatedSection;
  offset: number;
}) {
  const [queueStart, setQueueStart] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [highlightPulse, setHighlightPulse] = useState(0);
  const hasMultipleItems = section.movies.length > 1;
  const orderedMovies = useMemo(
    () =>
      section.movies.map(
        (_, index) => section.movies[(queueStart + index) % section.movies.length]
      ),
    [queueStart, section.movies]
  );

  useEffect(() => {
    if (!hasMultipleItems) {
      return;
    }

    const timer = window.setInterval(() => {
      setIsSliding(true);

      window.setTimeout(() => {
        setQueueStart((currentIndex) => (currentIndex + 1) % section.movies.length);
        setIsSliding(false);
        setHighlightPulse((currentPulse) => currentPulse + 1);
      }, 760);
    }, 3400 + offset * 220);

    return () => window.clearInterval(timer);
  }, [hasMultipleItems, offset, section.movies.length]);

  return (
    <section className="top-showcase" aria-label={section.title}>
      <div className="top-showcase-heading">
        <div>
          <p className="eyebrow">{section.kicker}</p>
          <h2>{section.title}</h2>
        </div>
      </div>

      <div className="top-carousel-window">
        <div className={`top-carousel-track${isSliding ? " sliding" : ""}`}>
          {orderedMovies.map((movie, index) => (
            <div
              className={`top-carousel-card${index === 0 ? " highlighted" : ""}`}
              key={`${section.id}-${movie.imdbID}${
                index === 0 ? `-${highlightPulse}` : ""
              }`}
            >
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      </div>

      <a
        className="top-more-link"
        href={`#top-rated-${section.id}`}
        onClick={(event) => {
          event.preventDefault();
          onMoreClick(section.id);
        }}
      >
        More+
      </a>
    </section>
  );
}

function App() {
  const [activePage, setActivePage] = useState<Page>(() =>
    window.location.hash.startsWith("#top-rated-")
      ? "top-rated-detail"
      : window.location.hash === "#top-rated"
        ? "top-rated"
        : "home"
  );
  const [activeTopRatedSectionId, setActiveTopRatedSectionId] = useState(() =>
    window.location.hash.startsWith("#top-rated-")
      ? window.location.hash.replace("#top-rated-", "")
      : ""
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genreMovies, setGenreMovies] = useState<Movie[]>([]);
  const [newReleases, setNewReleases] = useState<Movie[]>(FALLBACK_RELEASES);
  const [topRatedSections, setTopRatedSections] = useState<TopRatedSection[]>([]);
  const [topRatedLoading, setTopRatedLoading] = useState(false);
  const [activeGenre, setActiveGenre] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const featuredScrollPosition = useRef<{ left: number; top: number } | null>(null);
  const searchRequestId = useRef(0);

  const isBrowsing = !searchTerm.trim() && !activeGenre;
  const isSearching = Boolean(searchTerm.trim());
  const displayedMovies = isSearching
    ? movies
    : activeGenre
      ? genreMovies
      : newReleases;
  const featuredMovies = useMemo(() => newReleases.slice(0, 6), [newReleases]);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const featuredMovie = featuredMovies[activeFeaturedIndex % featuredMovies.length];
  const activeFeaturedPosition = activeFeaturedIndex % featuredMovies.length;
  const heroStyle =
    featuredMovie?.Poster && featuredMovie.Poster !== "N/A"
      ? ({ "--hero-bg": `url(${featuredMovie.Poster})` } as CSSProperties)
      : undefined;
  const activeTopRatedSection = topRatedSections.find(
    (section) => section.id === activeTopRatedSectionId
  );

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);

    if (value.trim()) {
      setActivePage("home");
      setActiveGenre(null);
    }

    if (!value.trim()) {
      searchRequestId.current += 1;
      setMovies([]);
      setLoading(false);
      setError("");
    }
  };

  const handleHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setActivePage("home");
    handleSearchTermChange("");
    setActiveGenre(null);
    setGenreMovies([]);
    setActiveFeaturedIndex(0);
    window.history.pushState(null, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNewReleasesClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setActivePage("home");
    handleSearchTermChange("");
    setActiveGenre(null);
    setGenreMovies([]);
    window.history.pushState(null, "", "#new-releases");
    document.getElementById("new-releases")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCategoriesClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setActivePage("home");
    window.history.pushState(null, "", "#categories");
    window.setTimeout(() => {
      document.getElementById("categories")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  };

  const handleTopRatedClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setActivePage("top-rated");
    handleSearchTermChange("");
    setActiveGenre(null);
    setGenreMovies([]);
    window.history.pushState(null, "", "#top-rated");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTopRatedMoreClick = (sectionId: string) => {
    setActivePage("top-rated-detail");
    setActiveTopRatedSectionId(sectionId);
    handleSearchTermChange("");
    setActiveGenre(null);
    setGenreMovies([]);
    window.history.pushState(null, "", `#top-rated-${sectionId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTopRatedBackClick = () => {
    setActivePage("top-rated");
    window.history.pushState(null, "", "#top-rated");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const fetchNewReleases = async () => {
      try {
        const releases = await Promise.all(
          NEW_RELEASE_TITLES.map(async (title) => {
            return fetchMovieByTitle(title);
          })
        );

        const validReleases = releases.filter(Boolean) as Movie[];
        if (validReleases.length) {
          setNewReleases(validReleases);
        }
      } catch {
        setNewReleases(FALLBACK_RELEASES);
      }
    };

    fetchNewReleases();
  }, []);

  useEffect(() => {
    if (
      !["top-rated", "top-rated-detail"].includes(activePage) ||
      topRatedSections.length
    ) {
      return;
    }

    const fetchTopRatedSections = async () => {
      try {
        setTopRatedLoading(true);

        const sections = await Promise.all(
          TOP_RATED_GROUPS.map(async (group) => {
            const moviesForGroup = await Promise.all(
              group.titles.map(async (title, index) => {
                const movie = await fetchMovieByTitle(title);
                return movie ?? createFallbackMovie(title, index, group.id);
              })
            );

            return {
              id: group.id,
              title: group.title,
              kicker: group.kicker,
              movies: moviesForGroup,
            };
          })
        );

        setTopRatedSections(sections.filter((section) => section.movies.length));
      } catch {
        setTopRatedSections([]);
      } finally {
        setTopRatedLoading(false);
      }
    };

    fetchTopRatedSections();
  }, [activePage, topRatedSections.length]);

  const runMovieSearch = useCallback(async (query: string) => {
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;

    if (!query) {
      setMovies([]);
      setError("");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await fetchOmdb<ApiResponse>({ s: query });

      if (requestId !== searchRequestId.current) {
        return;
      }

      if (data.Response === "True" && data.Search) {
        setMovies(data.Search);
      } else {
        setMovies([]);
        setError(data.Error || "Movies not found");
      }
    } catch {
      if (requestId !== searchRequestId.current) {
        return;
      }

      setError("Failed to fetch movies");
    } finally {
      if (requestId === searchRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  const fetchMoviesByGenre = useCallback(async (genre: Category) => {
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;

    setSearchTerm("");
    setActivePage("home");
    setActiveGenre(genre);
    setLoading(true);
    setError("");

    try {
      const genreResults = await Promise.all(
        GENRE_TITLES[genre].map(async (title) => {
          return fetchMovieByTitle(title);
        })
      );

      if (requestId !== searchRequestId.current) {
        return;
      }

      const validGenreMovies = genreResults.filter(Boolean) as Movie[];
      setGenreMovies(validGenreMovies);

      if (!validGenreMovies.length) {
        setError(`No ${genre} movies found`);
      }
    } catch {
      if (requestId !== searchRequestId.current) {
        return;
      }

      setGenreMovies([]);
      setError(`Failed to fetch ${genre} movies`);
    } finally {
      if (requestId === searchRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const query = searchTerm.trim();

    if (!query) {
      return;
    }

    const searchTimer = window.setTimeout(() => {
      runMovieSearch(query);
    }, 350);

    return () => window.clearTimeout(searchTimer);
  }, [runMovieSearch, searchTerm]);

  useEffect(() => {
    if (activePage !== "home" || isSearching || featuredMovies.length <= 1) {
      return;
    }

    const slideTimer = window.setInterval(() => {
      if (window.scrollY > 120) {
        return;
      }

      featuredScrollPosition.current = {
        left: window.scrollX,
        top: window.scrollY,
      };
      setActiveFeaturedIndex((currentIndex) => currentIndex + 1);
    }, 5000);

    return () => window.clearInterval(slideTimer);
  }, [activePage, featuredMovies.length, isSearching]);

  useLayoutEffect(() => {
    const scrollPosition = featuredScrollPosition.current;

    if (!scrollPosition) {
      return;
    }

    const restoreScrollPosition = () => {
      const scroller = document.scrollingElement ?? document.documentElement;
      scroller.scrollLeft = scrollPosition.left;
      scroller.scrollTop = scrollPosition.top;
      document.body.scrollLeft = scrollPosition.left;
      document.body.scrollTop = scrollPosition.top;
    };

    restoreScrollPosition();
    window.requestAnimationFrame(() => {
      restoreScrollPosition();
      window.setTimeout(() => {
        restoreScrollPosition();
        featuredScrollPosition.current = null;
      }, 80);
    });
  }, [activeFeaturedIndex]);

  const fetchMovies = () => {
    runMovieSearch(searchTerm.trim());
  };

  const handlePetSuggestion = (query: string) => {
    setActivePage("home");
    setActiveGenre(null);
    setGenreMovies([]);
    handleSearchTermChange(query);
    window.history.pushState(null, "", window.location.pathname);
  };

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="/" aria-label="Movie Gather home" onClick={handleHomeClick}>
          <span>Movie</span>
          <strong>Gather</strong>
        </a>

        <nav className="nav-links" aria-label="Primary navigation">
          <a
            className={activePage === "home" ? "active" : ""}
            href="#new-releases"
            onClick={handleNewReleasesClick}
          >
            New Releases
          </a>
          <a
            className={activePage === "top-rated" ? "active" : ""}
            href="#top-rated"
            onClick={handleTopRatedClick}
          >
            Top Rated
          </a>
          <a href="#categories" onClick={handleCategoriesClick}>
            Categories
          </a>
        </nav>

        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={handleSearchTermChange}
          onSearch={fetchMovies}
        />
      </header>

      <main>
        {activePage === "top-rated" ? (
          <section className="top-rated-page" id="top-rated">
            <div className="top-page-hero">
              <p className="eyebrow">Premium charts</p>
              <h1>Top Rated</h1>
              <p>
                Browse high-rated films grouped by genre and language, with each row
                moving automatically.
              </p>
            </div>

            {topRatedLoading && <div className="status">Loading top rated titles...</div>}

            <div className="top-showcases">
              {topRatedSections.map((section, index) => (
                <TopRatedCarousel
                  key={section.id}
                  onMoreClick={handleTopRatedMoreClick}
                  offset={index}
                  section={section}
                />
              ))}
            </div>
          </section>
        ) : activePage === "top-rated-detail" ? (
          <section className="top-rated-detail-page">
            {activeTopRatedSection ? (
              <>
                <div className="top-detail-hero">
                  <button type="button" onClick={handleTopRatedBackClick}>
                    Back to Top Rated
                  </button>
                  <p className="eyebrow">{activeTopRatedSection.kicker}</p>
                  <h1>{activeTopRatedSection.title}</h1>
                </div>

                <div className="movies-grid top-detail-grid">
                  {activeTopRatedSection.movies.map((movie) => (
                    <MovieCard
                      key={`${activeTopRatedSection.id}-detail-${movie.imdbID}`}
                      movie={movie}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="status">Loading top rated movies...</div>
            )}
          </section>
        ) : (
          <>
        {featuredMovie && !isSearching && (
          <section
            className="hero-section"
            style={heroStyle}
            aria-label="Featured movie"
          >
            <div className="hero-copy">
              <p className="eyebrow">Featured release</p>
              <h1>{featuredMovie.Title}</h1>
              <div className="hero-meta">
                {featuredMovie.imdbRating && featuredMovie.imdbRating !== "N/A" && (
                  <span>{featuredMovie.imdbRating} IMDb</span>
                )}
                <span>{featuredMovie.Year}</span>
                {featuredMovie.Runtime && featuredMovie.Runtime !== "N/A" && (
                  <span>{featuredMovie.Runtime}</span>
                )}
                {featuredMovie.Genre && featuredMovie.Genre !== "N/A" && (
                  <span>{featuredMovie.Genre.split(",")[0]}</span>
                )}
              </div>
              <p className="hero-description">
                {featuredMovie.Plot && featuredMovie.Plot !== "N/A"
                  ? featuredMovie.Plot
                  : "Discover a sharp lineup of cinematic releases, top-rated picks, and genre favorites ready for your next watch."}
              </p>
              <div className="hero-actions">
                <button type="button">Play Preview</button>
                <a href="#new-releases">Explore List</a>
              </div>
            </div>

            <div className="featured-carousel" aria-label="Featured release slideshow">
              <div className="hero-poster" aria-hidden="true">
                {featuredMovie.Poster !== "N/A" ? (
                  <img src={featuredMovie.Poster} alt="" />
                ) : (
                  <span>{featuredMovie.Title}</span>
                )}
              </div>

              <div className="featured-slides">
                {featuredMovies.map((movie, index) => (
                  <button
                    className={`featured-slide${
                      index === activeFeaturedPosition ? " active" : ""
                    }`}
                    key={`${movie.imdbID}-featured`}
                    type="button"
                    aria-label={`Show ${movie.Title}`}
                    aria-pressed={index === activeFeaturedPosition}
                    onClick={() => setActiveFeaturedIndex(index)}
                  >
                    {movie.Poster !== "N/A" ? (
                      <img src={movie.Poster} alt="" />
                    ) : (
                      <span>{movie.Title}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="category-strip" id="categories" aria-label="Genres">
          <span>Find by genre</span>
          {CATEGORIES.map((category) => (
            <button
              className={category === activeGenre ? "active" : ""}
              key={category}
              type="button"
              aria-pressed={category === activeGenre}
              onClick={() => fetchMoviesByGenre(category)}
            >
              {category}
            </button>
          ))}
        </section>

        <section className="content-section" id="new-releases">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {isBrowsing ? "Browse" : activeGenre ? "Genre" : "Results"}
              </p>
              <h2>
                {isBrowsing
                  ? "New Releases"
                  : activeGenre
                    ? `${activeGenre} Movies`
                    : `Search results for "${searchTerm}"`}
              </h2>
            </div>
            {!isBrowsing && (
              <p>
                {activeGenre
                  ? `Curated ${activeGenre.toLowerCase()} picks from OMDb.`
                  : `${displayedMovies.length} title${
                      displayedMovies.length === 1 ? "" : "s"
                    } found`}
              </p>
            )}
          </div>

          {loading && <div className="status">Loading titles...</div>}
          {error && <div className="status error">{error}</div>}

          <div className="movies-grid">
            {displayedMovies.map((movie) => (
              <MovieCard key={movie.imdbID} movie={movie} />
            ))}
          </div>
        </section>

        <section className="content-section compact-section" id="top-rated">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Curated</p>
              <h2>Top Rated</h2>
            </div>
          </div>

          <div className="top-rated-list">
            {newReleases.slice(0, 4).map((movie, index) => (
              <article key={`${movie.imdbID}-rated`} className="rated-row">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{movie.Title}</h3>
                  <p>
                    {movie.imdbRating && movie.imdbRating !== "N/A"
                      ? `${movie.imdbRating} IMDb`
                      : movie.Genre || movie.Year}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
          </>
        )}
      </main>
      <CinePet
        activeGenre={activeGenre}
        activePage={activePage}
        error={error}
        loading={loading || topRatedLoading}
        onSuggest={handlePetSuggestion}
        searchTerm={searchTerm}
      />
    </div>
  );
}

export default App;
