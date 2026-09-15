import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const script = readFileSync('src/scripts/theme.js', 'utf8');
function browser({ saved = null, dark = false, blocked = false } = {}) {
  const handlers = {},
    windowHandlers = {};
  const root = { dataset: {} };
  const picker = {
    attributes: {},
    closest: (selector) => (selector === '[data-theme-picker]' ? picker : null),
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
  const media = {
    matches: dark,
    addEventListener: (_, fn) => {
      media.change = fn;
    },
  };
  let persisted = saved;
  runInNewContext(script, {
    document: {
      documentElement: root,
      querySelectorAll: () => [picker],
      querySelector: () => ({ setAttribute() {} }),
      addEventListener: (name, fn) => {
        handlers[name] = fn;
      },
    },
    matchMedia: () => media,
    localStorage: {
      getItem: () => {
        if (blocked) throw new Error('Storage blocked');
        return persisted;
      },
      setItem: (_, value) => {
        if (blocked) throw new Error('Storage blocked');
        persisted = value;
      },
    },
    window: {
      addEventListener: (name, fn) => {
        windowHandlers[name] = fn;
      },
    },
  });
  return {
    root,
    picker,
    click() {
      handlers.click({ target: picker });
    },
    select(value) {
      for (
        let count = 0;
        root.dataset.themePreference !== value && count < 3;
        count++
      ) {
        handlers.click({ target: picker });
      }
      assert.equal(root.dataset.themePreference, value);
    },
    system(value) {
      media.matches = value;
      media.change();
    },
    storage(value, key = 'outerjoin-theme') {
      windowHandlers.storage({ key, newValue: value });
    },
    persisted: () => persisted,
  };
}

test('system preference is applied before DOM ready and follows OS changes', () => {
  const page = browser({ dark: true });
  assert.equal(page.root.dataset.theme, 'dark');
  assert.equal(page.root.dataset.themePreference, 'system');
  page.system(false);
  assert.equal(page.root.dataset.theme, 'light');
});

test('explicit choice persists across navigation and overrides OS until System is selected', () => {
  const page = browser({ dark: true });
  page.select('light');
  assert.equal(page.persisted(), 'light');
  page.system(true);
  assert.equal(page.root.dataset.theme, 'light');
  assert.equal(
    browser({ saved: page.persisted(), dark: true }).root.dataset.theme,
    'light',
  );
  page.select('system');
  assert.equal(page.root.dataset.theme, 'dark');
});

test('theme selection works with blocked storage and ignores invalid saved preferences', () => {
  const page = browser({ blocked: true });
  page.select('dark');
  assert.equal(page.root.dataset.theme, 'dark');
  assert.equal(
    browser({ saved: 'invalid', dark: true }).root.dataset.theme,
    'dark',
  );
});

test('other tabs can update or clear the preference without unrelated storage events interfering', () => {
  const page = browser({ saved: 'light', dark: true });
  page.storage('dark', 'another-key');
  assert.equal(page.root.dataset.theme, 'light');
  page.storage('dark');
  assert.equal(page.root.dataset.theme, 'dark');
  assert.equal(page.root.dataset.themePreference, 'dark');
  page.storage(null);
  assert.equal(page.root.dataset.themePreference, 'system');
});

test('icon button cycles System, Dark, Light and back with descriptive labels', () => {
  const page = browser();
  for (const mode of ['dark', 'light', 'system']) {
    page.click();
    assert.equal(page.root.dataset.themePreference, mode);
    assert.ok(
      page.picker.attributes['aria-label'].startsWith(`Color theme: ${mode}.`),
    );
    assert.equal(
      page.picker.attributes.title,
      page.picker.attributes['aria-label'],
    );
  }
});
