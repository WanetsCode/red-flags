chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      // Find newest flagged email's thread id
      const flaggedEmail = document.querySelector('.zE');
      if (!flaggedEmail) {
        alert('No flagged emails found!');
        return;
      }
      // Gmail thread id stored in 'data-legacy-thread-id' or 'data-thread-id'
      const threadId = flaggedEmail.getAttribute('data-legacy-thread-id') || flaggedEmail.getAttribute('data-thread-id');
      if (!threadId) {
        alert('Cannot find thread ID of flagged email.');
        return;
      }

      // Compose raw view URL
      const baseUrl = window.location.origin;
      const rawUrl = `${baseUrl}/mail/u/0/?ui=2&ik=${getIK()}&view=om&th=${threadId}`;

      // Open raw email in new tab
      window.open(rawUrl, '_blank');

      // Helper: get the 'ik' parameter from Gmail URL (required for raw view)
      function getIK() {
        const params = new URLSearchParams(window.location.search);
        return params.get('ik') || '';
      }
    }
  });
});
