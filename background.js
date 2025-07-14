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

      // Gmail thread id stored in various possible attributes
      const threadId = flaggedEmail.getAttribute('data-legacy-thread-id') || 
                      flaggedEmail.getAttribute('data-thread-id') ||
                      flaggedEmail.getAttribute('data-thread-perm-id');
      
      if (!threadId) {
        alert('Cannot find thread ID of flagged email.');
        return;
      }

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