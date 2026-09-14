import { getCollection, type CollectionEntry } from 'astro:content';
export type Post = CollectionEntry<'blog'>;
export async function getAllPosts() {
  return (await getCollection('blog')).sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf(),
  );
}
export async function getListedPosts() {
  return (await getAllPosts()).filter((post) => !post.data.hidden);
}
export function postUrl(post: Post) {
  return `/posts/${post.data.slug}/`;
}
export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
export function taxonomySlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
export function taxonomyValues(posts: Post[], kind: 'tags' | 'categories') {
  return [...new Set(posts.flatMap((post) => post.data[kind]))].sort((a, b) =>
    a.localeCompare(b),
  );
}
export function readingMinutes(post: Post) {
  return Math.max(1, Math.ceil((post.body ?? '').split(/\s+/).length / 220));
}
export function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
