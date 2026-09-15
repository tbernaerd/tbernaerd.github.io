# Site themes

Local implementation, 2026-09-14. Not published.

- Footer icon button cycles System, Dark, Light. System is the default; tooltip and accessible name identify the current and next setting.
- `src/scripts/theme.js` is inlined in the shared layout head before page content. It sets the initial palette, persists explicit preferences in `outerjoin-theme`, follows OS changes in System mode, and synchronizes tabs. Blocked storage leaves theme switching usable for the current page.
- `src/styles/theme.css` defines shared color roles and dark overrides. Global and scoped page/component styles use those roles. Brand fills and their foregrounds are separate from link/text colors.
- Without JavaScript, CSS follows the OS preference and hides the nonfunctional theme control.
- Dark mode uses charcoal/near-black surfaces with blue accents. The dark logo variant retains every original path and uses pale lettering, blue outlines and translucent fills without a backing box. Light mode keeps the original SVG. Embedded legacy article diagrams retain a light backing for readability.
- Shiki generates GitHub Light and GitHub Dark syntax palettes. Theme CSS selects the appropriate code colors.

Verified: Astro check, 37-page build, 14 tests; 21 representative routes at 1440px and 320px; persisted selection, OS preference changes, CSS fallback, mobile menu, article search, QC batch-release interaction and code syntax colors. Light and dark screenshots reviewed. No push or deployment.
