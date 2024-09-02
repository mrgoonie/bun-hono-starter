import { Hono } from 'hono';
import { etag } from 'hono/etag';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { trpcServer } from '@hono/trpc-server';

import { verifyRequest, validateSession } from '@/lib/auth';

import { mainRouter } from '@/routes';
import { loginRouter } from '@/routes/login';
import { logoutRouter } from '@/routes/logout';

import type { User, Session } from 'lucia';
import { env } from '@/env';
import { appRouter } from '@/api/root';
import { createTRPCContext } from './api/trpc';
import { swaggerUI } from '@hono/swagger-ui';
import { createOpenApiHonoMiddleware, openApiDocument } from './api/openapi';
import { TRPCError } from '@trpc/server';
import { api } from './api/openapi-zod';

// initialize
const app = new Hono();

// logs
app.use(etag());
app.use(logger());

// CORS
app.use(cors());
app.use(csrf());

// assets
app.use('*', serveStatic({ root: 'public' }));

// auth middleware: verify request origin & validate session
app.use('*', verifyRequest);
app.use('*', validateSession);

// tRPC
app.use(
	'/trpc/*',
	trpcServer({
		router: appRouter,
		createContext: createTRPCContext,
	})
);

// zod openapi swagger
app.route('/', api);
app.get('/api-docs', swaggerUI({ url: '/openapi.json' }));

// Use the middleware to serve Swagger UI at /ui
// app.get('/openapi.json', (c) => c.json(openApiDocument));
// app.get('/api-docs', swaggerUI({ url: '/openapi.json' }));
// app.use(
// 	'/api/*',
// 	createOpenApiHonoMiddleware({
// 		router: appRouter,
// 		createContext: createTRPCContext,
// 		// responseMeta: () => {
// 		// 	// You can customize this function to set response headers if needed
// 		// 	return {
// 		// 		headers: {
// 		// 			'Cache-Control': 'no-cache',
// 		// 			'Content-Type': 'application/json',
// 		// 		},
// 		// 	};
// 		// },
// 		onError: ({ error }) => {
// 			console.error('API error:', error);
// 		},
// 		maxBodySize: 10 * 1024 * 1024, // 10MB, adjust as needed
// 	} as any)
// );

// routes
app.route('/', mainRouter);
app.route('/', loginRouter);
app.route('/', logoutRouter);

// success
console.log(`✅ Server running on port ${env.PORT}`);

declare global {
	namespace Express {
		interface Locals {
			user: User | null;
			session: Session | null;
		}
	}
}

export default {
	port: 3000,
	fetch: app.fetch,
};
