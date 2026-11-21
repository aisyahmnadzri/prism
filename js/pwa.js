// PRISM — installable app support: registers the service worker, offers "Install app" where the browser allows it,
// and marks the page so styles can adapt (is-app when opened from the home screen, is-ios for iPhone/iPad tips).
(function () {
  const root = document.documentElement;
  const isApp = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  root.classList.toggle('is-app', isApp);
  root.classList.toggle('is-ios', isIOS && !isApp);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* app still works without it */ }));
  }

  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); // show our own button instead of the browser's mini bar
    deferred = e;
    root.classList.add('can-install');
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    root.classList.remove('can-install');
    if (typeof toast === 'function') toast('PRISM installed. Open it from your home screen or app list.');
  });
  document.addEventListener('click', async e => {
    if (!e.target.closest('[data-pwa-install]') || !deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    root.classList.remove('can-install');
    if (outcome === 'dismissed' && typeof toast === 'function') toast('You can install PRISM any time from Settings.');
  });
})();
