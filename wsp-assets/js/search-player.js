// Search and Player Module
// Handles TMDB search, video playback, metadata fetching, and resume functionality

let apiKey = "b9571479231e6a103f8f10a0b2525d63"; // Replace with your TMDB API key; for production, proxy requests through a backend
let searchType = "movie";
let selectedTvId = null;
let currentUser = null;

// DOM Elements
const popupOverlay = document.getElementById("popupOverlay");
const popup = document.getElementById("popup");
const searchBox = document.getElementById("searchBox");
const results = document.getElementById("results");
const videoContainer = document.getElementById("videoContainer");
const videoLoading = document.getElementById("videoLoading");
const videoFrame = document.getElementById("videoFrame");
const detailsModal = document.getElementById("detailsModal");

// Open search popup
function openPopup(type) {
  searchType = type;
  document.getElementById("popupTitle").innerText = 
    (type === "movie") ? "Search Movies" : "Search TV Shows";
  popup.style.display = "block";
  popupOverlay.style.display = "block";
  results.innerHTML = "";
  searchBox.value = "";
  searchBox.focus();
  const optionsDiv = document.getElementById("seasonEpisodeOptions");
  if (optionsDiv) {
    optionsDiv.style.display = "none";
  }
}

// Close search popup
function closePopup() {
  popup.style.display = "none";
  popupOverlay.style.display = "none";
  const optionsDiv = document.getElementById("seasonEpisodeOptions");
  if (optionsDiv) {
    optionsDiv.style.display = "none";
  }
}

// Search TMDB API
async function searchTMDB() {
  let query = searchBox.value;
  if (query.length < 2) return;

  let url = `https://api.themoviedb.org/3/search/${searchType}?api_key=${apiKey}&query=${encodeURIComponent(query)}`; // In production, replace with proxied endpoint
  try {
    let response = await fetch(url);
    let data = await response.json();

    results.innerHTML = "";

    data.results.forEach(item => {
      let title = (searchType === "movie") ? item.title : item.name;
      let release = (item.release_date || item.first_air_date || "").split("-")[0];
      let id = item.id;

      let div = document.createElement("div");
      div.innerHTML = `${title} (${release || "N/A"})`;
      div.onclick = () => selectItem(id);
      results.appendChild(div);
    });
  } catch (error) {
    console.error("Search error:", error);
    results.innerHTML = "<div>Error searching. Please try again.</div>";
  }
}

// Select item from search results
function selectItem(id) {
  if (searchType === "movie") {
    closePopup();
    const url = `https://vidnest.fun/movie/${id}`;
    showVideo(url, id, 'movie');
  } else {
    // Show season/episode options for TV
    selectedTvId = id;
    let optionsDiv = document.getElementById("seasonEpisodeOptions");
    if (!optionsDiv) {
      optionsDiv = document.createElement("div");
      optionsDiv.id = "seasonEpisodeOptions";
      optionsDiv.style.marginTop = "10px";
      optionsDiv.innerHTML = `
        <label>Season: <input type="number" id="seasonInput" min="1" value="1" style="width:60px;"></label>
        <label>Episode: <input type="number" id="episodeInput" min="1" value="1" style="width:60px;"></label>
        <button onclick="confirmSeasonEpisode()" class="button1 button2" style="background:#2196F3;">Go</button>
      `;
      popup.appendChild(optionsDiv);
    }
    optionsDiv.style.display = "block";
  }
}

// Confirm TV episode
function confirmSeasonEpisode() {
  const season = document.getElementById("seasonInput").value;
  const episode = document.getElementById("episodeInput").value;
  closePopup();
  const url = `https://vidnest.fun/tv/${selectedTvId}/${season}/${episode}`;
  showVideo(url, `${selectedTvId}_S${season}E${episode}`, 'tv');
}

// Show video with metadata
function showVideo(url, mediaId, mediaType = 'movie') {
  window.currentMediaId = mediaId;
  window.currentMediaType = mediaType;
  videoLoading.style.display = "flex";
  videoFrame.src = url;
  videoContainer.style.display = "block";
  fetchMetadata(mediaId, mediaType);
}

// Close video
function closeVideo() {
  videoFrame.src = "";
  videoContainer.style.display = "none";
  detailsModal.style.display = "none";
}

// Fetch metadata from TMDB
async function fetchMetadata(id, type = 'movie') {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const url = `https://api.themoviedb.org/3/${endpoint}/${id}?api_key=${apiKey}&language=en-US`;
    const response = await fetch(url);
    const data = await response.json();

    if (data) {
      document.getElementById('detailsTitle').textContent = data.title || data.name;
      document.getElementById('detailsOverview').textContent = data.overview || 'No description available.';
      document.getElementById('detailsRelease').textContent = data.release_date || data.first_air_date || 'N/A';
      document.getElementById('detailsGenre').textContent = data.genres ? data.genres.map(g => g.name).join(', ') : 'N/A';
      document.getElementById('detailsRuntime').textContent = type === 'movie' ? `${data.runtime} minutes` : 'N/A';

      // Poster
      if (data.poster_path) {
        document.getElementById('detailsPoster').src = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
        document.getElementById('detailsPoster').style.display = 'block';
      } else {
        document.getElementById('detailsPoster').style.display = 'none';
      }

      // Check for resume info
      const progressKey = `progress_${type}_${id}`;
      const progress = JSON.parse(localStorage.getItem(progressKey));
      if (progress && progress.currentTime > 0) {
        const resumeInfo = document.getElementById('resumeInfo');
        resumeInfo.style.display = 'block';
        document.getElementById('resumeTime').textContent = formatTime(progress.currentTime);
        window.currentProgress = progress; // Store for resume/restart
      }

      detailsModal.style.display = 'flex';
    }
  } catch (error) {
    console.error('Error fetching metadata:', error);
    // Fallback: Show basic info or error modal
  }
}

// Close details modal
function closeDetails() {
  detailsModal.style.display = 'none';
}

// Resume playback
function resumePlayback() {
  if (window.currentProgress && window.currentProgress.currentTime) {
    const iframe = videoFrame;
    iframe.contentWindow.postMessage({
      type: 'SEEK_TO',
      time: window.currentProgress.currentTime
    }, 'https://vidnest.fun');
    closeDetails();
    console.log('Resume attempted at', window.currentProgress.currentTime, 'seconds');
  }
}

// Restart playback
function restartPlayback() {
  const iframe = videoFrame;
  iframe.contentWindow.postMessage({
    type: 'SEEK_TO',
    time: 0
  }, 'https://vidnest.fun');
  closeDetails();
}

// Format time
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Attempt auto-resume on load
function attemptResumePlayback() {
  const progressKey = `progress_${window.currentMediaType || 'movie'}_${window.currentMediaId}`;
  const progress = JSON.parse(localStorage.getItem(progressKey));
  if (progress && progress.currentTime > 30) { // Resume if >30s watched
    const iframe = videoFrame;
    setTimeout(() => {
      iframe.contentWindow.postMessage({
        type: 'SEEK_TO',
        time: progress.currentTime
      }, 'https://vidnest.fun');
    }, 2000); // Delay for player readiness
    console.log('Auto-resume attempted');
  }
}

// Search and play movie (card click)
async function searchAndPlayMovie(movieTitle) {
  try {
    videoLoading.style.display = "flex";
    videoContainer.style.display = "block";

    const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(movieTitle)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const movie = data.results[0];
      const movieId = movie.id;
      const videoUrl = `https://vidnest.fun/movie/${movieId}`;
      showVideo(videoUrl, movieId, 'movie');
      videoLoading.style.display = "none";
    } else {
      videoLoading.innerHTML = '<span>Movie not found</span>';
      setTimeout(() => {
        closeVideo();
      }, 2000);
    }
  } catch (error) {
    console.error("Error searching for movie:", error);
    videoLoading.innerHTML = '<span>Error loading movie</span>';
    setTimeout(() => {
      closeVideo();
    }, 2000);
  }
}

// Profile and Watchlist Functions (existing, modularized)
function selectProfile(profileName) {
  currentUser = profileName;
  document.getElementById("profileModal").style.display = "none";
  localStorage.setItem("selectedProfile", profileName);
  loadWatchlist();
  console.log("Selected profile:", profileName);
}

function addProfile() {
  alert("Add profile functionality would be implemented here");
}

function toggleWatchlist(movieId) {
  if (!currentUser) {
    alert("Please select a profile first");
    document.getElementById("profileModal").style.display = "flex";
    return;
  }

  const watchlistKey = `watchlist_${currentUser}`;
  let watchlist = JSON.parse(localStorage.getItem(watchlistKey)) || [];

  const index = watchlist.indexOf(movieId);
  const btn = event.target.closest('.watchlist-btn');

  if (index > -1) {
    watchlist.splice(index, 1);
    btn.classList.remove('active');
  } else {
    watchlist.push(movieId);
    btn.classList.add('active');
  }

  localStorage.setItem(watchlistKey, JSON.stringify(watchlist));
}

function loadWatchlist() {
  if (!currentUser) return;

  const watchlistKey = `watchlist_${currentUser}`;
  const watchlist = JSON.parse(localStorage.getItem(watchlistKey)) || [];

  document.querySelectorAll('.watchlist-btn').forEach(btn => {
    const movieId = btn.closest('.card').dataset.movieId;
    if (watchlist.includes(movieId)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function filterByGenre(genre) {
  const cards = document.querySelectorAll('.top-movie .card');
  const buttons = document.querySelectorAll('.top-movie .buttons button');

  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  cards.forEach(card => {
    if (genre === 'all' || card.dataset.genre === genre) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// Event Listeners for Player Messages (save progress)
window.addEventListener('message', ({ origin, data }) => {
  if (origin !== 'https://vidnest.fun' || !data) return;

  if (data.type === 'PLAYER_EVENT') {
    const { event, currentTime, duration, season, episode } = data.data;
    console.log(`Player ${event} at ${currentTime}s of ${duration}s`);

    if (event === 'timeupdate' && currentTime > 0) {
      // Save progress every 30s or on key events
      const progressKey = `progress_${window.currentMediaType}_${window.currentMediaId}`;
      localStorage.setItem(progressKey, JSON.stringify({
        currentTime,
        duration,
        season,
        episode,
        lastUpdated: Date.now()
      }));
    }

    if (event === 'ended') {
      console.log(`Media ended. Clearing progress.`);
      const progressKey = `progress_${window.currentMediaType}_${window.currentMediaId}`;
      localStorage.removeItem(progressKey);
    }
  }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // Profile modal logic
  const selectedProfile = localStorage.getItem("selectedProfile");
  if (!selectedProfile) {
    document.getElementById("profileModal").style.display = "flex";
  } else {
    currentUser = selectedProfile;
    loadWatchlist();
  }

  // Default genre button
  const defaultBtn = document.querySelector('.top-movie .buttons button');
  if (defaultBtn) defaultBtn.classList.add('active');

  // Video frame load listener
  videoFrame.addEventListener("load", () => {
    videoLoading.style.display = "none";
    attemptResumePlayback();
  });
});