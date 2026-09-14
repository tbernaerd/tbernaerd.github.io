# Astro studio implementation plan

Goal: turn the approved Connected studio prototype (A) into a maintainable static Astro website, preserving the existing blog and legacy URLs.

Design reference: `prototype/index.html?variant=A`; commercial brief: `../luna-commercial/website-redesign.md` in the surrounding knowledge base. User approved A on 2026-09-14. Subsequent explicit instructions authorize publishing to outerjoin.be and unhiding the picking article. This supersedes the earlier local-only restriction.

Architecture: Astro static pages and shared components, local fonts/images, Markdown content collection. The homepage retains A's layout and styling; supporting pages replace prototype modals. The labelled fictional QC illustration remains illustrative, isolated from business systems. Blog pages are rendered as complete articles.

## Tasks

- [x] 1. Establish migration contracts before implementation. Add a Node test against the built site, with an explicit set of legacy routes, assertions for article dates and hidden-post visibility, internal links/assets, and Atom feed identity. Observe failures before the Astro build exists.
- [x] 2. Build the Astro shell and approved homepage. Add package/config files, `src/layouts/BaseLayout.astro`, shared Header/Footer/CTA/Icon/ConnectionScene/QualityIllustration components, extracted local fonts/logo/portrait and responsive styles. Replace prototype modals with normal local navigation.
- [x] 3. Migrate the blog. Preserve all five articles, explicit slugs, dates from the live Atom feed, images, callouts, heading links and metadata. Add insights/search, legacy archives/tags/categories, full article pages, `/feed.xml`, `/sitemap.xml` and the old search JSON route. Unhide the picking article, including it in homepage/latest Insights, archives, search, taxonomies, feed and sitemap as explicitly requested.
- [x] 4. Add commercial pages: solutions, QC, bespoke applications, integrations, OuterForge, about, contact and 404. Use actual experience and precise capability claims; no fabricated customer proof or form submission. Keep email and LinkedIn as working contact routes.
- [x] 5. Replace the old Jekyll deployment definition with Astro validation and GitHub Pages deployment. Preserve the custom domain. Retire the old site's actual service worker through a same-path replacement and scoped cleanup. Publish the verified build as authorized.
- [ ] 6. Verify production build, type checking, route/content/link/metadata contracts and browser interactions at desktop/mobile sizes. Review the complete diff. Publish the verified site through GitHub Actions and verify the live homepage, blog and supporting routes.

## Shared interfaces

- `BaseLayout.astro`: props `title?: string`, `description?: string`, `image?: string`, `noindex?: boolean`. Main content is the default slot; layout includes site header/footer and metadata. Optional `head` slot for article schema.
- `src/lib/posts.ts`: `getAllPosts()` and `getListedPosts()` return sorted blog entries; `postUrl(post)` returns `/posts/${post.data.slug}/`; `formatDate(date)` formats a publication date for readers.
- Blog data: `title`, `description`, `slug`, `published` and `updated` (Date), `categories`/`tags` arrays, `hidden` boolean, optional `image: {src, alt}`.
- Blog components can own their styles; global `.wrap`, `.section`, `.button`, `.text-link`, `.section-note` and heading/body type are available.

## Validation and release boundaries

`npm run check`, `npm run build`, then `npm test`. Browser-check navigation, QC tabs/reset, mobile menu, article search and clear/no-results state, keyboard focus, reduced-motion layout and article readability. Review generated internal links and anchors against the complete static output.

Legacy content is source material, not marketing proof. Remove old Jekyll build scaffolding only after Markdown and assets have been migrated and validated. The prototype remains available in its dedicated local branch as the design reference and is excluded from static output.

Progress and notable decisions are recorded below as work proceeds.

## Progress

- Local branch `feat/astro-studio` created from approved prototype commit `4faa008`. Existing main checkout untouched.
- Live audit confirmed the hidden picking article is public in archives, search, feed, tags and sitemap. Publication date for licensing is 2025-01-09, despite its filename. Astro migration will preserve these observed contracts.

- User explicitly authorized publishing, superseding local-only instruction. Picking article should now be unhidden everywhere.
- All six migration tests failed against the missing build before implementation.

- Astro 7.3.2 static build: 36 HTML pages plus Atom feed, sitemap and search JSON. Eight migration/link/metadata/cache retirement tests passing. Type check has no errors or warnings. Browser verified desktop and 320/390px mobile, menu/Escape, QC tabs with arrow keys, release/reset, search/clear/no results, and all article section anchors against the previous live site.
- Removed Jekyll scaffolding after migration. Original assets retain paths; source is recoverable in Git history. Original Atom feed identity preserved.

- Independent release review found no blockers. Minor contact improvement: carry QC/integration enquiry intent into the email subject. Final production preview also verified search and reduced-motion behavior.
