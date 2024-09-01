import type { FC } from 'hono/jsx';

export const Footer: FC = () => {
	return (
		<div class="bg-white dark:bg-gray-800">
			<p class="py-2 pb-3 dark:text-white text-center">
				Copyright {new Date().getFullYear()}. Created by{' '}
				<a href="https://x.com/goon_nguyen" class="dark:text-blue-300">
					@goon_nguyen
				</a>
			</p>
		</div>
	);
};
