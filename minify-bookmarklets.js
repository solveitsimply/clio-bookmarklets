// Minify all bookmarklets in /bookmarklets/ and output to /bookmarklets/min/ with 'javascript:' prefix
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
    } catch (err) {
      console.error(`Failed to minify ${file}:`, err);
    }
  }
}

minifyBookmarklets();
