import { createTRPCRouter, protectedProcedure } from '@/api/trpc';
import { profileType } from '@/modules/type';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { createRoute } from '@hono/zod-openapi';

export const profileRouter = createTRPCRouter({
	apiProfile: protectedProcedure
		.meta({
			openapi: {
				method: 'GET',
				path: '/profile',
				protect: true,
				tags: ['user'],
			},
		})
		.input(z.void())
		.output(z.object({ data: z.any() }))
		.query(({ ctx }) => {
			const data = ctx.user;
			return { data };
		}),
	apiGetUserById: protectedProcedure
		.meta({
			openapi: {
				method: 'GET',
				path: '/user/{id}',
				protect: true,
				tags: ['user'],
			},
		})
		.input(z.object({ id: z.string() }))
		.output(z.object({ data: z.any() }))
		.query(({ ctx, input }) => {
			console.log('input.id :>>', input.id);
			const data = ctx.prisma.user.findUnique({ where: { id: input.id } });
			return { data };
		}),
	getInfo: protectedProcedure.query(async ({ ctx }) => {
		const user = await prisma.user.findUniqueOrThrow({
			where: { id: ctx.user?.id! },
			...profileType,
		});

		const UserRoles = user.UserRoles.map(({ role, ...x }) => {
			return {
				...x,
				...role,
			};
		});

		return { ...user, UserRoles };
	}),
});

export const apiProfileRoute = createRoute({
	method: 'get',
	path: '/profile',
	// path: '/users/{id}',
	request: {
		// params: ParamsSchema,
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: z.object({
						data: z.any(),
					}),
				},
			},
			description: 'Retrieve current authenticated user',
		},
	},
});
