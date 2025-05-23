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
const babel = require('@babel/core');

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

/**
 * Update the docs/index.html file with current bookmarklets.
 * For large bookmarklets (marked with // @loader or minified > 1800 chars), use loader pattern.
 */
function updateDocsHTML(bookmarklets) {
  if (!fs.existsSync(DOCS_FILE)) return;
  let html = fs.readFileSync(DOCS_FILE, 'utf8');
  // Generate drag links for Method A
  const dragLinks = bookmarklets.map(b => {
    // Always URI-encode the JS code for the href attribute
    if (b.loader) {
      const remoteUrl = `https://solveitsimply.github.io/clio-bookmarklets/remote/${b.filename}`;
      const loaderCode = `(()=>{let u='${remoteUrl}?t='+Date.now();fetch(u).then(r=>r.text()).then(t=>{try{eval(t)}catch(e){let m=t.match(/<pre[^>]*>([\\s\\S]*?)<\\/pre>/i);if(m)eval(m[1]);else alert('Could not extract JS from HTML response.')}})})()`;
      return `<a href="javascript:${encodeURIComponent(loaderCode)}" class="drag-link">${b.name}</a>`;
    } else {
      const code = b.minifiedCode.startsWith('javascript:') ? b.minifiedCode.slice(11) : b.minifiedCode;
      return `<a href="javascript:${encodeURIComponent(code)}" class="drag-link">${b.name}</a>`;
    }
  }).join('');
  // Generate code blocks for Method B
  const codeBlocks = bookmarklets.map(b => {
    if (b.loader) {
      const remoteUrl = `https://solveitsimply.github.io/clio-bookmarklets/remote/${b.filename}`;
      const loaderCode = `javascript:(()=>{let u='${remoteUrl}?t='+Date.now();fetch(u).then(r=>r.text()).then(t=>{try{eval(t)}catch(e){let m=t.match(/<pre[^>]*>([\\s\\S]*?)<\\/pre>/i);if(m)eval(m[1]);else alert('Could not extract JS from HTML response.')}})})()`;
      return `<h4>${b.name}</h4><div class="code-block">${loaderCode}</div>`;
    } else {
      return `<h4>${b.name}</h4><div class="code-block">${b.minifiedCode.replace(/</g, '<').replace(/>/g, '>')}</div>`;
    }
  }).join('');
  // Generate description list
  const descriptions = bookmarklets.map(b =>
    `            <li><strong>${b.name}:</strong> ${b.description}</li>`
  ).join('\n');
  // Replace the drag links section (Method A)
  html = html.replace(
    /(<!-- Method A drag links start -->|<p>Click and hold one of these links:<\/p>)[\s\S]*?(\s*<p><strong>Instructions:<\/strong><\/p>)/,
    `$1\n${dragLinks}\n$2`
  );
  // Replace the code blocks section (Method B)
  html = html.replace(
    /(<!-- Method B code blocks start -->|<p>Copy the code you need below:<\/p>)[\s\S]*?(\s*<p><strong>Instructions:<\/strong><\/p>)/,
    `$1\n${codeBlocks}\n$2`
  );
  // Replace the descriptions section
  html = html.replace(
    /(<!-- Bookmarklet descriptions start -->|<h3>💡 What Each Bookmarklet Does<\/h3>\s*<ul>)([\s\S]*?)(\s*<\/ul>)/,
    `$1\n${descriptions}\n$3`
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

    // Loader mode: if file contains // @loader or minified > 1800 chars
    let loader = false;
    if (/\/\/\s*@loader\b/i.test(code)) loader = true;

    let transpiled, minifiedCode, bookmarklet;
    try {
      // Transpile to ES5 using Babel
      transpiled = babel.transformSync(code, {
        presets: [
          [
            '@babel/preset-env',
            {
              targets: { ie: "11" },
              modules: false
            }
          ]
        ],
        sourceType: 'script',
        comments: false,
        compact: true
      }).code;

      const result = await minify(transpiled, {
        ecma: 5,
        compress: true,
        mangle: true,
        output: {
          comments: false,
          quote_style: 3
        }
      });
      minifiedCode = result.code;
      bookmarklet = 'javascript:' + minifiedCode;

      // If not explicitly marked, check size
      if (!loader && minifiedCode.length > 1800) loader = true;

      // Write minified file to min/
      fs.writeFileSync(outPath, bookmarklet, 'utf8');
      console.log(`Minified ${file} -> min/${file}`);

      // If loader, also write to docs/remote/
      if (loader) {
        const remoteDir = path.join(__dirname, 'docs', 'remote');
        if (!fs.existsSync(remoteDir)) fs.mkdirSync(remoteDir, { recursive: true });
        const remotePath = path.join(remoteDir, file);
        fs.writeFileSync(remotePath, transpiled, 'utf8');
        console.log(`Wrote loader remote file: docs/remote/${file}`);
      }

      bookmarklets.push({
        name: info.name,
        description: info.description || 'No description available.',
        filename: file,
        minifiedCode: bookmarklet,
        loader
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
