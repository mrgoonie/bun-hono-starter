import type { FC } from 'hono/jsx';
import { GithubButton } from '@/views/common/github-btn';
import { GoogleButton } from '../common/google-btn';

export const Login: FC<{ class?: string }> = ({ class: className }) => {
	return (
		<main className="flex-grow relative h-full flex items-center justify-center">
			<div class={`text-center bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 ${className}`}>
				<h1 class="font-bold dark:text-white">Sign in</h1>
				<div class="pt-4 flex flex-col gap-2">
					<GithubButton />
					<GoogleButton />
				</div>
			</div>
		</main>
	);
};
