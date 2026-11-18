// Rough reading time for a Markdown post, in whole minutes (at least 1).
// Chinese is read by character (~400 a minute), English and numbers by word
// (~200 a minute). Code blocks are left out: readers skim them.
export function readingMinutes(markdown: string): number {
	const text = markdown
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/<[^>]+>/g, ' ');
	const cjk = text.match(/[㐀-鿿豈-﫿]/g)?.length ?? 0;
	const words = text.replace(/[㐀-鿿豈-﫿]/g, ' ').match(/[A-Za-z0-9][\w'.-]*/g)?.length ?? 0;
	return Math.max(1, Math.ceil(cjk / 400 + words / 200));
}
