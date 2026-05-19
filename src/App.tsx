import { useState } from "react";
import "./App.css";

import SearchBar from "./components/SearchBar";
import MovieCard from "./components/MovieCard";

import type { Movie, ApiResponse } from "./types";

const API_KEY = "6caa9e57";

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchMovies = async () => {
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `https://www.omdbapi.com/?apikey=${API_KEY}&s=${searchTerm}`
      );

      const data: ApiResponse = await response.json();

      if (data.Response === "True" && data.Search) {
        setMovies(data.Search);
      } else {
        setMovies([]);
        setError(data.Error || "Movies not found");
      }
    } catch (err) {
      setError("Failed to fetch movies");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>Movie Search App</h1>

      <SearchBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSearch={fetchMovies}
      />

      {loading && <h2>Loading...</h2>}

      {error && <h2 className="error">{error}</h2>}

      <div className="movies-grid">
        {movies.map((movie) => (
          <MovieCard key={movie.imdbID} movie={movie} />
        ))}
      </div>
    </div>
  );
}

export default App;