# Clio Manage Automation Bookmarklets

This project contains a collection of bookmarklets designed to automate and streamline tasks within [Clio Manage](https://app.clio.com).

## Usage

Each bookmarklet is a small JavaScript snippet you can add to your browser's bookmarks bar. When clicked, the bookmarklet will execute automation tasks directly within the Clio Manage web app.

**To use a bookmarklet:**
1. Open the corresponding minified file in `bookmarklets/min/` (e.g., `bookmarklets/min/get-clio-folder-path.js`).
2. Copy the entire code from the minified file.
3. Create a new bookmark in your browser.
4. Paste the code into the URL/location field (the code already includes the `javascript:` prefix).

## Generating Minified Bookmarklets

If you make changes to any bookmarklet JavaScript files in `bookmarklets/`, you must regenerate the minified versions before using or sharing them:

1. Make sure you have [Node.js](https://nodejs.org/) installed.
2. Install the minifier dependency (if you haven't already):  
   `npm install terser`
3. Run the minification script:  
   `node minify-bookmarklets.js`
4. The updated minified files will be output to `bookmarklets/min/`.

## Available Bookmarklets

- **Get Clio Folder Path**: Copies the local file path (as it would appear in Clio Drive) for the currently viewed document folder in Clio Manage to your clipboard. [Minified code: `bookmarklets/min/get-clio-folder-path.js`]
- **Conflict Check**: Prompts for a list of search terms, performs a conflict check for each term across all categories, collects all results (with pagination), and generates a detailed HTML report with clickable links to each record. The report includes the account name, search terms, result counts, and is suitable for large-scale conflict checks. [Minified code: `bookmarklets/min/conflict-check.js`]

## Adding New Bookmarklets

- Place new bookmarklet scripts in the `bookmarklets/` directory.
- Each script should be self-contained and include comments describing its purpose and usage.

## License

MIT License
