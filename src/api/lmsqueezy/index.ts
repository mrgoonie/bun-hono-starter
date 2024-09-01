import { variantRouter } from '@/api/lmsqueezy/variant';
import { createTRPCRouter } from '@/api/trpc';

export const lmsqueezyRouter = createTRPCRouter({
	variant: variantRouter,
});
