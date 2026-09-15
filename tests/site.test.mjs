import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import test from 'node:test';

const dist = resolve('dist');
const legacy = [
  'produmex-wms-database-structure',
  'produmex-wms-licensing-explained',
  'dont-disable-the-pmx-transaction-notification',
  'how-i-use-ai-tools-june-2026',
  'how-produmex-decides-what-to-pick',
];
const picking = '/posts/how-produmex-decides-what-to-pick/';
const read = (file) => readFileSync(join(dist, file), 'utf8');

test('old bookmarked blog and taxonomy routes still resolve after the migration', () => {
  const routes = [
    ...legacy.map((s) => `posts/${s}/index.html`),
    'archives/index.html',
    'tags/produmex/index.html',
    'tags/stock-allocation/index.html',
    'categories/produmex-wms/index.html',
  ];
  for (const route of routes)
    assert.ok(existsSync(join(dist, route)), `Missing legacy route: ${route}`);
});

test('the studio and product pages are rendered without client-side bootstrapping', () => {
  for (const route of [
    'index.html',
    'solutions/index.html',
    'solutions/quality-control/index.html',
    'outerforge/index.html',
    'about/index.html',
    'contact/index.html',
    'insights/index.html',
  ]) {
    assert.ok(existsSync(join(dist, route)), `Missing page: ${route}`);
    assert.match(
      read(route),
      /<h1[\s>]/,
      `Missing server-rendered page content: ${route}`,
    );
  }
});

test('feed subscribers retain the same article identity and original publication date', () => {
  assert.ok(existsSync(join(dist, 'feed.xml')), 'Atom feed is missing');
  const feed = read('feed.xml');
  assert.match(feed.split('<entry>')[0], /<id>https:\/\/outerjoin\.be\/<\/id>/);
  assert.match(feed, /http:\/\/www\.w3\.org\/2005\/Atom/);
  for (const slug of legacy)
    assert.ok(
      feed.includes(`https://outerjoin.be/posts/${slug}/`),
      `Missing feed entry: ${slug}`,
    );
  const entry = feed
    .split('<entry>')
    .find((e) => e.includes('/posts/produmex-wms-licensing-explained/'));
  assert.match(
    entry,
    /<published>2025-01-09T(?:09:41:01Z|10:41:01\+01:00|09:41:01\.000Z)<\/published>/,
  );
});

test('the previously hidden picking article is now listed throughout the public site', () => {
  assert.ok(
    existsSync(join(dist, 'insights/index.html')),
    'Insights page is missing',
  );
  for (const route of ['index.html', 'insights/index.html'])
    assert.ok(
      new RegExp(`href=["']${picking}`).test(read(route)),
      `Picking article missing from ${route}`,
    );
  for (const route of [
    'archives/index.html',
    'tags/picking/index.html',
    'categories/picking/index.html',
  ])
    assert.ok(
      read(route).includes(picking),
      `Picking article missing from ${route}`,
    );
  assert.ok(read('assets/js/data/search.json').includes(picking));
  assert.ok(read('sitemap.xml').includes(picking));
});

test('article body formatting is converted instead of exposing Jekyll attributes to readers', () => {
  for (const slug of legacy) {
    assert.ok(
      existsSync(join(dist, `posts/${slug}/index.html`)),
      `Missing article: ${slug}`,
    );
    assert.doesNotMatch(
      read(`posts/${slug}/index.html`),
      /\{:\s*(?:\.|width=)/,
    );
  }
  assert.match(
    read('posts/produmex-wms-database-structure/index.html'),
    /prompt-info|callout-info/,
  );
  assert.match(
    read('posts/how-produmex-decides-what-to-pick/index.html'),
    /<table[\s>]/,
  );
});

test('built pages have no broken local links or image references', async () => {
  assert.ok(existsSync(join(dist, 'index.html')), 'Site has not been built');
  const { load } = await import('cheerio');
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.html')) files.push(path);
    }
  }
  walk(dist);
  const missing = [];
  for (const file of files) {
    const $ = load(readFileSync(file, 'utf8'));
    $('a[href],img[src],script[src],link[href]').each((_, e) => {
      const raw = $(e).attr('href') ?? $(e).attr('src');
      if (!raw || /^(?:https?:|mailto:|tel:|data:|#)/.test(raw)) return;
      const url = new URL(
        raw,
        `https://outerjoin.be/${file.slice(dist.length + 1).replace(/index\.html$/, '')}`,
      );
      const target = join(dist, decodeURIComponent(url.pathname));
      if (!existsSync(target) && !existsSync(join(target, 'index.html')))
        missing.push(`${file.slice(dist.length + 1)} -> ${raw}`);
    });
  }
  assert.deepEqual(missing, []);
});

test('public pages identify the production site and provide a local share image', async () => {
  const { load } = await import('cheerio');
  for (const route of [
    'index.html',
    'outerforge/index.html',
    'posts/how-produmex-decides-what-to-pick/index.html',
  ]) {
    const $ = load(read(route));
    assert.equal(
      $('h1').length,
      1,
      `Page should have one main heading: ${route}`,
    );
    assert.match(
      $('link[rel="canonical"]').attr('href'),
      /^https:\/\/outerjoin\.be\//,
    );
    assert.ok($('meta[name="description"]').attr('content'));
    assert.equal($('meta[property="og:type"]').length, 1);
    const image = new URL($('meta[property="og:image"]').attr('content'));
    assert.ok(
      existsSync(join(dist, image.pathname)),
      `Missing share image: ${image.pathname}`,
    );
    assert.ok(!$('meta[name="robots"]').attr('content')?.includes('noindex'));
  }
});

test('the migration worker removes only legacy caches and retires its registration', async () => {
  const { runInNewContext } = await import('node:vm');
  const handlers = {},
    deleted = [],
    events = [];
  runInNewContext(read('sw.min.js'), {
    self: {
      addEventListener: (event, handler) => {
        handlers[event] = handler;
      },
      skipWaiting: async () => events.push('skip'),
      clients: { claim: async () => events.push('claim') },
      registration: { unregister: async () => events.push('unregister') },
    },
    caches: {
      keys: async () => ['chirpy-1783277002', 'another-app-cache'],
      delete: async (name) => deleted.push(name),
    },
  });
  /** @type {Promise<unknown> | undefined} */
  let pending;
  const event = {
    waitUntil: (promise) => {
      pending = promise;
    },
  };
  handlers.install(event);
  await pending;
  handlers.activate(event);
  await pending;
  assert.deepEqual(deleted, ['chirpy-1783277002']);
  assert.deepEqual(events, ['skip', 'claim', 'unregister']);
  assert.equal(
    handlers.fetch,
    undefined,
    'Retired worker should not intercept requests',
  );
});

test('theme selection loads before page content and code blocks include both palettes', async () => {
  const { load } = await import('cheerio');
  for (const route of [
    'index.html',
    'outerforge/index.html',
    'insights/index.html',
    '404.html',
  ]) {
    const $ = load(read(route));
    assert.equal($('[data-theme-picker]').length, 1, route);
    assert.ok(
      $('head script')
        .toArray()
        .some((s) => $(s).html()?.includes('outerjoin-theme')),
      route,
    );
    assert.equal($('footer button[data-theme-picker]').length, 1, route);
    assert.equal($('header [data-theme-picker]').length, 0, route);
  }
  const $ = load(read('posts/produmex-wms-database-structure/index.html'));
  assert.match($('.astro-code').first().attr('style'), /--shiki-dark-bg:/);
  assert.ok($('.astro-code span[style*="--shiki-dark:"]').length > 0);
});
