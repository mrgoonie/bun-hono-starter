import { createTRPCRouter, publicProcedure } from '@/api/trpc';
import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';

export const healthCheckRouter = createTRPCRouter({
	healthz: publicProcedure
		.meta({
			openapi: {
				method: 'GET',
				path: '/healthz',
			},
		})
		.input(z.void())
		.output(z.object({ ok: z.boolean() }))
		.query(() => ({ ok: true })),
});

export const apiHealthzRoute = createRoute({
	method: 'get',
	path: '/healthz',
	security: [],
	request: {},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: z.object({ ok: z.boolean() }),
				},
			},
			description: 'Retrieve system status',
		},
	},
});
