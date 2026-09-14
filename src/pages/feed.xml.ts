import type { APIRoute } from 'astro';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { getAllPosts, postUrl, xmlEscape } from '../lib/posts';
export const GET: APIRoute = async () => {
  const posts = await getAllPosts();
  const processor = await createMarkdownProcessor();
  const entries = await Promise.all(
    posts.map(async (post) => {
      const url = `https://outerjoin.be${postUrl(post)}`;
      const { code } = await processor.render(post.body ?? '');
      const content = code.replace(
        /(href|src)="\/(?!\/)/g,
        '$1="https://outerjoin.be/',
      );
      return `<entry><title type="html">${xmlEscape(post.data.title)}</title><link href="${url}" rel="alternate" type="text/html"/><id>${url}</id><published>${post.data.published.toISOString()}</published><updated>${post.data.updated.toISOString()}</updated><author><name>Tom Bernaerd</name><uri>https://outerjoin.be/about/</uri></author><summary type="html">${xmlEscape(post.data.description)}</summary><content type="html" xml:base="${url}">${xmlEscape(content)}</content>${post.data.categories.map((category) => `<category term="${xmlEscape(category)}"/>`).join('')}</entry>`;
    }),
  );
  const updated = new Date(
    Math.max(...posts.map((post) => post.data.updated.valueOf())),
  ).toISOString();
  return new Response(
    `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en"><title>Outer Join</title><subtitle>Practical notes on Produmex WMS, SAP Business One and software development.</subtitle><link href="https://outerjoin.be/feed.xml" rel="self" type="application/atom+xml"/><link href="https://outerjoin.be/" rel="alternate" type="text/html"/><id>https://outerjoin.be/</id><updated>${updated}</updated>${entries.join('')}</feed>`,
    { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } },
  );
};
