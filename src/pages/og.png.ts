// Share card for every page that is not a post (home, list, about): /og.png
import type { APIRoute } from 'astro';
import { SITE_DESCRIPTION } from '../consts';
import { renderShareCard } from '../utils/og';

export const GET: APIRoute = async () => {
	const png = await renderShareCard(SITE_DESCRIPTION, '工作 · 技术 · 生活');
	return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
