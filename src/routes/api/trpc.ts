/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';

import { AppRoleDefault } from '@/config/constants';
import { prisma } from '@/lib/db';
import type { Context } from 'hono';

import type { OpenApiMeta } from 'trpc-openapi';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: FetchCreateContextFnOptions, c: Context) => {
	// await verifyRequest(c, async () => {});
	// await validateSession(c, async () => {});
	// console.log('createTRPCContext called with:', { opts, c });

	const user = c ? c.get('user') : null;
	const isAdmin = user?.roles?.includes(AppRoleDefault.ADMIN) ?? false;

	return {
		user: user
			? {
					id: user.id,
					isAdmin,
				}
			: null,
		prisma,
		...opts,
	};
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC
	.context<typeof createTRPCContext>()
	.meta<OpenApiMeta>()
	.create({
		transformer: superjson,
		errorFormatter({ shape, error }) {
			return {
				...shape,
				data: {
					...shape.data,
					zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
				},
			};
		},
	});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/lib/api" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure;
/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	// console.log(`protectedProcedure :>>`, { ctx });

	if (!ctx || !ctx.user?.id) {
		throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Login required.' });
	}

	return next();
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.user?.id || !ctx.user?.isAdmin) {
		throw new TRPCError({ code: 'UNAUTHORIZED' });
	}

	return next();
});
