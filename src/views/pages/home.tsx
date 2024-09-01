import type { FC } from 'hono/jsx';
import type { User } from '@prisma/client';

export const Home: FC<{ user?: User }> = ({ user }) => {
	return (
		<main className="flex-grow relative h-full flex items-center justify-center">
			<div class={`text-center bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 animate-[scale-fade-in_0.5s_ease-out_forwards]`}>
				<div class="h-auto text-center">
					<h1 class="font-bold">Bun + Hono + Prisma + Lucia Auth</h1>
					<div class="flex justify-center my-4">
						<img
							className="rounded-3xl overflow-hidden w-32 h-auto px-4 py-4 bg-white"
							src="icon-300x300.png"
							alt="Bun + Hono + Prisma + Lucia Auth"
						/>
					</div>
					<h2>
						Hi, <strong>{user?.name}</strong>!
					</h2>
					<p>Your user ID is "{user?.id}".</p>
					<form method="post" class="mt-4">
						<button class="py-2 px-6 bg-blue-400 hover:bg-blue-500 transition-all rounded-md text-white">Sign out</button>
					</form>
				</div>
			</div>
		</main>
	);
};
