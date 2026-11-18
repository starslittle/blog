import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { SERIES, type SeriesId } from './consts';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			// Optional series membership; seriesOrder sets the reading order inside it.
			series: z.enum(Object.keys(SERIES) as [SeriesId, ...SeriesId[]]).optional(),
			seriesOrder: z.number().int().positive().optional(),
		}),
});

export const collections = { blog };
