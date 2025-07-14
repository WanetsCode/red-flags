chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: openTopFlaggedEmailRawView
  });
});

function openTopFlaggedEmailRawView() {
  const flaggedEmail = document.querySelector('.zE');
  if (!flaggedEmail) {
    alert('No flagged emails found!');
    return;
  }

  let threadId = null;

  // Try multiple ways to extract thread ID
  const tryAttrs = ['data-legacy-thread-id', 'data-thread-id', 'data-thread-perm-id', 'data-threadid', 'jsdata'];
  for (const attr of tryAttrs) {
    const value = flaggedEmail.getAttribute(attr);
    if (value) {
      threadId = value;
      break;
    }
  }

  if (!threadId) {
    const links = flaggedEmail.querySelectorAll('a[href]');
    for (const link of links) {
      const href = link.getAttribute('href');
      const match = href?.match(/[?&]th=([a-zA-Z0-9]+)/);
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

  const messageId = flaggedEmail.getAttribute('data-message-id');

  function getIK() {
    const params = new URLSearchParams(window.location.search);
    return params.get('ik') ||
      (document.querySelector('form[action*="ik="]')?.getAttribute('action')?.match(/ik=([^&]+)/)?.[1] || null);
  }

  const ik = getIK();

  if (!ik) {
    alert("Couldn’t extract Gmail 'ik' parameter.");
    return;
  }

  const baseUrl = window.location.origin;
  const rawUrl = messageId
    ? `${baseUrl}/mail/u/0/?ui=2&ik=${ik}&view=om&th=${threadId}&msg=${messageId}`
    : `${baseUrl}/mail/u/0/?ui=2&ik=${ik}&view=om&th=${threadId}`;

  console.log('Opening raw email:', rawUrl);
  window.open(rawUrl, '_blank');
}
