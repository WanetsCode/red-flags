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
      
      // Method 1: Extract from jslog attribute (Gmail's logging data)
      const jslog = flaggedEmail.getAttribute('jslog');
      if (jslog && !threadId) {
        console.log('jslog:', jslog);
        
        // Look for base64 encoded data in jslog
        const base64Match = jslog.match(/1:([A-Za-z0-9+/=]+)/);
        if (base64Match) {
          try {
            const decoded = atob(base64Match[1]);
            console.log('Decoded jslog data:', decoded);
            
            // Look for thread ID in the decoded data
            const threadMatch = decoded.match(/"#thread-f:(\d+)"/);
            if (threadMatch) {
              threadId = threadMatch[1];
              console.log('Found thread ID in jslog:', threadId);
            }
          } catch (e) {
            console.warn('Could not decode jslog data:', e);
          }
        }
      }
      
      // Method 2: Check various data attributes
      if (!threadId) {
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
      }
      
      // Method 3: Check if it's in the jsdata attribute (Gmail sometimes stores data here)
      if (!threadId) {
        const jsdata = flaggedEmail.getAttribute('jsdata');
        if (jsdata) {
          const match = jsdata.match(/thread-([a-zA-Z0-9]+)/);
          if (match) threadId = match[1];
        }
      }
      
      // Method 4: Check parent elements
      if (!threadId) {
        let parent = flaggedEmail.parentElement;
        while (parent && !threadId) {
          for (const attr of ['data-legacy-thread-id', 'data-thread-id', 'data-thread-perm-id']) {
            const value = parent.getAttribute(attr);
            if (value) {
              threadId = value;
              break;
            }
          }
          parent = parent.parentElement;
        }
      }
      
      // Method 5: Try to extract from onclick or other event handlers
      if (!threadId) {
        const onclick = flaggedEmail.getAttribute('onclick') || flaggedEmail.getAttribute('jsaction');
        if (onclick) {
          const match = onclick.match(/thread[_-]?id['":][\s]*['"]?([a-zA-Z0-9]+)/i);
          if (match) threadId = match[1];
        }
      }
      
      // Method 6: Check for href attributes in child links
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
        // Method 1: Check URL parameters
        const params = new URLSearchParams(window.location.search);
        let ik = params.get('ik');
        console.log('Method 1 - URL params ik:', ik);
        
        // Method 2: Check URL hash parameters
        if (!ik && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          ik = hashParams.get('ik');
          console.log('Method 2 - Hash params ik:', ik);
        }
        
        // Method 3: Extract from full URL
        if (!ik) {
          const match = window.location.href.match(/[?&#]ik=([^&]+)/);
          ik = match ? match[1] : null;
          console.log('Method 3 - URL regex ik:', ik);
        }
        
        // Method 4: Look for ik in Gmail's global variables
        if (!ik) {
          try {
            // Check if Gmail exposes the ik in window variables
            if (window.GM_PARAMS && window.GM_PARAMS.ik) {
              ik = window.GM_PARAMS.ik;
              console.log('Method 4 - GM_PARAMS ik:', ik);
            }
          } catch (e) {
            console.warn('Could not access GM_PARAMS:', e);
          }
        }
        
        // Method 5: Try to extract from Gmail's data attributes
        if (!ik) {
          try {
            const gmailData = document.querySelector('[data-initial-dir]');
            if (gmailData) {
              const dataStr = gmailData.getAttribute('data-initial-dir');
              const ikMatch = dataStr.match(/ik[=:]([^&,}]+)/);
              if (ikMatch) {
                ik = ikMatch[1];
                console.log('Method 5 - data-initial-dir ik:', ik);
              }
            }
          } catch (e) {
            console.warn('Could not extract ik from Gmail data:', e);
          }
        }
        
        // Method 6: Look for ik in script tags or other DOM elements
        if (!ik) {
          try {
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
              const content = script.textContent || script.innerHTML;
              const match = content.match(/["']ik["']:\s*["']([^"']+)["']/);
              if (match) {
                ik = match[1];
                console.log('Method 6 - script content ik:', ik);
                break;
              }
            }
          } catch (e) {
            console.warn('Could not extract ik from scripts:', e);
          }
        }
        
        // Method 7: Try alternative Gmail session parameters
        if (!ik) {
          try {
            // Some Gmail setups use different parameter names
            const alternativeParams = ['at', 'session', 'auth', 'key'];
            for (const param of alternativeParams) {
              const value = new URLSearchParams(window.location.search).get(param);
              if (value) {
                console.log(`Method 7 - Found alternative param ${param}:`, value);
                ik = value; // Try using this as ik
                break;
              }
            }
          } catch (e) {
            console.warn('Could not find alternative params:', e);
          }
        }
        
        // Method 8: Generate a dummy request to get the ik
        if (!ik) {
          try {
            // Try to find any existing Gmail API calls in the page
            const forms = document.querySelectorAll('form');
            for (const form of forms) {
              const action = form.getAttribute('action');
              if (action && action.includes('ik=')) {
                const match = action.match(/ik=([^&]+)/);
                if (match) {
                  ik = match[1];
                  console.log('Method 8 - form action ik:', ik);
                  break;
                }
              }
            }
          } catch (e) {
            console.warn('Could not extract ik from forms:', e);
          }
        }
        
        console.log('Final ik result:', ik);
        return ik;
      }

      const ik = getIK();
      console.log('Extracted ik:', ik);
      
      // Compose raw view URL
      const baseUrl = window.location.origin;
      let rawUrl;
      
      if (ik) {
        // Primary method: Use ik parameter
        if (messageId) {
          rawUrl = `${baseUrl}/mail/u/0/?ui=2&ik=${ik}&view=om&th=${threadId}&msg=${messageId}`;
        } else {
          rawUrl = `${baseUrl}/mail/u/0/?ui=2&ik=${ik}&view=om&th=${threadId}`;
        }
      } else {
        // Alternative method: Try different Gmail URLs that might not need ik
        console.log('No ik found, trying alternative URLs');
        
        // Method 1: Try Gmail's print view (sometimes works without ik)
        rawUrl = `${baseUrl}/mail/u/0/?ui=2&view=pt&th=${threadId}`;
        
        // Method 2: Try basic HTML view
        const altUrl1 = `${baseUrl}/mail/u/0/h/?th=${threadId}`;
        
        // Method 3: Try mobile view
        const altUrl2 = `${baseUrl}/mail/u/0/m/?th=${threadId}`;
        
        // Try the first alternative, and if it fails, provide other options
        console.log('Trying print view URL:', rawUrl);
        
        // Open the first URL and also alert user about alternatives
        window.open(rawUrl, '_blank');
        
        // Also try opening alternative URLs
        setTimeout(() => {
          console.log('Also trying HTML view:', altUrl1);
          window.open(altUrl1, '_blank');
        }, 1000);
        
        setTimeout(() => {
          console.log('Also trying mobile view:', altUrl2);
          window.open(altUrl2, '_blank');
        }, 2000);
        
        alert(`Opened multiple tabs with thread ID: ${threadId}\nTry each one to find the raw email content.`);
        return;
      }

      console.log('Opening raw email:', rawUrl);
      
      // Open raw email in new tab
      window.open(rawUrl, '_blank');
    }
  });
});