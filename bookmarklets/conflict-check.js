// Run Conflict Check
// This bookmarklet automates conflict checks in Clio Manage by accepting a list of search terms,
// performing searches for each term, collecting results from all categories, and generating a report.
// Usage: Add this script as a bookmarklet. When clicked, it will prompt for search terms and run the check.
//
// Author: [Your Name]
// Date: 2025-05-20

(function() {
  // Utility: Create a modal popup for multi-line input
  function createInputModal(onSubmit, onCancel) {
    // Remove any existing modal
    document.getElementById('clio-conflict-check-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'clio-conflict-check-modal';
    modal.style = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.3); z-index: 99999; display: flex; align-items: center; justify-content: center;
    `;

    const box = document.createElement('div');
    box.style = `
      background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 16px rgba(0,0,0,0.2);
      min-width: 340px; max-width: 90vw; display: flex; flex-direction: column; gap: 12px;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Conflict Check: Enter Search Terms';
    title.style = 'margin: 0 0 8px 0; font-size: 1.2em;';

    const textarea = document.createElement('textarea');
    textarea.rows = 10;
    textarea.style = 'width: 100%; font-size: 1em; resize: vertical;';
    textarea.placeholder = 'Paste one search term per line...';

    const buttonRow = document.createElement('div');
    buttonRow.style = 'display: flex; gap: 8px; justify-content: flex-end;';

    const goBtn = document.createElement('button');
    goBtn.textContent = 'Go';
    goBtn.style = 'padding: 6px 18px; font-size: 1em; background: #0077cc; color: #fff; border: none; border-radius: 4px; cursor: pointer;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style = 'padding: 6px 18px; font-size: 1em; background: #eee; color: #333; border: none; border-radius: 4px; cursor: pointer;';

    goBtn.onclick = () => {
      const terms = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
      if (terms.length === 0) {
        textarea.focus();
        return;
      }
      modal.remove();
      onSubmit(terms);
    };
    cancelBtn.onclick = () => {
      modal.remove();
      onCancel && onCancel();
    };

    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(goBtn);

    box.appendChild(title);
    box.appendChild(textarea);
    box.appendChild(buttonRow);

    modal.appendChild(box);
    document.body.appendChild(modal);

    textarea.focus();
  }

  // Main logic: Step 1 - Prompt for search terms
  createInputModal(
    async function onSubmit(terms) {
      // Step 2: For each term, perform search and collect results
      if (!terms.length) return;

      // Helper: Wait for results page to load
      function waitForResults(timeout = 10000) {
        return new Promise((resolve, reject) => {
          const start = Date.now();
          (function check() {
            if (document.querySelector('cc-search-categories, .cc-search-categories')) {
              resolve();
            } else if (Date.now() - start > timeout) {
              reject(new Error('Timed out waiting for search results.'));
            } else {
              setTimeout(check, 200);
            }
          })();
        });
      }

      // Helper: Wait for a short time (ms)
      function wait(ms) {
        return new Promise(res => setTimeout(res, ms));
      }

      // Helper: Collect all results for all categories for the current search term
      async function collectResultsForTerm(searchTerm) {
        if (cancelled) throw new Error('Cancelled');
        // 1. Find the search input
        const input = document.querySelector('input.k-input[type="text"]');
        if (!input) {
          alert('Could not find the Clio search input box.');
          throw new Error('No search input');
        }

        // 2. Enter the search term
        input.focus();
        input.value = searchTerm;

        // 3. Dispatch input events to trigger Angular/React listeners
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        // 4. Simulate pressing Enter
        const enterEvent = new KeyboardEvent('keyup', { bubbles: true, key: 'Enter', code: 'Enter', which: 13, keyCode: 13 });
        input.dispatchEvent(enterEvent);

        // Forced delay to allow the new search results page to load and DOM to update
        await wait(5000);

        // 5. Wait for results page to load
        await waitForResults();

        // Wait for category tab links to appear and be non-empty
        async function waitForTabLinks(timeout = 10000) {
          const start = Date.now();
          return new Promise((resolve, reject) => {
            (function check() {
              const links = Array.from(document.querySelectorAll('cc-search-categories ul li a'));
              if (links.length > 0 && links.some(a => a.textContent.trim())) {
                resolve(links);
              } else if (Date.now() - start > timeout) {
                reject(new Error('Timed out waiting for category tabs.'));
              } else {
                setTimeout(check, 150);
              }
            })();
          });
        }
        const tabLinks = await waitForTabLinks();

        // 6. Iterate through all category tabs and collect results

        const categories = {};
        for (const tabLink of tabLinks) {
          if (cancelled) throw new Error('Cancelled');
          const categoryName = tabLink.textContent.trim();
          tabLink.click();
          await wait(800);

          // Extract results from the current tab, handling pagination
          let allResults = [];
          let seenPages = new Set();
          while (true) {
            if (cancelled) throw new Error('Cancelled');
            // Avoid infinite loops if the pager is buggy
            const pagerInfo = document.querySelector('.k-pager-info');
            const pageKey = pagerInfo ? pagerInfo.textContent.trim() : '';
            if (pageKey && seenPages.has(pageKey)) break;
            if (pageKey) seenPages.add(pageKey);

            const rows = Array.from(document.querySelectorAll('.k-grid-content table[role="grid"] tbody tr'));
            const pageResults = rows.map(row => {
              return Array.from(row.querySelectorAll('td')).map(td => {
                // If the cell contains an <a>, extract its text and href
                const link = td.querySelector('a');
                if (link && link.getAttribute('href')) {
                  return {
                    text: link.innerText.trim(),
                    href: link.getAttribute('href')
                  };
                }
                return td.innerText.trim();
              });
            });
            allResults = allResults.concat(pageResults);

            // Check for enabled "next page" button
            const nextBtn = document.querySelector('a.k-pager-nav[aria-label="Go to the next page"]:not(.k-state-disabled)');
            if (nextBtn) {
              nextBtn.click();
              await wait(800);
            } else {
              break;
            }
          }
          categories[categoryName] = allResults;
        }
        return categories;
      }

      // Progress modal with cancel
      let cancelled = false;
      let progressModal = null;
      function showProgressModal(message) {
        // Remove any existing modal
        document.getElementById('clio-conflict-check-progress')?.remove();
        const modal = document.createElement('div');
        modal.id = 'clio-conflict-check-progress';
        modal.style = `
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.3); z-index: 99999; display: flex; align-items: center; justify-content: center;
        `;
        const box = document.createElement('div');
        box.style = `
          background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 16px rgba(0,0,0,0.2);
          min-width: 320px; max-width: 90vw; display: flex; flex-direction: column; gap: 16px; align-items: center;
        `;
        const msg = document.createElement('div');
        msg.id = 'clio-conflict-check-progress-msg';
        msg.textContent = message;
        msg.style = 'font-size:1.1em; margin-bottom:8px;';
        const spinner = document.createElement('div');
        spinner.style = 'width:32px;height:32px;border:4px solid #eee;border-top:4px solid #0077cc;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:8px;';
        spinner.innerHTML = '<style>@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}</style>';
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style = 'padding: 6px 18px; font-size: 1em; background: #eee; color: #333; border: none; border-radius: 4px; cursor: pointer;';
        cancelBtn.onclick = () => {
          cancelled = true;
          msg.textContent = 'Cancelling...';
          cancelBtn.disabled = true;
        };
        box.appendChild(spinner);
        box.appendChild(msg);
        box.appendChild(cancelBtn);
        modal.appendChild(box);
        document.body.appendChild(modal);
        progressModal = modal;
      }
      function updateProgressMsg(msg) {
        const el = document.getElementById('clio-conflict-check-progress-msg');
        if (el) el.textContent = msg;
      }
      function removeProgressModal() {
        document.getElementById('clio-conflict-check-progress')?.remove();
        progressModal = null;
      }

      // Main loop: process all terms
      const allResults = [];
      showProgressModal('Starting conflict check...');
      for (let i = 0; i < terms.length; ++i) {
        if (cancelled) break;
        const term = terms[i];
        try {
          updateProgressMsg(`Processing term ${i + 1} of ${terms.length}: "${term}"`);
          const categories = await collectResultsForTerm(term);
          allResults.push({ term, categories });
        } catch (e) {
          allResults.push({ term, error: e.message });
        }
      }
      removeProgressModal();
      if (cancelled) {
        alert('Conflict check cancelled by user.');
        return;
      }

      // Step 3: Generate HTML report and open in new tab
      function escapeHtml(str) {
        return str.replace(/[&<>"']/g, s => ({
          '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;'
        })[s]);
      }

      // Helper: Render a table with clickable links for each row, if possible
      function renderTable(rows, category, baseUrl) {
        if (!rows.length) return '<em>No results</em>';
        // For each row, render the first cell as a link if it has an href
        return `<table border="1" cellpadding="4" style="border-collapse:collapse; margin:8px 0;">
          <tbody>
            ${rows.map(row => {
              return `<tr>${row.map((cell, i) => {
                if (i === 0 && cell && typeof cell === "object" && cell.href) {
                  // If the href is a hash, prepend the base URL
                  let url = cell.href;
                  if (url.startsWith("#/")) url = (baseUrl || "https://app.clio.com/nc/") + url;
                  return `<td><a href="${url}" target="_blank" rel="noopener">${escapeHtml(cell.text)}</a></td>`;
                }
                return `<td>${escapeHtml(typeof cell === "object" ? cell.text : cell)}</td>`;
              }).join('')}</tr>`;
            }).join('')}
          </tbody>
        </table>`;
      }

      // Try to extract the account name from the search input placeholder or header
      let accountName = "";
      const searchInput = document.querySelector('input.k-input[type="text"]');
      if (searchInput && searchInput.placeholder) {
        // e.g., "Search Gartner + Bloom, P.C."
        const m = searchInput.placeholder.match(/Search (.+)$/);
        if (m) accountName = m[1].trim();
      }
      if (!accountName) accountName = "Clio Account";

      let html = `<html><head><title>Clio Conflict Check Report for ${escapeHtml(accountName)}</title>
        <style>
          body { font-family: sans-serif; margin: 24px; }
          h2 { margin-top: 2em; }
          table { font-size: 0.95em; }
          .error { color: #b00; }
        </style>
      </head><body>
      <h1>Clio Conflict Check Report for ${escapeHtml(accountName)}</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
      `;

      const baseUrl = "https://app.clio.com/nc/";
      for (const result of allResults) {
        html += `<h2>Search Term: <span style="color:#0077cc">${escapeHtml(result.term)}</span></h2>`;
        if (result.error) {
          html += `<div class="error">Error: ${escapeHtml(result.error)}</div>`;
          continue;
        }
        for (const [cat, rows] of Object.entries(result.categories)) {
          const count = rows.length;
          const countStr = count.toLocaleString("en-US");
          html += `<h3>${escapeHtml(cat)} (${countStr} result${count === 1 ? "" : "s"})</h3>`;
          html += renderTable(rows, cat, baseUrl);
        }
      }

      html += '</body></html>';

      // Open report in new tab
      const reportWin = window.open();
      if (reportWin) {
        reportWin.document.write(html);
        reportWin.document.close();
      } else {
        alert('Popup blocked! Please allow popups to see the report.');
      }
    },
    function onCancel() {
      // User cancelled
    }
  );
})();
