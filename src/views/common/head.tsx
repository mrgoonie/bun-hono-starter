import type { FC } from 'hono/jsx';

export const Head: FC<{ title?: string }> = ({ title }) => {
	return (
		<>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width" />
			<title>{title || 'Home'}</title>

			<link rel="icon" type="image/x-icon" href="/favicon.ico" />

			<link rel="stylesheet" href="css/style.css" />
		</>
	);
};
