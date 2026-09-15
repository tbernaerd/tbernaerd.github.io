import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    categories: z.array(z.string()),
    tags: z.array(z.string()),
    hidden: z.boolean().default(false),
    image: z
      .object({
        src: z.string(),
        thumbnail: z.string().optional(),
        dark: z
          .object({ src: z.string(), thumbnail: z.string().optional() })
          .optional(),
        alt: z.string(),
      })
      .optional(),
  }),
});
export const collections = { blog };
