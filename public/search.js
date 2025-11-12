const OMDB_API_KEY = "87baf12a"; // replace with your key

async function getMovies(query, imdbID=null) {
  const movieInfoDiv = document.getElementById("movie-info");
  const similarDiv = document.getElementById("similar");
  const matchesDiv = document.getElementById("matches");

  movieInfoDiv.innerHTML = "";
  similarDiv.innerHTML = "";
  matchesDiv.innerHTML = "⏳ Loading...";
  document.getElementById("queryTitle").textContent = `Results for "${query}"`;

  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, imdbID })
    });
    const data = await res.json();

    // Multiple matches
    if (data.matches && data.matches.length > 1 && !imdbID) {
      const html = data.matches.map(m => `
        <div class="movie-card" onclick="getMovies('${m.Title}', '${m.imdbID}')">
          <img src="${m.Poster !== 'N/A' ? m.Poster : 'placeholder.jpg'}" />
          <h4>${m.Title} (${m.Year})</h4>
        </div>
      `).join("");
      matchesDiv.innerHTML = html;
      return;
    }

    // Single movie details
    const m = data.movie;
    if (!m) {
      movieInfoDiv.innerHTML = "❌ Movie not found.";
      matchesDiv.innerHTML = "";
      return;
    }

    matchesDiv.innerHTML = ""; // clear matches

    // Show main movie info
    movieInfoDiv.innerHTML = `
      <div class="movie-card" style="cursor:default;">
        <img src="${m.poster !== 'N/A' ? m.poster : 'placeholder.jpg'}" />
        <h3>${m.title} (${m.year})</h3>
        <p><strong>Actors:</strong> ${m.actors}</p>
        <p><strong>Genre:</strong> ${m.genre}</p>
        <p>${m.plot}</p>
      </div>
    `;

    // Show similar movies with posters
    if (data.similar && data.similar.length > 0) {
      const similarHtmlPromises = data.similar.map(async movie => {
        const poster = await fetchMoviePoster(movie.title);
        return `
          <div class="movie-card" onclick="getMovies('${movie.title}')">
            <img src="${poster}" />
            <h4>${movie.title}</h4>
            <p>${movie.description}</p>
          </div>
        `;
      });
      const similarHtml = await Promise.all(similarHtmlPromises);
      similarDiv.innerHTML = similarHtml.join("");
    }

  } catch (err) {
    console.error(err);
    movieInfoDiv.innerHTML = "❌ Error loading movies.";
  }
}

// Fetch poster from OMDb by title
async function fetchMoviePoster(title) {
  try {
    const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}`);
    const data = await res.json();
    if (data.Response === "False" || !data.Poster || data.Poster === "N/A") {
      return "placeholder.jpg";
    }
    return data.Poster;
  } catch {
    return "placeholder.jpg";
  }
}

// Go back to home
function goHome() {
  window.location.href = "index.html";
}

// On first load
const params = new URLSearchParams(window.location.search);
const query = params.get("q");
if (query) getMovies(query);

// Handle back/forward navigation
window.onpopstate = () => {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");
  if (query) getMovies(query);
};