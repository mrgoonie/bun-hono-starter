import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { apiProfileRoute } from './user';
import type { Context } from 'hono';
import { apiHealthzRoute } from './healthz';
import { validateSession, verifyRequest } from '@/lib/auth';
import { z } from 'zod';

export const api = new OpenAPIHono();

api.openapi(apiHealthzRoute, (c) => c.json({ ok: true }));

api.openapi(
	createRoute({
		method: 'get',
		path: '/users/{id}',
		request: {
			params: z.object({
				id: z.string().openapi({
					param: {
						name: 'id',
						in: 'path',
					},
					example: '1212121',
				}),
			}),
		},
		responses: {
			200: {
				content: {
					'application/json': {
						schema: z.any(),
					},
				},
				description: 'Retrieve the user',
			},
		},
	}),
	async (c) => {
		const { id } = c.req.valid('param');
		const data = id ? await prisma?.user.findUnique({ where: { id } }) : null;
		return c.json({ data });
	}
);
api.openapi(apiProfileRoute, async (c: Context) => {
	await verifyRequest(c, async () => {});
	await validateSession(c, async () => {});

	// const { id } = c.req.valid('param');
	const { id } = (c.get('user') || {}) as { id: string };
	const user = id ? await prisma?.user.findUnique({ where: { id } }) : null;
	return c.json({ data: user });
});

// Register the security scheme:
api.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
	type: 'http',
	scheme: 'bearer',
});

// The OpenAPI documentation will be available at /doc
api.doc('/openapi.json', {
	openapi: '3.0.0',
	info: {
		version: '1.0.0',
		title: 'My API',
	},
	security: [{ Bearer: [] }],
});
