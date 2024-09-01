import { TrackingCodeType } from '@prisma/client';
import { z } from 'zod';

import { getPagination } from '@/api/helper';
import { adminProcedure, createTRPCRouter, publicProcedure } from '@/api/trpc';
import { generateId } from 'lucia';

export const trackingCodeRouter = createTRPCRouter({
	create: adminProcedure
		.input(
			z.object({
				code: z.string(),
				type: z.enum([TrackingCodeType.GA, TrackingCodeType.GTM, TrackingCodeType.FACEBOOK_PIXEL]),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const trackingCode = await ctx.prisma.trackingCode.create({
				data: {
					id: generateId(15),
					...input,
				},
			});
			return trackingCode;
		}),

	list: publicProcedure
		.input(
			z.object({
				page: z.number().optional(),
				pageSize: z.number().optional(),
			})
		)
		.query(async ({ input, ctx }) => {
			const { page = 1, pageSize = 10 } = input;
			const skip = (page - 1) * pageSize;
			const where = {};

			const [list, totalCount] = await Promise.all([
				ctx.prisma.trackingCode.findMany({
					where,
					skip,
					take: pageSize,
					orderBy: { createdAt: 'desc' },
				}),
				ctx.prisma.trackingCode.count({ where }),
			]);

			return {
				list,
				pagination: getPagination(page, totalCount, pageSize),
			};
		}),

	update: adminProcedure
		.input(
			z.object({
				id: z.string(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...rest } = input;
			const trackingCode = await ctx.prisma.trackingCode.update({
				where: { id: input.id },
				data: {
					...rest,
				},
			});
			return trackingCode;
		}),

	getDetail: publicProcedure
		.input(
			z.object({
				id: z.string(),
			})
		)
		.query(async ({ ctx, input }) => {
			const trackingCode = await ctx.prisma.trackingCode.findUniqueOrThrow({
				where: {
					id: input.id,
				},
			});
			return trackingCode;
		}),

	remove: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
		await ctx.prisma.trackingCode.delete({
			where: { id: input.id },
		});
		return { success: true, message: 'trackingCode deleted successfully' };
	}),
});
