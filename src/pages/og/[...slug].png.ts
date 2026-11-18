// Share card for each post: /og/<post-id>.png
import type { APIRoute, GetStaticPaths } from 'astro';
import { type CollectionEntry, getCollection } from 'astro:content';
import { dateStamp, renderShareCard } from '../../utils/og';

export const getStaticPaths = (async () => {
	const posts = await getCollection('blog');
	return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ post: CollectionEntry<'blog'> }> = async ({ props }) => {
	const png = await renderShareCard(props.post.data.title, dateStamp(props.post.data.pubDate));
	return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
