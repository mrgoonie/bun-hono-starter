import { z } from 'zod';

import { getPagination } from '@/api/helper';
import { createTRPCRouter, protectedProcedure } from '@/api/trpc';
import { generateId } from 'lucia';

// Assuming Product and relevant models are defined similar to your Workspace model

export const cartRouter = createTRPCRouter({
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
					ctx.prisma.cartItem.findMany({
						where,
						skip,
						take: pageSize,
						orderBy: { createdAt: 'desc' },
						include: {
							product: {
								select: {
									id: true,
									name: true,
									slug: true,
									description: true,
									price: true,
									currency: true,
									isActive: true,
								},
							},
						},
					}),
					ctx.prisma.cartItem.count({ where }),
				]);

				return {
					list: products,
					pagination: getPagination(page, totalCount, pageSize),
				};
			} catch (error) {
				throw new Error(
					`Failed to list workspace products: ${error instanceof Error ? error.message : 'Unknown error'}`
				);
			}
		}),

	create: protectedProcedure
		.input(
			z.object({
				productId: z.string(),
				workspaceId: z.string().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			try {
				const { productId, workspaceId } = input;
				if (!productId) throw new Error('Need Product');

				const data = {
					id: generateId(15),
					productId,
					userId: ctx.user?.id!,
				} as any;

				if (workspaceId) data.workspaceId = workspaceId;

				const item = await ctx.prisma.cartItem.create({
					data,
				});

				return item;
			} catch (error) {
				throw new Error(`Failed to Add To Cart: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}),

	// Update a Product
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				images: z.array(z.any()).optional().default([]),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { id, images, ...data } = input;

			try {
				const res = await Promise.all(
					images?.map(async (x) => {
						return ctx.prisma.metaFile.create({
							data: {
								id: generateId(15),
								...x,
								userId: ctx.user?.id!, // Assuming the existence of ctx.user
								productImageId: id,
							},
						});
					})
				);

				const updatedProduct = await ctx.prisma.product.update({
					where: { id },
					data: {
						...data,
						// images: { connect: { id: imageId } },
					},
				});

				return updatedProduct;
			} catch (error) {
				throw new Error(
					`Failed to update workspace product: ${error instanceof Error ? error.message : 'Unknown error'}`
				);
			}
		}),

	// Delete a Product
	remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
		try {
			await ctx.prisma.product.delete({
				where: { id: input.id },
			});

			await ctx.prisma.metaFile.deleteMany({
				where: {
					productImageId: input.id,
				},
			});

			return {
				success: true,
				message: 'Workspace product deleted successfully',
			};
		} catch (error) {
			throw new Error(
				`Failed to delete workspace product: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}),
});
