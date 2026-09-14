# Outer Join browser prototypes

Throwaway design exploration. No Astro, npm, build process, database, or SAP/PMX connection.

**Open `index.html` directly in a browser.** The logo, portrait and fonts are embedded; the file works offline. External article, LinkedIn and email links work when used normally.

Alternatively, from the repository directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory prototype
```

Then open http://127.0.0.1:4173/.

## Compare

- `?variant=A`: Connected studio. Integration story and split hero.
- `?variant=B`: Product first. Centered headline and a wide QC illustration.
- `?variant=C`: Studio portfolio. Persistent side navigation and work-led presentation.

Use the floating switcher or left/right arrow keys. The selected variant is stored in the URL; browser back/forward work. The switcher belongs only to this review artifact, not to a production site.

Navigation scrolls to the relevant section. Product/service links open detail views. QC tabs and the batch-release preview change fictional in-memory state. The contact view opens the email client only when its email link is clicked. Blog links open article summaries with links to the original published articles. No messages are sent and no business systems are contacted.

## Review question

Which layout, hierarchy and visual treatment best represents Outer Join as a small integrated-software studio? No variant has been selected yet. Mixing preferred parts is expected; this is not a production migration.

Original logo preserved as an embedded SVG from `outerjoin-admin/layouts/outerjoin.svg`. Portrait from the existing website. Sora and Source Sans 3 fonts are embedded, with their OFL licenses included in the HTML source.

Isolated branch: `prototype/studio-review`, based on website commit `8959a0f`. Existing Jekyll source and deployment workflow remain unchanged. Only the `prototype/` directory is added.

Browser checks: all three layouts at desktop and mobile widths, image/font loading, variant navigation, mobile navigation, product dialog, QC tabs and fictional release interaction. The product interface is explicitly illustrative and is not a screenshot of the current QC application.
