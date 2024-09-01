import { OAuth2RequestError, generateState } from 'arctic';
import { Hono, type Context } from 'hono';
import { google, lucia } from '../../lib/auth';
import { prisma } from '../../lib/db';
import { parseCookies, serializeCookie } from 'oslo/cookie';
import { getCookie, setCookie } from 'hono/cookie';
import { generateId } from 'lucia';
import { randomBytes, createHash } from 'crypto';

interface GoogleUser {
	id: string;
	email: string;
	name: string;
}

function generateCodeVerifier(): string {
	return base64URLEncode(randomBytes(32));
}

function base64URLEncode(buffer: Buffer): string {
	return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Optional:
// Generate code challenge (S256 method)
// This is used if you need to send a code challenge to the authorization server.
export function generateCodeChallenge(verifier: string): string {
	const hash = createHash('sha256').update(verifier).digest();
	return base64URLEncode(hash);
}

export const googleLoginRouter = new Hono();

googleLoginRouter.get('/login/google', async (c) => {
	const state = generateState();
	const codeVerifier = generateCodeVerifier();

	const url = await google.createAuthorizationURL(state, codeVerifier, {
		scopes: ['email', 'profile'],
	});

	setCookie(c, 'google_oauth_state', state, {
		path: '/',
		secure: process.env.NODE_ENV === 'production',
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'Lax',
	});

	setCookie(c, 'google_oauth_code_verifier', codeVerifier, {
		path: '/',
		secure: process.env.NODE_ENV === 'production',
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'Lax',
	});

	return c.redirect(url.toString());
});

googleLoginRouter.get('/login/google/callback', async (c) => {
	const code = c.req.query('code');
	const state = c.req.query('state');

	const storedState = getCookie(c, 'google_oauth_state');
	const codeVerifier = getCookie(c, 'google_oauth_code_verifier');

	console.log('Received callback:', { code, state, storedState, codeVerifier });

	if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
		console.error('Invalid OAuth callback', {
			code,
			state,
			storedState,
			codeVerifier,
		});
		return c.text('Invalid OAuth callback', 400);
	}

	try {
		const tokens = await google.validateAuthorizationCode(code, codeVerifier);

		// Fetch user info
		const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: { Authorization: `Bearer ${tokens.accessToken}` },
		});

		const googleUser = (await userResponse.json()) as GoogleUser;
		console.log('User data:', googleUser);

		console.log('User data:', googleUser);

		const existingAccount = await prisma.account.findUnique({
			where: { providerAccountId: googleUser.id },
		});

		if (existingAccount) {
			const existingUser = await prisma.user.findUnique({
				where: { id: existingAccount.userId },
			});
			if (!existingUser) throw new Error(`User not existed.`);
			const session = await lucia.createSession(existingUser.id, {});

			c.header('Set-Cookie', lucia.createSessionCookie(session.id).serialize());
			return c.redirect('/');
		}

		const userId = generateId(15);
		const user = await prisma.user.create({
			data: {
				id: userId,
				name: googleUser.name,
				email: googleUser.email,
			},
		});
		// create "account" associated with this "user"
		await prisma.account.create({
			data: {
				id: generateId(15),
				userId: user.id,
				provider: 'google',
				providerAccountId: googleUser.id,
			},
		});

		const session = await lucia.createSession(userId, {});
		console.log(`session :>>`, session);

		c.header('Set-Cookie', lucia.createSessionCookie(session.id).serialize());
		return c.redirect('/');
	} catch (error) {
		console.error('Error in Google OAuth callback', error);
		return c.text('Authentication failed', 500);
	}
});
