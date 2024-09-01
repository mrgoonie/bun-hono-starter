import { trackingCodeRouter } from '@/api/admin/trackingCode';
import { usersRouter } from '@/api/admin/user';
import { createTRPCRouter } from '@/api/trpc';

export const adminRouter = createTRPCRouter({
	trackingCode: trackingCodeRouter,
	users: usersRouter,
});
