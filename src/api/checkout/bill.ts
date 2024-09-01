import { z } from 'zod';

import { getPagination } from '@/api/helper';
import { createTRPCRouter, protectedProcedure } from '@/api/trpc';
import createBill from '@/lib/payment/create-bill';
import { TRPCError } from '@trpc/server';

// Assuming Product and relevant models are defined similar to your Workspace model

export const billRouter = createTRPCRouter({
	// List Products
	list: protectedProcedure
		.input(
			z.object({
				// productId: z.string(),
				page: z.number().optional(),
				pageSize: z.number().optional(),
			})
		)
		.query(async ({ input, ctx }) => {
			const { page = 1, pageSize = 10 } = input;
			const skip = (page - 1) * pageSize;

			const where = {
				// productId,
				userId: ctx.user?.id!,
			};
			try {
				const [products, totalCount] = await Promise.all([
					ctx.prisma.bill.findMany({
						where,
						skip,
						take: pageSize,
						orderBy: { createdAt: 'desc' },
						include: {
							paidProducts: true,
							payments: true,
						},
					}),
					ctx.prisma.bill.count({ where }),
				]);

				return {
					list: products,
					pagination: getPagination(page, totalCount, pageSize),
				};
			} catch (error) {
				throw new Error(`Failed to list workspace products: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}),

	getDetail: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			})
		)
		.query(async ({ ctx, input }) => {
			try {
				const { id } = input;
				if (!id) throw new Error('Need Id');

				const item = await ctx.prisma.bill.findUniqueOrThrow({
					where: {
						id,
						userId: ctx.user?.id!,
					},
					include: {
						paidProducts: {
							include: {
								product: {
									include: {
										lemonsqueezyVariants: {
											include: {
												lemonsqueezyProduct: true,
											},
										},
									},
								},
							},
						},
					},
				});
				return item;
			} catch (error) {
				throw new Error(`Failed to Add To Cart: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}),

	create: protectedProcedure
		.input(
			z.object({
				cartIds: z.array(z.string()),
				workspaceId: z.string().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			try {
				const { cartIds, workspaceId } = input;
				if (!cartIds.length) throw new Error('Need Id');

				const user = await ctx.prisma.user.findUnique({
					where: { id: ctx.user?.id },
				});
				if (!user)
					throw new TRPCError({
						code: 'UNAUTHORIZED',
						message: `User not found.`,
					});
				const bill = await createBill({ user, cartIds, workspaceId });

				return bill;
			} catch (error) {
				throw new Error(`Failed to Add To Cart: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}),

	// // Update a Product
	// update: protectedProcedure
	// 	.input(
	// 		z.object({
	// 			id: z.string(),
	// 			images: z.array(z.any()).optional().default([]),
	// 		})
	// 	)
	// 	.mutation(async ({ ctx, input }) => {
	// 		const { id, images, ...data } = input;

	// 		try {
	// 			const res = await Promise.all(
	// 				images?.map(async (x) => {
	// 					return ctx.prisma.metaFile.create({
	// 						data: {
	// 							...x,
	// 							userId: ctx.user?.id!, // Assuming the existence of ctx.user
	// 							productImageId: id,
	// 						},
	// 					});
	// 				})
	// 			);

	// 			const updatedProduct = await ctx.prisma.product.update({
	// 				where: { id },
	// 				data: {
	// 					...data,
	// 					// images: { connect: { id: imageId } },
	// 				},
	// 			});

	// 			return updatedProduct;
	// 		} catch (error) {
	// 			throw new Error(
	// 				`Failed to update workspace product: ${error instanceof Error ? error.message : "Unknown error"}`
	// 			);
	// 		}
	// 	}),

	// // Delete a Product
	// remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
	// 	try {
	// 		await ctx.prisma.product.delete({
	// 			where: { id: input.id },
	// 		});

	// 		await ctx.prisma.metaFile.deleteMany({
	// 			where: {
	// 				productImageId: input.id,
	// 			},
	// 		});

	// 		return { success: true, message: "Workspace product deleted successfully" };
	// 	} catch (error) {
	// 		throw new Error(
	// 			`Failed to delete workspace product: ${error instanceof Error ? error.message : "Unknown error"}`
	// 		);
	// 	}
	// }),
});
