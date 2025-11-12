const OMDB_API_KEY = "87baf12a"; // replace with your OMDb key
const GEMINI_API_KEY = "AIzaSyDlGeAsrXsu2GCgw73Iy74m_0NktxzO6yk";  
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

document.getElementById("searchBtn").addEventListener("click", searchMovie);

function searchMovie() {
  const query = document.getElementById("searchBox").value.trim();
  if (!query) return alert("Enter movie name or genre!");
  saveSearch(query);
  window.location.href = `search.html?q=${encodeURIComponent(query)}`;
}

function saveSearch(query) {
  let searches = JSON.parse(localStorage.getItem("recentSearches")) || [];
  if (!searches.includes(query)) searches.unshift(query);
  if (searches.length > 5) searches.pop();
  localStorage.setItem("recentSearches", JSON.stringify(searches));
}

function loadRecent() {
  const recentList = document.getElementById("recentList");
  const searches = JSON.parse(localStorage.getItem("recentSearches")) || [];
  recentList.innerHTML = searches
    .map(q => `<button onclick="window.location.href='search.html?q=${encodeURIComponent(q)}'">${q}</button>`)
    .join("");
}

// Fetch poster from OMDb
async function fetchMoviePoster(title) {
  try {
    const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}`);
    const data = await res.json();
    return (data.Response === "False" || !data.Poster || data.Poster === "N/A") ? "placeholder.jpg" : data.Poster;
  } catch {
    return "placeholder.jpg";
  }
}

// Fetch similar movies from Gemini AI
async function fetchSimilarMovies(title) {
  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Suggest 5 movies similar to "${title}". Output JSON array only:
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
    try { movies = JSON.parse(rawText); } 
    catch { 
      const match = rawText.match(/\[.*\]/s);
      movies = match ? JSON.parse(match[0]) : [];
    }
    return movies;
  } catch {
    return [];
  }
}

// Load recommended movies
async function loadRecommended() {
  const recommendedList = document.getElementById("recommendedList");
  recommendedList.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading recommendations...</p>
    </div>
  `;

  const searches = JSON.parse(localStorage.getItem("recentSearches")) || [];
  if (!searches.length) {
    recommendedList.innerHTML = "<p>No recommendations yet. Search for some movies!</p>";
    return;
  }

  let allRecommended = [];

  for (const title of searches) {
    // Add original search movie
    allRecommended.push({ title });
    // Get extra 5 similar movies from Gemini
    const similar = await fetchSimilarMovies(title);
    allRecommended.push(...similar);
  }

  // Remove duplicates
  const uniqueRecommended = [];
  const seen = new Set();
  for (const movie of allRecommended) {
    if (!seen.has(movie.title)) {
      seen.add(movie.title);
      uniqueRecommended.push(movie);
    }
  }

  // Fetch posters for all movies
  const htmlPromises = uniqueRecommended.map(async movie => {
    const poster = await fetchMoviePoster(movie.title);
    const desc = movie.description || "";
    return `
      <div class="rec-card" onclick="window.location.href='search.html?q=${encodeURIComponent(movie.title)}'">
        <img src="${poster}" />
        <h4>${movie.title}</h4>
        <p>${desc}</p>
      </div>
    `;
  });

  const htmlArr = await Promise.all(htmlPromises);
  recommendedList.innerHTML = htmlArr.join("");
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadRecent();
  loadRecommended();
});