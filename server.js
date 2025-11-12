import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static("public"));

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Fetch multiple movies matching search
async function fetchMovieMatches(query) {
  const res = await fetch(
    `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${OMDB_API_KEY}`
  );
  const data = await res.json();
  if (data.Response === "False") return [];
  return data.Search; // array of basic movies
}

// Fetch full movie details by imdbID
async function fetchMovieDetails(imdbID) {
  const res = await fetch(
    `http://www.omdbapi.com/?i=${imdbID}&apikey=${OMDB_API_KEY}`
  );
  const data = await res.json();
  if (data.Response === "False") return null;
  return {
    title: data.Title,
    year: data.Year,
    plot: data.Plot,
    poster: data.Poster,
    actors: data.Actors,
    genre: data.Genre
  };
}

// Fetch similar movies from Gemini AI
async function fetchSimilarMovies(title) {
  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Suggest 5 movies similar to "${title}".
Output JSON array only, fields:
[
  {"title": "Movie Name", "description": "One-line summary"}
]`
            }
          ]
        }
      ]
    })
  });
  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  let movies;
  try {
    movies = JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\[.*\]/s);
    movies = match ? JSON.parse(match[0]) : [];
  }
  return movies;
}

// API route
app.post("/api/recommend", async (req, res) => {
  const { query, imdbID } = req.body;
  if (!query) return res.status(400).json({ error: "Missing query" });

  try {
    if (imdbID) {
      // Fetch full movie details for a specific ID
      const movie = await fetchMovieDetails(imdbID);
      const similar = movie ? await fetchSimilarMovies(movie.title) : [];
      return res.json({ movie, similar });
    }

    // Fetch all matches for search query
    const matches = await fetchMovieMatches(query);
    if (matches.length === 1) {
      // Only one match → fetch full details + similar movies
      const movie = await fetchMovieDetails(matches[0].imdbID);
      const similar = movie ? await fetchSimilarMovies(movie.title) : [];
      return res.json({ movie, similar });
    }

    // Multiple matches → return list for selection
    return res.json({ matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
