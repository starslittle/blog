import { type CollectionEntry, getCollection } from 'astro:content';
import type { SeriesId } from '../consts';

/** Posts in a series, in reading order (seriesOrder, then date). */
export async function seriesPosts(id: SeriesId): Promise<CollectionEntry<'blog'>[]> {
	return (await getCollection('blog', (p) => p.data.series === id)).sort(
		(a, b) =>
			(a.data.seriesOrder ?? Infinity) - (b.data.seriesOrder ?? Infinity) ||
			a.data.pubDate.valueOf() - b.data.pubDate.valueOf(),
	);
}
