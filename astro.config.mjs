// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://blog-ten-gamma-11.vercel.app',
	integrations: [mdx(), sitemap()],
	fonts: [
		{
			// Latin serif for headings and the site title; Chinese falls back to the
			// reader's system Songti/Source Han Serif (see --font-serif in global.css).
			provider: fontProviders.google(),
			name: 'Newsreader',
			cssVariable: '--font-newsreader',
			weights: [400, 600],
			styles: ['normal', 'italic'],
			subsets: ['latin'],
			fallbacks: ['Georgia', 'serif'],
		},
	],
});
