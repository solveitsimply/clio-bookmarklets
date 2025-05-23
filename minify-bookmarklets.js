// Minify all bookmarklets in /bookmarklets/ and output to /bookmarklets/min/ with 'javascript:' prefix
// Also automatically updates docs/index.html and README.md with the latest bookmarklet list and code
//
// Usage: Run with `node minify-bookmarklets.js`
// Requires: npm install terser
//
// Each minified file will be named the same as the original, in /bookmarklets/min/,
// and will start with the 'javascript:' prefix for easy copy-paste as a bookmarklet.

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const SRC_DIR = path.join(__dirname, 'bookmarklets');
const OUT_DIR = path.join(SRC_DIR, 'min');
const DOCS_FILE = path.join(__dirname, 'docs', 'index.html');
const README_FILE = path.join(__dirname, 'README.md');

// Extract description and name from a source bookmarklet file
function extractBookmarkletInfo(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let name = '';
  let description = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') && !name) {
      name = line.replace(/^\/\/\s*/, '').replace(/\s*Bookmarklet$/i, '').trim();
      if (name.startsWith('==') && name.endsWith('==')) {
        name = name.slice(2, -2).trim();
      }
    } else if (line.startsWith('//') && name && !description) {
      const descLine = line.replace(/^\/\/\s*/, '').trim();
      if (descLine && !descLine.toLowerCase().includes('usage:') && !descLine.toLowerCase().includes('author:') && !descLine.toLowerCase().includes('date:')) {
        description = descLine;
      }
    } else if (line && !line.startsWith('//')) {
      break;
    }
  }
  if (!name) {
    name = path.basename(filePath, '.js')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return { name, description };
}

// Update the README.md file with a Markdown list of bookmarklets
function updateReadmeBookmarkletList(bookmarklets) {
  if (!fs.existsSync(README_FILE)) return;
  let readme = fs.readFileSync(README_FILE, 'utf8');
  const startMarker = '<!-- BOOKMARKLET LIST START -->';
  const endMarker = '<!-- BOOKMARKLET LIST END -->';
  const list = bookmarklets.map(b =>
    `- **${b.name}**: ${b.description}`
  ).join('\n');
  const newSection = `${startMarker}\n${list}\n${endMarker}`;
  const regex = new RegExp(
    `${startMarker}[\\s\\S]*?${endMarker}`,
    'm'
  );
  if (regex.test(readme)) {
    readme = readme.replace(regex, newSection);
  } else {
    readme = `${newSection}\n\n${readme}`;
  }
  fs.writeFileSync(README_FILE, readme, 'utf8');
  console.log('Updated README.md with bookmarklet list');
}

// Update the docs/index.html file with current bookmarklets
function updateDocsHTML(bookmarklets) {
  if (!fs.existsSync(DOCS_FILE)) return;
  let html = fs.readFileSync(DOCS_FILE, 'utf8');
  // Generate drag links for Method A
  const dragLinks = bookmarklets.map(b =>
    `        <a href='${b.minifiedCode.replace(/'/g, "'")}' class="drag-link">${b.name}</a>`
  ).join('\n\n');
  // Generate code blocks for Method B
  const codeBlocks = bookmarklets.map(b => `
        <h4>${b.name}</h4>
        <div class="code-block">${b.minifiedCode.replace(/</g, '<').replace(/>/g, '>')}</div>`
  ).join('\n');
  // Generate description list
  const descriptions = bookmarklets.map(b =>
    `            <li><strong>${b.name}:</strong> ${b.description}</li>`
  ).join('\n');
  // Replace the drag links section (Method A)
  html = html.replace(
    /(<!-- Method A drag links start -->|<p>Click and hold one of these links:<\/p>\s*)([\s\S]*?)(\s*<p><strong>Instructions:<\/strong><\/p>)/,
    `$1\n        \n${dragLinks}\n\n        $3`
  );
  // Replace the code blocks section (Method B)
  html = html.replace(
    /(<!-- Method B code blocks start -->|<p>Copy the code you need below:<\/p>)([\s\S]*?)(\s*<p><strong>Instructions:<\/strong><\/p>)/,
    `$1\n${codeBlocks}\n\n        $3`
  );
  // Replace the descriptions section
  html = html.replace(
    /(<!-- Bookmarklet descriptions start -->|<h3>💡 What Each Bookmarklet Does<\/h3>\s*<ul>)([\s\S]*?)(\s*<\/ul>)/,
    `$1\n${descriptions}\n        $3`
  );
  fs.writeFileSync(DOCS_FILE, html, 'utf8');
  console.log('Updated docs/index.html with latest bookmarklets');
}

async function minifyBookmarklets() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.js'));
  const bookmarklets = [];
  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file);
    const outPath = path.join(OUT_DIR, file);
    const code = fs.readFileSync(srcPath, 'utf8');
    const info = extractBookmarkletInfo(srcPath);
    try {
      const result = await minify(code, {
        ecma: 2015,
        compress: true,
        mangle: true,
        output: {
          comments: false,
          quote_style: 3
        }
      });
      let minifiedCode = result.code;
      minifiedCode = minifiedCode.replace(/'/g, '`');
      const bookmarklet = 'javascript:' + minifiedCode;
      fs.writeFileSync(outPath, bookmarklet, 'utf8');
      console.log(`Minified ${file} -> min/${file}`);
      bookmarklets.push({
        name: info.name,
        description: info.description || 'No description available.',
        filename: file,
        minifiedCode: bookmarklet
      });
    } catch (err) {
      console.error(`Failed to minify ${file}:`, err);
    }
  }
  if (bookmarklets.length > 0) {
    updateDocsHTML(bookmarklets);
    updateReadmeBookmarkletList(bookmarklets);
  }
}

minifyBookmarklets();
