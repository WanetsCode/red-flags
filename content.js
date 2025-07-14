// Inject Material Icon Font
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&display=swap";
document.head.appendChild(link);

// Main flagging function
function flagUnreadEmails() {
  const unreadEmails = document.querySelectorAll('.zE');

  unreadEmails.forEach(email => {
    email.style.backgroundColor = '#f5d090';

    const starCell = email.querySelector('td.apU.xY');
    const starSpan = starCell?.querySelector('span.aXw');

    if (starSpan && !starCell.querySelector('.wanets-flag')) {
      const flag = document.createElement('span');
      flag.className = 'material-symbols-outlined wanets-flag';
      flag.textContent = 'flag';

      // Styling
      flag.style.fontSize = '16px';
      flag.style.marginLeft = '4px';
      flag.style.verticalAlign = 'middle';
      flag.style.color = 'darkred';
      flag.title = "This message is red-flagged";

      // Insert right after the star span
      starSpan.insertAdjacentElement('afterend', flag);
    }
  });
}

// Run immediately
flagUnreadEmails();

// Observe Gmail DOM for changes
const observer = new MutationObserver(() => {
  flagUnreadEmails();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
