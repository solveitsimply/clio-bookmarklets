// Minify all bookmarklets in /bookmarklets/ and output to /bookmarklets/min/ with 'javascript:' prefix
//
// Usage: Run with `node minify-bookmarklets.js`
// Requires: npm install terser
//
// Each minified file will be named the same as the original, in /bookmarklets/min/,
// and will start with the 'javascript:' prefix for easy copy-paste as a bookmarklet.
// After minification, the README.md will be updated with drag-and-drop links for each bookmarklet.

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const SRC_DIR = path.join(__dirname, 'bookmarklets');
const OUT_DIR = path.join(SRC_DIR, 'min');
const README_PATH = path.join(__dirname, 'README.md');
const START_MARKER = '<!-- BEGIN AUTO-GENERATED BOOKMARKLETS -->';
const END_MARKER = '<!-- END AUTO-GENERATED BOOKMARKLETS -->';

// Helper to get a human-friendly name from filename
function toTitleCase(str) {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\.js$/, '')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Update README.md with bookmarklet links
function updateReadmeWithBookmarklets() {
  // Scan minified bookmarklets
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.js'));
  const links = files.map(file => {
    const code = fs.readFileSync(path.join(OUT_DIR, file), 'utf8');
    // URL-encode for markdown safety (but keep 'javascript:' prefix)
    const safeCode = code.replace(/\)/g, '%29').replace(/\]/g, '%5D');
    const name = toTitleCase(file);
    return `- [${name}](${safeCode})`;
  });

  const instructions = `
**Drag-and-Drop Bookmarklets**

Below are ready-to-use bookmarklet links. Drag any link to your browser's bookmarks/favorites bar.

> **Note:** Due to GitHub's security restrictions, these links may not be draggable or clickable as bookmarklets directly from the GitHub web UI.  
> To use drag-and-drop, open this README locally in a markdown viewer that allows \`javascript:\` links, or use the provided code to create bookmarks manually.

${links.join('\n')}
`;

  // Insert or replace the section in README.md
  let readme = fs.readFileSync(README_PATH, 'utf8');
  const section = `${START_MARKER}\n${instructions}\n${END_MARKER}`;
  if (readme.includes(START_MARKER) && readme.includes(END_MARKER)) {
    // Replace existing section
    readme = readme.replace(
      new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`),
      section
    );
  } else {
    // Insert after "## Available Bookmarklets" or at end
    const anchor = '## Available Bookmarklets';
    if (readme.includes(anchor)) {
      readme = readme.replace(
        anchor,
        `${anchor}\n\n${section}\n`
      );
    } else {
      readme += `\n${section}\n`;
    }
  }
  fs.writeFileSync(README_PATH, readme, 'utf8');
  console.log('README.md updated with bookmarklet links.');
}

async function minifyBookmarklets() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file);
    const outPath = path.join(OUT_DIR, file);

    const code = fs.readFileSync(srcPath, 'utf8');
    try {
      const result = await minify(code, {
        ecma: 2015,
        compress: true,
        mangle: true,
        output: { comments: false }
      });
      const bookmarklet = 'javascript:' + result.code;
      fs.writeFileSync(outPath, bookmarklet, 'utf8');
      console.log(`Minified ${file} -> min/${file}`);
    } catch (err) {
      console.error(`Failed to minify ${file}:`, err);
    }
  }

  // Update README with bookmarklet links
  updateReadmeWithBookmarklets();
}

minifyBookmarklets();
