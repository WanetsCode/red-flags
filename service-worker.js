function reddenPage() {
  // Select all elements with class zA, zE, or x7
  const elements = document.querySelectorAll('.zA, .zE, .x7');
  elements.forEach(el => {
    el.style.backgroundColor = 'red';
  });
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab.url.includes('chrome://')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: reddenPage
    });
  }
});
