import type { APIRoute } from 'astro';
import {
  getAllPosts,
  postUrl,
  taxonomySlug,
  taxonomyValues,
  xmlEscape,
} from '../lib/posts';
export const GET: APIRoute = async () => {
  const posts = await getAllPosts();
  const routes = [
    '/',
    '/solutions/',
    '/solutions/quality-control/',
    '/solutions/bespoke-applications/',
    '/solutions/integrations/',
    '/outerforge/',
    '/about/',
    '/contact/',
    '/insights/',
    '/archives/',
    '/tags/',
    '/categories/',
  ];
  for (const kind of ['tags', 'categories'] as const)
    routes.push(
      ...taxonomyValues(posts, kind).map(
        (value) => `/${kind}/${taxonomySlug(value)}/`,
      ),
    );
  const urls = routes.map(
    (route) => `<url><loc>https://outerjoin.be${xmlEscape(route)}</loc></url>`,
  );
  urls.push(
    ...posts.map(
      (post) =>
        `<url><loc>https://outerjoin.be${postUrl(post)}</loc><lastmod>${post.data.updated.toISOString()}</lastmod></url>`,
    ),
  );
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
