import { generateOpenApiDocument, type CreateOpenApiHttpHandlerOptions, type OpenApiRouter } from 'trpc-openapi';
import { appRouter } from './root';
import { env } from '@/env';
import pkg from 'package.json';
import { createOpenApiNodeHttpHandler } from 'trpc-openapi/dist/adapters/node-http/core';
import type { Context, Next } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';

// Generate OpenAPI schema document
export const openApiDocument = generateOpenApiDocument(appRouter, {
	title: env.SITE_TITLE,
	description: 'OpenAPI compliant REST API built using tRPC with Hono',
	version: pkg.version,
	baseUrl: `${env.baseUrl()}/api`,
	docsUrl: `${env.baseUrl()}/api-docs`,
	// tags: ['auth', 'users', 'posts'],
	// securitySchemes: {
	//     apiKey: { name: "X-API-KEY", type: "apiKey", in: "header" },
	// },
});

export const createOpenApiHonoMiddleware = <TRouter extends OpenApiRouter>(
	opts: CreateOpenApiHttpHandlerOptions<TRouter>
) => {
	// let prefix = opts.basePath ?? '';
	let prefix = '/api';

	// if prefix ends with a slash, remove it
	if (prefix.endsWith('/')) prefix = prefix.slice(0, -1);

	const openApiHttpHandler = createOpenApiNodeHttpHandler(opts);

	return async (c: Context) => {
		console.log(`c.get('user') :>>`, c.get('user'));

		const res = {
			statusCode: 200 as StatusCode,
			headers: new Headers(),
			body: null as any,

			status(code: StatusCode) {
				this.statusCode = code;
				return this;
			},

			setHeader(key: string, value: string | number | readonly string[]) {
				if (Array.isArray(value)) {
					value.forEach((v) => this.headers.append(key, v.toString()));
				} else {
					this.headers.set(key, value.toString());
				}
				return this;
			},

			end(body: any) {
				this.body = body;
			},
		};

		// Remove the prefix from the path
		const url = new URL(c.req.url);
		url.pathname = url.pathname.replace(prefix || '', '');
		// console.log(`url :>>`, url);

		const modifiedReq = new Request(url, c.req);

		await openApiHttpHandler(modifiedReq, res);

		// Set the status code
		c.status(res.statusCode);

		// Set the headers
		res.headers.forEach((value, key) => {
			c.header(key, value);
		});

		// Set the body
		if (typeof res.body === 'string') {
			return c.text(res.body);
		} else if (res.body !== null && typeof res.body === 'object') {
			return c.json(res.body);
		}

		// If no body was set, return an empty response
		return c.text('');
	};
};
