// Profile and Watchlist Module
// Handles profile selection, watchlist management, and genre filtering

let currentUser = null;

// Profile Selection
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

// Watchlist Functions
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
    // Remove from watchlist
    watchlist.splice(index, 1);
    btn.classList.remove('active');
  } else {
    // Add to watchlist
    watchlist.push(movieId);
    btn.classList.add('active');
  }

  localStorage.setItem(watchlistKey, JSON.stringify(watchlist));
}

function loadWatchlist() {
  if (!currentUser) return;

  const watchlistKey = `watchlist_${currentUser}`;
  const watchlist = JSON.parse(localStorage.getItem(watchlistKey)) || [];

  // Update all watchlist buttons
  document.querySelectorAll('.watchlist-btn').forEach(btn => {
    const movieId = btn.closest('.card').dataset.movieId;
    if (watchlist.includes(movieId)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Genre Filtering
function filterByGenre(genre) {
  const cards = document.querySelectorAll('.top-movie .card');
  const buttons = document.querySelectorAll('.top-movie .buttons button');

  // Update active button
  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  // Filter cards
  cards.forEach(card => {
    if (genre === 'all' || card.dataset.genre === genre) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // Show profile modal if no profile selected
  const selectedProfile = localStorage.getItem("selectedProfile");
  if (!selectedProfile) {
    document.getElementById("profileModal").style.display = "flex";
  } else {
    currentUser = selectedProfile;
    loadWatchlist();
  }

  // Set default active genre button
  const defaultBtn = document.querySelector('.top-movie .buttons button');
  if (defaultBtn) defaultBtn.classList.add('active');
});