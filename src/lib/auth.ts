import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import dotenv from 'dotenv';
import { prisma } from './db.js';
import { Lucia, verifyRequestOrigin } from 'lucia';
import { GitHub, Google } from 'arctic';
import type { MiddlewareHandler } from 'hono';
import { env } from '@/env.js';

dotenv.config();

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const github = new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);

export const google = new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, `${env.baseUrl()}/login/google/callback`);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		// this sets cookies with super long expiration
		expires: false,
		attributes: {
			// set to `true` when using HTTPS
			secure: process.env.NODE_ENV === 'production',
		},
	},
	getUserAttributes: (attributes) => {
		return {
			// attributes has the type of DatabaseUserAttributes
			email: attributes.email,
		};
	},
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof Lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	email: string;
}

export const verifyRequest: MiddlewareHandler = async (c, next) => {
	const { req } = c;
	if (req.method === 'GET') {
		return next();
	}
	const originHeader = req.header('Origin') ?? null;
	const hostHeader = req.header('Host') ?? null;
	if (!originHeader || !hostHeader || !verifyRequestOrigin(originHeader, [hostHeader])) {
		return new Response('', { status: 403 });
	}
	return next();
};

export const validateSession: MiddlewareHandler = async (c, next) => {
	const sessionId = lucia.readSessionCookie(c.req.header('Cookie') ?? '');
	if (!sessionId) {
		c.set('user', null);
		c.set('session', null);
		return next();
	}

	const { session, user } = await lucia.validateSession(sessionId);
	if (session && session.fresh) {
		c.res.headers.set('Set-Cookie', lucia.createSessionCookie(session.id).serialize());
	}
	if (!session) {
		c.res.headers.set('Set-Cookie', lucia.createBlankSessionCookie().serialize());
	}
	c.set('session', session);
	c.set('user', user);
	return next();
};
