// Minify all bookmarklets in /bookmarklets/ and output to /bookmarklets/min/ with 'javascript:' prefix
// Also automatically updates docs/index.html with the latest bookmarklet list and code
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

// Extract description and name from a source bookmarklet file
function extractBookmarkletInfo(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let name = '';
  let description = '';
  
  // Look for the first comment block
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') && !name) {
      // Extract name from first comment line, removing // and common prefixes
      name = line.replace(/^\/\/\s*/, '').replace(/\s*Bookmarklet$/i, '').trim();
      if (name.startsWith('==') && name.endsWith('==')) {
        name = name.slice(2, -2).trim();
      }
    } else if (line.startsWith('//') && name && !description) {
      // Look for description in subsequent comment lines
      const descLine = line.replace(/^\/\/\s*/, '').trim();
      if (descLine && !descLine.toLowerCase().includes('usage:') && !descLine.toLowerCase().includes('author:') && !descLine.toLowerCase().includes('date:')) {
        description = descLine;
      }
    } else if (line && !line.startsWith('//')) {
      // Stop at first non-comment line
      break;
    }
  }
  
  // Fallback to filename if no name found
  if (!name) {
    name = path.basename(filePath, '.js')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  return { name, description };
}

// Generate a user-friendly name for the bookmarklet
function generateFriendlyName(filename) {
  return filename
    .replace('.js', '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Update the docs/index.html file with current bookmarklets
function updateDocsHTML(bookmarklets) {
  if (!fs.existsSync(DOCS_FILE)) {
    console.warn('docs/index.html not found, skipping documentation update');
    return;
  }
  
  let html = fs.readFileSync(DOCS_FILE, 'utf8');
  
  // Generate drag links for Method A
  const dragLinks = bookmarklets.map(b => 
    `        <a href='${b.minifiedCode.replace(/'/g, '&apos;')}' class="drag-link">${b.name}</a>`
  ).join('\n\n');
  
  // Generate code blocks for Method B
  const codeBlocks = bookmarklets.map(b => `
        <h4>${b.name}</h4>
        <div class="code-block">${b.minifiedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
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
  
  // If the above pattern doesn't exist, try the current pattern
  if (!html.includes('<!-- Method A drag links start -->')) {
    html = html.replace(
      /(<p>Click and hold one of these links:<\/p>\s*)([\s\S]*?)(\s*<p><strong>Instructions:<\/strong><\/p>)/,
      `$1\n        \n${dragLinks}\n\n        $3`
    );
  }
  
  // Replace the code blocks section (Method B)
  html = html.replace(
    /(<!-- Method B code blocks start -->|<p>Copy the code you need below:<\/p>)([\s\S]*?)(\s*<p><strong>Instructions:<\/strong><\/p>)/,
    `$1\n${codeBlocks}\n\n        $3`
  );
  
  // If the above pattern doesn't exist, try the current pattern
  if (!html.includes('<!-- Method B code blocks start -->')) {
    html = html.replace(
      /(<p>Copy the code you need below:<\/p>)([\s\S]*?)(\s*<p><strong>Instructions:<\/strong><\/p>)/,
      `$1\n${codeBlocks}\n\n        $3`
    );
  }
  
  // Replace the descriptions section
  html = html.replace(
    /(<!-- Bookmarklet descriptions start -->|<h3>💡 What Each Bookmarklet Does<\/h3>\s*<ul>)([\s\S]*?)(\s*<\/ul>)/,
    `$1\n${descriptions}\n        $3`
  );
  
  // If the above pattern doesn't exist, try the current pattern
  if (!html.includes('<!-- Bookmarklet descriptions start -->')) {
    html = html.replace(
      /(<h3>💡 What Each Bookmarklet Does<\/h3>\s*<ul>)([\s\S]*?)(\s*<\/ul>)/,
      `$1\n${descriptions}\n        $3`
    );
  }
  
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
          quote_style: 3  // Use backticks instead of single quotes
        }
      });
      
      // Replace any remaining single quotes with backticks to make it href-attribute safe
      let minifiedCode = result.code;
      // Replace single quotes that are used as string delimiters with backticks
      // This is a simple approach - we'll replace all single quotes with backticks
      minifiedCode = minifiedCode.replace(/'/g, '`');
      
      const bookmarklet = 'javascript:' + minifiedCode;
      fs.writeFileSync(outPath, bookmarklet, 'utf8');
      console.log(`Minified ${file} -> min/${file}`);
      
      // Store bookmarklet info for docs update
      bookmarklets.push({
        name: info.name || generateFriendlyName(file),
        description: info.description || 'No description available.',
        filename: file,
        minifiedCode: bookmarklet
      });
      
    } catch (err) {
      console.error(`Failed to minify ${file}:`, err);
    }
  }
  
  // Update documentation
  if (bookmarklets.length > 0) {
    updateDocsHTML(bookmarklets);
  }
}

minifyBookmarklets();
