import { useState } from "react";
import type { Movie } from "../types";

interface MovieCardProps {
  movie: Movie;
}

const MovieCard = ({ movie }: MovieCardProps) => {
  const hasPoster = movie.Poster && movie.Poster !== "N/A";
  const [isLiked, setIsLiked] = useState(false);

  return (
    <div className="movie-card">
      <div className="poster-frame">
        {hasPoster ? (
          <img src={movie.Poster} alt={movie.Title} />
        ) : (
          <div className="poster-fallback">
            <span>{movie.Title}</span>
          </div>
        )}
      </div>

      <div className="movie-info">
        <div>
          <p className="movie-meta">
            {movie.imdbRating && movie.imdbRating !== "N/A"
              ? `${movie.imdbRating} IMDb`
              : movie.Year}
          </p>
          <h3>{movie.Title}</h3>
        </div>
        <span>{movie.Type}</span>
      </div>

      <button
        className={`like-button${isLiked ? " liked" : ""}`}
        type="button"
        aria-label={isLiked ? `Unlike ${movie.Title}` : `Like ${movie.Title}`}
        aria-pressed={isLiked}
        onClick={() => setIsLiked((liked) => !liked)}
      >
        <span aria-hidden="true">{isLiked ? "♥" : "♡"}</span>
        <span>{isLiked ? "Liked" : "Like"}</span>
      </button>
    </div>
  );
};

export default MovieCard;
