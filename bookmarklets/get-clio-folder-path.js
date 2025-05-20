// Get Clio Folder Path Bookmarklet
// Copies the local file path (as it would appear in Clio Drive) for the currently viewed document folder in Clio Manage to your clipboard.
//
// Usage: Add this script as a bookmarklet in your browser. When viewing a folder in Clio Manage, click the bookmarklet to copy the corresponding Clio Drive path.

(function() {
  // 1. Detect OS (Windows or Mac)
  function getOS() {
    return 'windows'; // temporarily added for testing
    const platform = navigator.platform.toLowerCase();
    if (platform.indexOf('win') >= 0) return 'windows';
    if (platform.indexOf('mac') >= 0) return 'mac';
    // Default to Windows if undetectable
    return 'windows';
  }

  // 2. Extract current folder info from Clio Manage DOM
  // Handles navigation to dashboard to extract client name if not present on folder view
  function getClioFolderPathFromDOM() {
    try {
      // 1. Try to get client name from sessionStorage (set after dashboard extraction)
      let clientName = sessionStorage.getItem('clioClientName') || '';

      // 2. Try to get matter number from <cc-page-header>
      const pageHeader = document.querySelector('cc-page-header');
      let matterNumber = '';
      if (pageHeader && pageHeader.hasAttribute('header')) {
        matterNumber = pageHeader.getAttribute('header').trim();
      }

      // 3. If client name is not set, check if we're on the dashboard and can extract it
      if (!clientName) {
        // Try to extract from dashboard: .contact-name a
        const dashboardClient = document.querySelector('.contact-name a');
        if (dashboardClient) {
          clientName = dashboardClient.textContent.trim();
          // Save for later use
          sessionStorage.setItem('clioClientName', clientName);

          // If we navigated here from a folder, go back
          const returnUrl = sessionStorage.getItem('clioReturnUrl');
          if (returnUrl) {
            sessionStorage.removeItem('clioReturnUrl');
            setTimeout(() => { window.location.href = returnUrl; }, 100);
            return null; // Wait for navigation
          }
        }
      }

      // 4. If client name is still missing and we're on folder view, trigger navigation to dashboard
      if (!clientName) {
        // Save current URL to return to
        sessionStorage.setItem('clioReturnUrl', window.location.href);

        // Click the Dashboard tab (li#control-for-dashboard-tab)
        const dashboardTab = document.getElementById('control-for-dashboard-tab');
        if (dashboardTab) {
          dashboardTab.click();
          // Wait for navigation, then the script will run again
          return null;
        } else {
          alert('Could not find Dashboard tab to extract client name.');
          return null;
        }
      }

      // 5. Build base path: /{clientName}/{matterNumber}/
      if (!clientName || !matterNumber) return null;
      let path = `/${clientName}/${matterNumber}/`;

      // 6. Check for subfolder breadcrumbs
      const breadcrumbNav = document.querySelector('nav.breadcrumbs-list');
      if (breadcrumbNav) {
        const links = breadcrumbNav.querySelectorAll('a.breadcrumb-link');
        if (links.length > 1) {
          // Skip the first link ("All files and folders in ..."), use the rest for subfolder path
          const subfolders = [];
          for (let i = 1; i < links.length; i++) {
            const name = links[i].textContent.trim();
            if (name) subfolders.push(name);
          }
          if (subfolders.length > 0) {
            // Join with slashes and ensure trailing slash
            path += subfolders.join('/') + '/';
          }
        }
      }

      return path;
    } catch (e) {
      return null;
    }
  }

  // 3. Generate local file path for Clio Drive
  function generateClioDrivePath(folderPath, os) {
    // TODO: Adjust logic as needed for actual Clio Drive mapping
    if (!folderPath) return '';
    if (os === 'windows') {
      // Example Windows path: 'C:\Users\[User]\Clio Drive\Clients\Smith, John\Documents\Contracts'
      return 'A:' + folderPath.replace(/\//g, '\\');
    } else {
      // Example Mac path: '/Users/[User]/Clio Drive/Clients/Smith, John/Documents/Contracts'
      return '/Clio Drive' + folderPath;
    }
  }

  // 4. Copy to clipboard
  function copyToClipboard(text) {
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  // Main logic
  const os = getOS();
  const folderPath = getClioFolderPathFromDOM();
  const localPath = generateClioDrivePath(folderPath, os);
  copyToClipboard(localPath);

  // Optionally, show a notification (for user feedback)
  // TODO: Replace with a more user-friendly notification if desired
  if (localPath) {
    alert('Clio Drive path copied to clipboard:\n' + localPath);
  } else {
    alert('Could not determine Clio folder path. Please ensure you are viewing a folder in Clio Manage.');
  }
})();
