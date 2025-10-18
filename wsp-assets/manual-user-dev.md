User-Dev Manual: Forking, Running, and Customizing
How to Fork and Run Locally
Fork the Repository
Click the "Fork" button on GitHub to create your own copy.
Clone Your Fork
Run: git clone https://github.com/<your-username>/<your-fork>.git
Open in VS Code or Your Editor
No build step required. All files are static HTML/CSS/JS.
Run Locally
Open main.html directly in your browser, or use a simple static server (e.g. npx serve . or Python's python -m http.server).
Customizing the Project
Change Branding/Logo: Replace images in the images folder and update text in main.html.
Add/Remove Pages: Duplicate or edit HTML files as needed. Update navigation links.
Edit Styles: Modify style.css and movie.css for layout and colors.
Update Popup Search Logic: Edit script.js to change TMDB API usage, popup behavior, or player integration.
Change Player Source: Update the iframe src in script.js or HTML files to use a different video provider if needed.
TMDB API Key
The project uses a demo TMDB API key. For production, get your own TMDB API key and replace it in script.js.
Event Tracking
Player events are tracked via window.postMessage and saved to localStorage. You can extend this logic in script.js to sync with your backend or analytics.
Troubleshooting
If the player or popup does not work, check browser console for errors and ensure all required elements (buttons, containers) exist in your HTML.
For CORS or API issues, verify your TMDB API key and network connection.
Contributing
Fork, clone, and create a new branch for your changes.
Submit pull requests with clear descriptions of your changes.