/**
 * Shared page bootstrap — loads core scripts and optional extras in order.
 */
(function (global) {
  const BOOTSTRAP_CDN =
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js';

  const CDN_STYLES = [
    { id: 'csrms-bootstrap-css', href: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css' },
    { id: 'csrms-fa-css', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' },
  ];

  function ensureStyles() {
    CDN_STYLES.forEach(({ id, href }) => {
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const el = document.createElement('script');
      el.src = src;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(el);
    });
  }

  async function load(scripts) {
    for (const src of scripts) {
      await loadScript(src);
    }
  }

  /**
   * @param {object} [options]
   * @param {string[]} [options.extra] - Additional script URLs/paths after core bundle
   * @param {boolean} [options.utils=true] - Include utils.js
   * @param {boolean} [options.nav=true] - Include nav.js
   * @param {boolean} [options.styles=true] - Inject CDN stylesheets
   */
  async function loadStandard(options = {}) {
    const {
      extra = [],
      utils = true,
      nav = true,
      styles = true,
    } = options;

    if (styles) ensureStyles();

    const scripts = [
      BOOTSTRAP_CDN,
      '../js/api.js',
      '../js/auth.js',
    ];
    if (utils) scripts.push('../js/utils.js');
    if (nav) scripts.push('../js/nav.js');
    scripts.push(...extra);
    await load(scripts);
  }

  async function boot(pageFn, options = {}) {
    await loadStandard(options);
    // Scripts load after DOMContentLoaded — call page init directly, not via that event.
    if (typeof pageFn === 'function') {
      await pageFn();
    }
  }

  /** Register page handlers on window for inline onclick/onsubmit (boot-scoped functions). */
  function expose(...handlers) {
    handlers.forEach((h) => {
      if (typeof h === 'function') {
        if (h.name) global[h.name] = h;
      } else if (h && typeof h === 'object') {
        Object.assign(global, h);
      }
    });
  }

  global.CSRMSLayout = {
    load,
    loadStandard,
    boot,
    expose,
    ensureStyles,
  };

  // Inject CDN styles as soon as layout.js loads (before CSRMSLayout.boot).
  ensureStyles();
})(window);
