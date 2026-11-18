// Share-card images (the picture shown when a link is posted to WeChat, Twitter, etc.).
// Drawn at build time: satori lays the card out as SVG, sharp turns it into a PNG.
// Fonts come from Google Fonts, subset to just the characters on each card, so the
// build needs network access (Vercel builds have it).
import satori from 'satori';
import sharp from 'sharp';
import { SITE_TITLE } from '../consts';

const C = {
	bg: '#f7f3ea',
	ink: '#1f1b16',
	soft: '#5c554a',
	faint: '#8f8677',
	rule: '#dcd4c2',
	accent: '#c23b22',
	onAccent: '#fbf7ee',
};

const fontCache = new Map<string, Promise<ArrayBuffer>>();

function loadFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
	const chars = [...new Set(text)].join('');
	const key = `${family}:${weight}:${chars}`;
	let font = fontCache.get(key);
	if (!font) {
		font = (async () => {
			const api = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(chars)}`;
			// A plain user agent makes Google answer with TrueType, which satori can read.
			const css = await (await fetch(api, { headers: { 'User-Agent': 'curl' } })).text();
			const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
			if (!url) throw new Error(`share card: no font file for ${family} ${weight}`);
			const res = await fetch(url);
			if (!res.ok) throw new Error(`share card: font download failed (${res.status})`);
			return res.arrayBuffer();
		})();
		fontCache.set(key, font);
	}
	return font;
}

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
	type,
	props: { style, children },
});

export function dateStamp(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
}

/** A 1200×630 PNG with the seal, the site name, a big title and a footer line. */
export async function renderShareCard(title: string, footer: string): Promise<Uint8Array> {
	const len = [...title].length;
	const titleSize = len <= 14 ? 76 : len <= 28 ? 64 : 54;
	const site = 'taotang.me';

	const serifText = '念' + SITE_TITLE + title;
	const sansText = footer + site;
	const [serif, sans] = await Promise.all([
		loadFont('Noto Serif SC', 700, serifText),
		loadFont('Noto Sans SC', 400, sansText),
	]);

	// The paper background is the outer box; the content sits in an absolutely placed
	// inner box so its width is fixed and long titles wrap instead of running off.
	const content = el(
		'div',
		{
			position: 'absolute',
			top: 68,
			left: 102,
			right: 88,
			bottom: 60,
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-between',
		},
		[
			// Seal + site name
			el('div', { display: 'flex', alignItems: 'center' }, [
				el(
					'div',
					{
						width: 64,
						height: 64,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						background: C.accent,
						color: C.onAccent,
						borderRadius: 10,
						fontSize: 42,
						transform: 'rotate(-5deg)',
					},
					'念',
				),
				el('div', { marginLeft: 24, fontSize: 34, color: C.soft }, SITE_TITLE),
			]),
			// Title
			el(
				'div',
				{
					display: 'flex',
					width: '100%',
					fontSize: titleSize,
					lineHeight: 1.3,
					color: C.ink,
				},
				title,
			),
			// Footer
			el(
				'div',
				{
					display: 'flex',
					justifyContent: 'space-between',
					paddingTop: 24,
					borderTop: `2px solid ${C.rule}`,
					fontFamily: 'Sans',
					fontSize: 28,
					color: C.faint,
				},
				[el('div', {}, footer), el('div', {}, site)],
			),
		],
	);
	const card = el(
		'div',
		{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: C.bg, fontFamily: 'Serif' },
		[el('div', { position: 'absolute', top: 0, bottom: 0, left: 0, width: 14, background: C.accent }), content],
	);

	const svg = await satori(card as never, {
		width: 1200,
		height: 630,
		fonts: [
			{ name: 'Serif', data: serif, weight: 700, style: 'normal' },
			{ name: 'Sans', data: sans, weight: 400, style: 'normal' },
		],
	});
	return new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer());
}
