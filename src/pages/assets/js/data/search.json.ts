import type { APIRoute } from 'astro';
import { getAllPosts, postUrl } from '../../../../lib/posts';
export const GET: APIRoute = async () => {
  const posts = await getAllPosts();
  return new Response(
    JSON.stringify(
      posts.map((post) => ({
        title: post.data.title,
        url: postUrl(post),
        date: post.data.published.toISOString(),
        description: post.data.description,
        categories: post.data.categories,
        tags: post.data.tags,
        content: (post.body ?? '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
          .replace(/[#*`>|]/g, '')
          .replace(/\s+/g, ' ')
          .trim(),
      })),
    ),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
};
