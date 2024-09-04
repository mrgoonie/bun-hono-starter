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
import { appRouter } from '@/routes/api/root';
import { createTRPCContext } from '@/routes/api/trpc';
import { swaggerUI } from '@hono/swagger-ui';
import { createOpenApiHonoMiddleware, openApiDocument } from '@/routes/api/openapi';

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

// Swagger UI
app.get('/api-docs', swaggerUI({ url: '/openapi.json' }));

// zod openapi swagger
// app.route('/', api);

// Use the middleware to serve Swagger UI at /ui
app.get('/openapi.json', (c) => c.json(openApiDocument));

// trpc-openapi
app.use(
	'/api/*',
	createOpenApiHonoMiddleware({
		router: appRouter,
		createContext: createTRPCContext,
	} as any)
);

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
