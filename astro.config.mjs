import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://outerjoin.be',
  output: 'static',
  trailingSlash: 'always',
  markdown: { shikiConfig: { theme: 'github-light' } },
});
