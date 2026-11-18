// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://taotang.me',
	integrations: [
		// Code blocks: language label, copy button, terminal frame for shell snippets.
		// Must come before mdx(). The light theme is the default; the dark one follows
		// the data-theme attribute that the header toggle sets on <html>.
		expressiveCode({
			themes: ['github-light', 'github-dark'],
			useDarkModeMediaQuery: false,
			themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
			styleOverrides: {
				borderRadius: '8px',
				borderColor: 'var(--rule)',
				codeFontFamily: 'var(--font-mono)',
				codeFontSize: '0.86rem',
				codeLineHeight: '1.65',
				uiFontFamily: 'var(--font-sans)',
				frames: {
					frameBoxShadowCssValue: 'none',
				},
			},
		}),
		mdx(),
		sitemap(),
	],
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
