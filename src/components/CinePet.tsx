import { useMemo, useState } from "react";

interface CinePetProps {
  activeGenre: string | null;
  activePage: string;
  error: string;
  loading: boolean;
  onSuggest: (query: string) => void;
  searchTerm: string;
}

const JOKES = [
  "I rate snacks by plot thickness.",
  "My cardio is chasing spoilers.",
  "I paused a trailer once. Still recovering.",
  "I only cry in Dolby surround.",
  "My watchlist has a watchlist.",
];

const SUGGESTIONS = [
  "3 Idiots",
  "Interstellar",
  "Parasite",
  "Dangal",
  "The Dark Knight",
  "Spirited Away",
];

function getPetLine({
  activeGenre,
  activePage,
  error,
  joke,
  loading,
  searchTerm,
}: {
  activeGenre: string | null;
  activePage: string;
  error: string;
  joke: string;
  loading: boolean;
  searchTerm: string;
}) {
  if (loading) {
    return "Scanning the cinema universe. I wore tiny 3D glasses for this.";
  }

  if (error) {
    return "No poster? No problem. I will interrogate the popcorn.";
  }

  if (searchTerm.trim()) {
    return `Looking for "${searchTerm.trim()}". I hope it has a snack scene.`;
  }

  if (activeGenre) {
    return `${activeGenre} mode. I have arranged dramatic lighting.`;
  }

  if (activePage === "top-rated" || activePage === "top-rated-detail") {
    return "Top rated patrol. I am judging with tiny but serious eyebrows.";
  }

  return joke;
}

const CinePet = ({
  activeGenre,
  activePage,
  error,
  loading,
  onSuggest,
  searchTerm,
}: CinePetProps) => {
  const [jokeIndex, setJokeIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [boopCount, setBoopCount] = useState(0);

  const suggestion = SUGGESTIONS[boopCount % SUGGESTIONS.length];
  const petLine = useMemo(
    () =>
      getPetLine({
        activeGenre,
        activePage,
        error,
        joke: JOKES[jokeIndex],
        loading,
        searchTerm,
      }),
    [activeGenre, activePage, error, jokeIndex, loading, searchTerm]
  );

  const mood = loading
    ? "working"
    : error
      ? "dramatic"
      : searchTerm.trim()
        ? "detective"
        : "chill";

  const handlePetClick = () => {
    setBoopCount((currentCount) => currentCount + 1);
    setJokeIndex((currentIndex) => (currentIndex + 1) % JOKES.length);
  };

  return (
    <aside className={`cine-pet ${isMinimized ? "minimized" : ""}`} aria-label="Cine pet">
      <button
        className="cine-pet-toggle"
        type="button"
        aria-label={isMinimized ? "Open Cine pet" : "Minimize Cine pet"}
        onClick={() => setIsMinimized((currentState) => !currentState)}
      >
        {isMinimized ? "+" : "-"}
      </button>

      {!isMinimized && (
        <>
          <button
            className={`cine-pet-character ${mood}`}
            type="button"
            aria-label="Boop Cine pet"
            onClick={handlePetClick}
          >
            <span className="pet-shadow" />
            <span className="pet-body">
              <span className="pet-kernel top-left" />
              <span className="pet-kernel top-right" />
              <span className="pet-kernel middle" />
              <span className="pet-glasses">
                <span />
                <span />
              </span>
              <span className="pet-eyes">
                <span />
                <span />
              </span>
              <span className="pet-mouth" />
              <span className="pet-arm left" />
              <span className="pet-arm right" />
            </span>
          </button>

          <div className="cine-pet-panel">
            <p className="cine-pet-name">Popcorn Pal</p>
            <p className="cine-pet-line">{petLine}</p>
            <div className="cine-pet-actions">
              <button type="button" onClick={handlePetClick}>
                Joke
              </button>
              <button type="button" onClick={() => onSuggest(suggestion)}>
                Pick
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};

export default CinePet;
