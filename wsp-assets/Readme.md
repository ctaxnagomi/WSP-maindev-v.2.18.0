![Project Diagram](Website%20Seni%20Pujangga%20Diagram.png)

Project Overview
This is a responsive movie and TV streaming website built with HTML, CSS, and JavaScript. The architecture is static, with all logic handled client-side. The site features a multi-page layout, including movie and TV show players, a pricing page, and an "other" page for FAQs and policies.

Key Files & Structure

main.html: Main landing page, includes popup search for movies/TV shows.
splayer-movie.html, splayer-tvshow.html: Player pages for movies and TV shows, embed external video via iframe.
pricing.html, other.html: Static info pages.
css: Contains style.css and movie.css for layout and theming.
script.js: Main client-side logic, including carousel, popup search, TMDB API integration, and event tracking for embedded players.
navbar.js: Handles navigation bar interactions.
Popup Search & Navigation

The popup search UI is triggered by "Movies" and "TV Shows" buttons.
Search uses TMDB API (search/movie or search/tv) and displays results in a popup.
On selection, users are redirected to the appropriate player page with query parameters (movieId, tvId, season, episode).
Player Embeds & Event Tracking

Movie and TV show players use vidnest.fun iframe endpoints.
Player events (play, pause, seeked, ended, timeupdate) are sent via window.postMessage from the iframe.
script.js listens for these events and saves progress to localStorage under the key vidFastProgress.
Example event data and storage structure are documented in the codebase.
Patterns & Conventions

All JavaScript logic is centralized in script.js (except navbar).
Use 16:9 aspect ratio containers for embedded iframes.
External dependencies: FontAwesome, Google Fonts, Bootstrap Icons (see README for CDN links).
No build step; all files are static and can be served directly.
No backend or server-side code; all data flows are client-side and via third-party APIs.
Customization & Extension

To add new pages, follow the structure of existing HTML files.
To add new TMDB API features, extend script.js.
For new player integrations, update the iframe src and event listeners as needed.
Example: Adding a New Movie Player

Add a button or link that calls openPopup('movie').
On selection, redirect to splayer-movie.html?movieId=....
In splayer-movie.html, read the query parameter and embed the correct iframe.

This project are free to use for commercial purposes except for the api. 
Developer: Wan Mohd Azizi bin Wan Hosen
## Release Notes

### Version 2.1.0
- **Enhanced Navigation Menu**: Improved CSS for better readability, maintainability, and performance. Added custom properties, transitions, and accessibility features.
- **Background Video**: Added looping video background to index.html with smooth playback and preloading.
- **UI Updates**: Replaced camera icon with TV icon in navigation menu.
- **Code Optimizations**: Refactored CSS with variables, comments, and responsive design. Fixed HTML link tags and added video attributes for better user experience.
