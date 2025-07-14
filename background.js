chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      // Find the topmost flagged email (first one in the list)
      const flaggedEmail = document.querySelector('.zE');
      if (!flaggedEmail) {
        alert('No flagged emails found!');
        return;
      }

      // Debug: Log the flagged email element
      console.log('Flagged email element:', flaggedEmail);
      console.log('All attributes:', [...flaggedEmail.attributes].map(attr => `${attr.name}: ${attr.value}`));

      // Try multiple methods to find thread ID
      let threadId = null;
      
      // Method 1: Check various data attributes
      const possibleAttributes = [
        'data-legacy-thread-id',
        'data-thread-id',
        'data-thread-perm-id',
        'data-threadid',
        'jsdata'
      ];
      
      for (const attr of possibleAttributes) {
        const value = flaggedEmail.getAttribute(attr);
        if (value) {
          console.log(`Found ${attr}: ${value}`);
          threadId = value;
          break;
        }
      }
      
      // Method 2: Check if it's in the jsdata attribute (Gmail sometimes stores data here)
      if (!threadId) {
        const jsdata = flaggedEmail.getAttribute('jsdata');
        if (jsdata) {
          const match = jsdata.match(/thread-([a-zA-Z0-9]+)/);
          if (match) threadId = match[1];
        }
      }
      
      // Method 3: Check parent elements
      if (!threadId) {
        let parent = flaggedEmail.parentElement;
        while (parent && !threadId) {
          for (const attr of possibleAttributes) {
            const value = parent.getAttribute(attr);
            if (value) {
              threadId = value;
              break;
            }
          }
          parent = parent.parentElement;
        }
      }
      
      // Method 4: Try to extract from onclick or other event handlers
      if (!threadId) {
        const onclick = flaggedEmail.getAttribute('onclick') || flaggedEmail.getAttribute('jsaction');
        if (onclick) {
          const match = onclick.match(/thread[_-]?id['":][\s]*['"]?([a-zA-Z0-9]+)/i);
          if (match) threadId = match[1];
        }
      }
      
      // Method 5: Check for href attributes in child links
      if (!threadId) {
        const links = flaggedEmail.querySelectorAll('a[href]');
        for (const link of links) {
          const href = link.getAttribute('href');
          const match = href.match(/[#&?]thread[_-]?id=([a-zA-Z0-9]+)/i) || 
                       href.match(/[#&?]th=([a-zA-Z0-9]+)/i);
          if (match) {
            threadId = match[1];
            break;
          }
        }
      }
      
      if (!threadId) {
        alert('Cannot find thread ID of flagged email. Check console for debug info.');
        return;
      }
      
      console.log('Found thread ID:', threadId);

      // Get the message ID for individual email (more specific than thread)
      const messageId = flaggedEmail.getAttribute('data-message-id');

      // Helper: get the 'ik' parameter from Gmail URL (required for raw view)
      function getIK() {
        const params = new URLSearchParams(window.location.search);
        let ik = params.get('ik');
        
        // If not in URL params, try to extract from Gmail's internal data
        if (!ik) {
          const match = window.location.href.match(/[?&]ik=([^&]+)/);
          ik = match ? match[1] : '';
        }
        
        // Last resort: try to find it in Gmail's global variables
        if (!ik && window.GM_SPT_ENABLED) {
          try {
            const gmailData = document.querySelector('[data-initial-dir]');
            if (gmailData) {
              const dataStr = gmailData.getAttribute('data-initial-dir');
              const ikMatch = dataStr.match(/ik[=:]([^&,}]+)/);
              if (ikMatch) ik = ikMatch[1];
            }
          } catch (e) {
            console.warn('Could not extract ik from Gmail data:', e);
          }
        }
        
        return ik;
      }

      const ik = getIK();
      if (!ik) {
        alert('Cannot extract Gmail session key (ik parameter). Try refreshing Gmail.');
        return;
      }

      // Compose raw view URL
      const baseUrl = window.location.origin;
      let rawUrl;
      
      if (messageId) {
        // More specific URL for individual message
        rawUrl = `${baseUrl}/mail/u/0/?ui=2&ik=${ik}&view=om&th=${threadId}&msg=${messageId}`;
      } else {
        // Fallback to thread view
        rawUrl = `${baseUrl}/mail/u/0/?ui=2&ik=${ik}&view=om&th=${threadId}`;
      }

      console.log('Opening raw email:', rawUrl);
      
      // Open raw email in new tab
      window.open(rawUrl, '_blank');
    }
  });
});