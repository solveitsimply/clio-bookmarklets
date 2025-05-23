# Clio Manage Automation Bookmarklets

<!-- BOOKMARKLET LIST START -->
- **Run Conflict Check**: This bookmarklet automates conflict checks in Clio Manage by accepting a list of search terms,
- **Copy Clio Drive Folder Path**: Copies the local file path (as it would appear in Clio Drive) for the currently viewed document folder in Clio Manage to your clipboard.
<!-- BOOKMARKLET LIST END -->

## Loader Pattern for Large Bookmarklets

For bookmarklets that are too large or use modern JavaScript (async/await, generators, etc.), use the loader pattern:

- **Host the minified JS file** in the `docs/remote/` directory (published at `https://solveitsimply.github.io/clio-bookmarklets/remote/{bookmarklet-name}.js`).
- **Bookmarklet code:** Use a tiny loader that injects the remote script at runtime.

**Example loader bookmarklet:**
```javascript
javascript:(function(){
  var s=document.createElement('script');
  s.src='https://solveitsimply.github.io/clio-bookmarklets/remote/conflict-check.js?'+Date.now();
  document.body.appendChild(s);
})();
```
- Replace `conflict-check.js` with your bookmarklet's filename.
- The `?'+Date.now()` ensures the latest version is always loaded (cache-busting).

**How to add a new large bookmarklet:**
1. Minify and transpile your bookmarklet code as usual.
2. Place the minified file in `docs/remote/{bookmarklet-name}.js`.
3. Add a loader-style bookmarklet to `docs/index.html` and/or this README, using the pattern above.
4. Document the bookmarklet's purpose and usage.

**Why use this pattern?**
- Bypasses browser bookmarklet size limits.
- Allows use of modern JavaScript.
- Keeps the bookmarklet link short and reliable.

**Best practices:**
- Keep remote bookmarklet filenames unique and descriptive.
- Always test the loader bookmarklet after publishing a new remote script.
- Avoid dependencies on external modules that aren't bundled into the remote JS file.


> **Looking to use the bookmarklets?**  
> 👉 [Click here for the user instructions and bookmarklet links](https://solveitsimply.github.io/clio-bookmarklets/)

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
