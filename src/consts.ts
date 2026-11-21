// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Tao的碎碎念';
export const SITE_DESCRIPTION = '想到什么写什么：工作、技术和生活里的零碎想法。';

// Post series. A post joins one with `series: <id>` and `seriesOrder: <n>` in its frontmatter.
export const SERIES = {
	growth: {
		title: '成长',
		description: '秋招之后，关于背书、能力，以及 AI 时代该怎么成长的一些想法。',
	},
	future: {
		title: '未来视野',
		description: 'AI 和机器人越来越强以后，哪些工作会更值钱，哪些会被替代。',
	},
	claude: {
		title: 'Claude 使用笔记',
		description: '用 Claude 干活时攒下的经验和小工具，也包括它和 Codex 怎么搭配。',
	},
} as const;
export type SeriesId = keyof typeof SERIES;

// Comments via giscus (GitHub Discussions in the blog repo, "Announcements" category,
// so only giscus and the repo owner can open new threads). Needs the giscus GitHub App
// installed on starslittle/blog: https://github.com/apps/giscus
export const GISCUS = {
	enabled: false,
	repo: 'starslittle/blog',
	repoId: 'R_kgDOVpneUw',
	category: 'Announcements',
	categoryId: 'DIC_kwDOVpneU84DLbQa',
} as const;
