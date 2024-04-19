import { useEffect, useRef, useState } from "react";
import StarRating from "./StarRating.js";
import { useLocalStorage } from "./useLocalStorage.js";
import { useKey } from "./useKey.js";

const average = (arr) =>
  arr.reduce((acc, cur, _, arr) => acc + cur / arr.length, 0);

const KEY = "d39d3973";

export default function App() {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedID, setSelectedID] = useState(null);
  const [error, setError] = useState("");

  const [watched, setWatched] = useLocalStorage([], "watched");

  function handleSelectMovie(id) {
    setSelectedID((sid) => (id === sid ? null : id));
  }

  function handleCloseMovie() {
    setSelectedID(null);
  }

  function handleWatchedMovie(mv) {
    setWatched((wm) => [...wm, mv]);
  }

  function handleSetNewUserRating(nr, id) {
    setWatched((wm) =>
      wm.map((mv) => (mv.imdbID === id ? { ...mv, userRating: nr } : mv))
    );
  }

  function handleDeleteWatched(id) {
    setWatched((wm) => wm.filter((mv) => mv.imdbID !== id));
  }

  useEffect(
    function () {
      const controller = new AbortController();
      async function fetchMovies() {
        try {
          setIsLoading(true);
          setError("");
          const res = await fetch(
            `https://www.omdbapi.com/?apikey=${KEY}&s=${query}`,
            { signal: controller.signal }
          );
          if (!res.ok)
            throw new Error("Something went wrong while fetching movies!");
          const data = await res.json();
          if (data.Response === "False") throw new Error("Movie not Found");
          setMovies(data.Search);
          setError("");
        } catch (err) {
          if (err.name !== "AbortError") {
            setError(err.message);
          }
        } finally {
          setIsLoading(false);
        }
        if (query.length < 3) {
          setMovies([]);
          setError("");
          return;
        }
      }
      handleCloseMovie();
      fetchMovies();
      return function () {
        controller.abort();
      };
    },
    [query]
  );

  return (
    <>
      <NavBar>
        <Logo />
        <Search query={query} setQuery={setQuery} />
        <NumResults movies={movies} />
      </NavBar>
      <Main>
        <Box>
          {isLoading && <Loader />}
          {!isLoading && !error && (
            <MovieList
              movies={movies}
              onSelectMovie={handleSelectMovie}
              query={query}
            />
          )}
          {error && <ErrorMessage message={error} />}
        </Box>
        <Box>
          {selectedID ? (
            <MovieDetails
              selectedID={selectedID}
              onCloseMovie={handleCloseMovie}
              setError={setError}
              onAddWatchedMovie={handleWatchedMovie}
              onSetNewUserRating={handleSetNewUserRating}
              watched={watched}
            />
          ) : (
            <>
              <WatchedMovieSummary watched={watched} />
              <WatchedMovieList
                watched={watched}
                onDeleteWatched={handleDeleteWatched}
              />
            </>
          )}
        </Box>
      </Main>
    </>
  );
}

function ErrorMessage({ message }) {
  return (
    <p className="error">
      <span>⛔</span>
      {message}
    </p>
  );
}

function Loader() {
  return <p className="loader">LOADING...</p>;
}

function Search({ query, setQuery }) {
  const inputEL = useRef(null);
  useKey("enter", function () {
    if (document.activeElement === inputEL.current) return;
    inputEL.current.focus();
    setQuery("");
  });
  return (
    <input
      className="search"
      type="text"
      placeholder="Search movies..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      ref={inputEL}
    />
  );
}

function Logo() {
  return (
    <div className="logo">
      <img src="/logo.png" alt="logo" />
    </div>
  );
}

function NumResults({ movies }) {
  return (
    <p className="num-results">
      Found <strong>{movies.length}</strong> results
    </p>
  );
}

function NavBar({ children }) {
  return <nav className="nav-bar">{children}</nav>;
}

function Movie({ movie, onSelectMovie }) {
  return (
    <li onClick={() => onSelectMovie(movie.imdbID)}>
      <img src={movie.Poster} alt={`${movie.Title} poster`} />
      <h3>{movie.Title}</h3>
      <div>
        <p>
          <span>🗓</span>
          <span>{movie.Year}</span>
        </p>
      </div>
    </li>
  );
}

function MovieDetails({
  selectedID,
  onCloseMovie,
  setError,
  onAddWatchedMovie,
  onSetNewUserRating,
  watched,
}) {
  const [movie, setMovie] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [myRating, setMyRating] = useState("");

  const isWatched = watched.map((mv) => mv.imdbID).includes(selectedID);

  function addWatchedMovie() {
    const newMovie = {
      imdbID: selectedID,
      title: movie.Title,
      poster: movie.Poster,
      year: movie.Year,
      imdbRating: Number(movie.imdbRating),
      userRating: myRating,
      runtime: Number(movie.Runtime.split(" ")[0]),
    };
    onAddWatchedMovie(newMovie);
    onCloseMovie();
  }

  useEffect(
    function () {
      async function getMovieDetails() {
        try {
          setIsLoading(true);
          setError("");
          const res = await fetch(
            `https://www.omdbapi.com/?apikey=${KEY}&i=${selectedID}`
          );
          if (!res.ok)
            throw new Error(
              "Something went wrong while fetching movie details!"
            );
          const data = await res.json();
          setMovie(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      }
      getMovieDetails();
    },
    [selectedID, setError]
  );
  useEffect(
    function () {
      if (!isWatched) return;
      if (!myRating)
        setMyRating(watched.find((mv) => mv.imdbID === selectedID).userRating);
      onSetNewUserRating(myRating, selectedID);
    },
    [myRating, isWatched, onSetNewUserRating, selectedID, watched]
  );
  useEffect(
    function () {
      if (!movie.Title) return;
      document.title = `Movie | ${movie.Title}`;
      return function () {
        document.title = "MovieMania";
      };
    },
    [movie.Title]
  );

  useKey("Escape", onCloseMovie);

  return (
    <div className="details">
      {isLoading ? (
        <Loader />
      ) : (
        <>
          <header>
            <button className="btn-back" onClick={onCloseMovie}>
              &larr;
            </button>
            <img src={movie.Poster} alt={`Movie poster of ${movie.Title}`} />
            <div className="details-overview">
              <h2>{movie.Title}</h2>
              <p>
                {movie.Released} &bull; {movie.Runtime}
              </p>
              <p>{movie.Genre}</p>
              <p>
                <span>⭐</span>
                {movie.imdbRating} IMDB Rating
              </p>
            </div>
          </header>
          <section>
            <div className="rating">
              <StarRating
                maxRating={10}
                size={24}
                defaultRating={
                  isWatched
                    ? watched.find((mv) => mv.imdbID === selectedID).userRating
                    : 0
                }
                onSetRating={setMyRating}
              />
              {isWatched && (
                <p style={{ margin: "auto" }}>Already Watched! Rate again ?</p>
              )}
              {myRating && !isWatched && (
                <button className="btn-add" onClick={addWatchedMovie}>
                  +Add to List
                </button>
              )}
              {}
            </div>
            <p>
              <em>{movie.Plot}</em>
            </p>
            <p>{`Starring: ${movie.Actors}`}</p>
            <p>{`Directed by: ${movie.Director}`}</p>
          </section>
        </>
      )}
    </div>
  );
}

function MovieList({ movies, onSelectMovie, query }) {
  if (query === "")
    return (
      <div className="empty">
        <span>Start by searching</span>
        <span>a movie !</span>
      </div>
    );
  return (
    <ul className="list list-movies">
      {movies?.map((movie) => (
        <Movie movie={movie} key={movie.imdbID} onSelectMovie={onSelectMovie} />
      ))}
    </ul>
  );
}

function Box({ children }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="box">
      <button className="btn-toggle" onClick={() => setIsOpen((open) => !open)}>
        {isOpen ? "–" : "+"}
      </button>
      {isOpen && children}
    </div>
  );
}

function WatchedMovieSummary({ watched }) {
  const avgImdbRating = average(watched.map((movie) => movie.imdbRating));
  const avgUserRating = average(watched.map((movie) => movie.userRating));
  const avgRuntime = average(watched.map((movie) => movie.runtime));

  function handleRoundAverage(avgValue) {
    if (avgValue === 0) return 0;
    if (avgValue % 1 === 0) return avgValue;
    return avgValue.toFixed(2);
  }

  return (
    <div className="summary">
      <h2>Movies you watched</h2>
      <div>
        <p>
          <span>#️⃣</span>
          <span>{watched.length} movies</span>
        </p>
        <p>
          <span>⭐️</span>
          <span>{handleRoundAverage(avgImdbRating)}</span>
        </p>
        <p>
          <span>🌟</span>
          <span>{handleRoundAverage(avgUserRating)}</span>
        </p>
        <p>
          <span>⏳</span>
          <span>{handleRoundAverage(avgRuntime)} min</span>
        </p>
      </div>
    </div>
  );
}

function WatchedMovie({ movie, onDeleteWatched }) {
  return (
    <li>
      <img src={movie.poster} alt={`${movie.title} poster`} />
      <h3>{movie.title}</h3>
      <div>
        <p>
          <span>⭐️</span>
          <span>{movie.imdbRating}</span>
        </p>
        <p>
          <span>🌟</span>
          <span>{movie.userRating}</span>
        </p>
        <p>
          <span>⏳</span>
          <span>{movie.runtime} min</span>
        </p>
        <button
          className="btn-delete"
          onClick={() => onDeleteWatched(movie.imdbID)}
        >
          X
        </button>
      </div>
    </li>
  );
}

function WatchedMovieList({ watched, onDeleteWatched }) {
  if (watched.length === 0)
    return (
      <div className="empty">
        <span>No Movies</span>
        <span>Watched yet !</span>
      </div>
    );
  return (
    <ul className="list">
      {watched.map((movie) => (
        <WatchedMovie
          movie={movie}
          key={movie.imdbID}
          onDeleteWatched={onDeleteWatched}
        />
      ))}
    </ul>
  );
}

function Main({ children }) {
  return <main className="main">{children}</main>;
}
