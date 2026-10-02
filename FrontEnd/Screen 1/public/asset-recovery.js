// Older cached HTML may reference a bundle removed by a newer deployment.
// A fresh navigation bypasses that shell and starts the updated service worker.
const freshPage = new URL(window.location.href)
if (!freshPage.searchParams.has('lp-refresh')) {
  freshPage.searchParams.set('lp-refresh', '2')
  window.location.replace(freshPage.href)
} else {
  const root = document.getElementById('root')
  if (root) root.textContent = 'The latest app could not load. Please refresh in a moment.'
}
