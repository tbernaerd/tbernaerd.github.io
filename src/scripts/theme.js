// Inline in the head so the palette is selected before the page paints.
(() => {
  const key = 'outerjoin-theme';
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const valid = (value) => ['light', 'dark', 'system'].includes(value);
  const modes = ['system', 'dark', 'light'];
  const next = () => modes[(modes.indexOf(preference) + 1) % modes.length];
  let preference = 'system';
  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) preference = saved;
  } catch {
    /* Theme selection also works when storage is blocked. */
  }

  function apply() {
    const theme =
      preference === 'system'
        ? system.matches
          ? 'dark'
          : 'light'
        : preference;
    root.dataset.theme = theme;
    root.dataset.themePreference = preference;
    document.querySelectorAll('[data-theme-picker]').forEach((picker) => {
      const label = `Color theme: ${preference}. Switch to ${next()}.`;
      picker.setAttribute('aria-label', label);
      picker.setAttribute('title', label);
    });
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#111213' : '#ffffff');
  }
  apply();
  document.addEventListener('DOMContentLoaded', apply, { once: true });
  document.addEventListener('click', (event) => {
    if (!event.target?.closest?.('[data-theme-picker]')) return;
    preference = next();
    try {
      localStorage.setItem(key, preference);
    } catch {
      /* In-memory choice still applies. */
    }
    apply();
  });
  system.addEventListener('change', () => {
    if (preference === 'system') apply();
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : 'system';
    apply();
  });
})();
