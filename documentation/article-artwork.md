# Article artwork

2026-09-15. Generated editorial covers, installed locally. No publication.

## Visual direction

Four realistic photographic covers with varied subjects, lighting and compositions. Retain the database illustration in light and charcoal dark variations. The earlier uniformly blue isometric series felt repetitive.

| Article | Subject | Asset stem |
|---|---|---|
| Picking | Warehouse aisle, orange racks and worker selecting a carton | picking-photo |
| AI tools | Sunlit developer desk, plants, code screens and notebook | ai-photo |
| Database structure | Connected data cabinets and inventory, light/dark variants | database-studio |
| Licensing | Close-up of an operator holding a barcode scanner | licensing-photo |
| Transaction Notification | Protected red control switch, an editorial metaphor for a critical control | notification-photo |

All images are generated editorial artwork. They do not document actual customer premises, people or software screens.

## Files and use

Assets live in `public/assets/heroes/`. Each has a 1600×900 WebP hero and a 640×360 `-thumb.webp` variant. Frontmatter assigns `image.src`, `image.thumbnail` and `image.alt`. The database article also assigns `image.dark.src` and `image.dark.thumbnail`.

`ArticleImage.astro` supplies responsive images for heroes and shared previews. Database artwork follows the site's selected light/dark theme, including System preference and a CSS fallback when JavaScript is unavailable. Social previews retain the light image.

The post page owns its hero wrapper so scoped layout styles apply: 56px below the hero on desktop, 32px on smaller screens, with rounded clipping. Older assets remain for existing references. Source PNGs remain in `/Users/tom/.codex/generated_images/01a09fe6-a846-7f13-9d45-c94a09a54ec2/`.

## Future covers

Choose subjects and photographic treatments suited to each article. Vary scene, camera distance, colour and lighting. Avoid forcing every cover into the website palette. Preserve legibility at thumbnail size and the full 16:9 composition.

Related UI fix: scoped the global icon colour rule in `LabReportPreview.astro` to `.lab-preview`, restoring the Quality demo button's white arrow in both themes.
