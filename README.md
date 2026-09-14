# Outer Join studio

The Astro source for [outerjoin.be](https://outerjoin.be). Static pages, local fonts, an interactive fictional QC illustration, and Markdown articles. No application backend or business-system connection runs on this website.

## Local development

Node 24 LTS recommended (minimum 22.12).

```sh
npm ci
npm run dev
```

Open http://localhost:4321. Production verification:

```sh
npm run check
npm run build
npm test
npm run preview
```

## Editing

- Pages: `src/pages/`. Shared structure: `src/layouts/BaseLayout.astro` and `src/components/`.
- Design tokens and shared styles: `src/styles/global.css`.
- Articles: `src/content/blog/*.md`. Keep `slug` stable to preserve `/posts/<slug>/` links. Set `published` and `updated` to explicit ISO timestamps. `hidden: true` omits an article from default listings only; it remains public in archives/search/feed. All current articles are visible.
- Original logo, fonts, images and legacy article assets: `public/`.
- Feed, sitemap and legacy search JSON are generated from the same content collection.

## Publishing

A push to `main` runs GitHub Actions: type check, static build, migration/link tests, then GitHub Pages deployment. Pull requests validate without deploying. GitHub Pages uses the custom domain `outerjoin.be`; `public/CNAME` preserves it.

The previous Jekyll site is in Git history at `8959a0f`. The standalone design prototypes remain in `prototype/`, outside published output. Prototype A was approved for this site.

`public/sw.min.js` retires the old Chirpy service worker and clears only `chirpy-*` caches. Keep this migration file available for returning visitors.

## Content and privacy

The QC interface uses labelled fictional data. Contact actions open email or LinkedIn; this site has no form backend, analytics scripts or tracking cookies. Article text and original publication dates are migrated from the existing blog.
