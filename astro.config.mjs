import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://outerjoin.be',
  output: 'static',
  trailingSlash: 'always',
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
});
