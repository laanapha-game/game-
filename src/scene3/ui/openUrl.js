// Open an outside link in a new tab from a tap. A real <a target="_blank"> click works in
// phone browsers and inside embedded viewers where window.open is refused.
export function openUrl(url) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
