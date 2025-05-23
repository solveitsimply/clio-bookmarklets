# Clio Manage Automation Bookmarklets

<!-- BOOKMARKLET LIST START -->
- **Run Conflict Check**: This bookmarklet automates conflict checks in Clio Manage by accepting a list of search terms,
- **Copy Clio Drive Folder Path**: Copies the local file path (as it would appear in Clio Drive) for the currently viewed document folder in Clio Manage to your clipboard.
<!-- BOOKMARKLET LIST END -->

> **Looking to use the bookmarklets?**  
> 👉 [Click here for the user instructions and bookmarklet links](docs/index.html)

---

This repository contains developer resources for creating and maintaining bookmarklets that automate and streamline tasks within [Clio Manage](https://app.clio.com).

## Developer Setup

1. **Install Node.js**  
   Download and install from [nodejs.org](https://nodejs.org/).

2. **Install dependencies**  
   ```sh
   npm install
   ```

3. **Minify bookmarklets & update documentation**  
   Run the following command to minify all bookmarklets and update the user documentation:
   ```sh
   node minify-bookmarklets.js
   ```
   - Minified files are output to `bookmarklets/min/`
   - `docs/index.html` is automatically updated with the latest bookmarklet list and code

## Adding or Editing Bookmarklets

- Place new bookmarklet scripts in the `bookmarklets/` directory.
- Each script should be self-contained and include comments at the top describing its purpose and usage.
- After editing or adding a bookmarklet, run `node minify-bookmarklets.js` to regenerate minified files and update the documentation.

## Project Structure

- `bookmarklets/` — Source JavaScript files for each bookmarklet
- `bookmarklets/min/` — Minified versions, ready for use as bookmarklets
- `docs/index.html` — End-user instructions and bookmarklet links (auto-generated)
- `minify-bookmarklets.js` — Script to minify bookmarklets and update documentation

## License

MIT License
