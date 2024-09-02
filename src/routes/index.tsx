import { Hono, type Context } from 'hono';
import { prisma } from '../lib/db';
import Master from '@/views/master';
import { Home } from '@/views/pages/home';

export const mainRouter = new Hono();

// home
mainRouter.get('/', async (c: Context) => {
	if (!c.get('user')) return c.redirect('/login');

	const user =
		(await prisma.user.findUnique({
			where: { id: c.get('user').id },
		})) || undefined;

	return c.html(
		<Master>
			<Home user={user} />
		</Master>
	);
});
