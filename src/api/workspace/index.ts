import { z } from 'zod';

import { getPagination } from '@/api/helper';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '@/api/trpc';
import generateWorkspaceByUser from '@/api/workspace/generateWorkspaceByUser';
import { generateId } from 'lucia';

const workspaceSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	isPublic: z.boolean().optional(),
});

export const workspaceRouter = createTRPCRouter({
	// List workspaces with optional pagination and filtering
	list: publicProcedure
		.input(
			z.object({
				page: z.number().optional(),
				pageSize: z.number().optional(),
			})
		)
		.query(async ({ input, ctx }) => {
			const page = input.page || 1;
			const pageSize = input.pageSize || 10;
			const skip = (page - 1) * pageSize;

			try {
				const workspaces = await ctx.prisma.workspace.findMany({
					skip,
					take: pageSize,
					include: {
						creator: {
							select: {
								name: true,
								image: true,
							},
						},
					},
				});

				const totalCount = await ctx.prisma.workspace.count();

				return {
					list: workspaces,
					pagination: getPagination(page, totalCount, pageSize),
				};
			} catch (error) {
				throw new Error('Failed to list workspaces');
			}
		}),

	getDetail: protectedProcedure
		.input(
			z.object({
				id: z.string().optional(),
				slug: z.string().optional(),
			})
		)
		.query(async ({ input, ctx }) => {
			try {
				const where = {} as any;
				if (input.id) where.id = input.id;
				if (input.slug) where.slug = input.slug;

				if (!where.id && !where.slug) throw new Error('Need Id or Slug');

				const workspaceDetail = await ctx.prisma.workspace.findUniqueOrThrow({
					where,
					include: {
						creator: {
							select: {
								id: true,
								name: true,
							},
						},
						workspaceRoles: {
							include: {
								WorkspaceRolePermission: {
									include: { workspacePermission: { select: { name: true } } },
								},
							},
						},
						workspaceUserRoles: {
							where: {
								workspaceId: input.id,
							},
							include: {
								user: {
									select: {
										id: true,
										name: true,
										image: true,
										email: true,
									},
								},
								workspaceRole: {
									select: {
										name: true,
									},
								},
							},
						},
						paidProducts: {
							include: {
								product: {
									include: { images: true },
								},
							},
						},
					},
				});

				return workspaceDetail;
			} catch (error) {
				throw new Error(`Workspace details retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}),

	// List Products
	getPaidProduct: protectedProcedure
		.input(
			z.object({
				workspaceId: z.string(),

				page: z.number().optional(),
				pageSize: z.number().optional(),
			})
		)
		.query(async ({ input, ctx }) => {
			const { page = 1, pageSize = 10 } = input;
			const skip = (page - 1) * pageSize;

			const where = {
				workspaceId: input.workspaceId,
			} as any;

			try {
				const [products, totalCount] = await Promise.all([
					ctx.prisma.paidProduct.findMany({
						where,
						skip,
						take: pageSize,
						orderBy: { createdAt: 'desc' },
						include: {
							product: true,
						},
					}),
					ctx.prisma.paidProduct.count({ where }),
				]);

				return {
					list: products,
					pagination: getPagination(page, totalCount, pageSize),
				};
			} catch (error) {
				throw new Error(`Failed to list workspace products: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}),

	inviteByEmail: protectedProcedure
		.input(
			z.object({
				workspaceSlug: z.any(),
				email: z.any(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			try {
				const { email, workspaceSlug } = input;

				// Find the target user by email
				const userTarget = await ctx.prisma.user.findFirst({
					where: { email },
				});

				if (!userTarget) {
					throw new Error('User not found');
				}

				// Retrieve workspace and include roles, specifically looking for the "Viewer" role
				const workspace = await ctx.prisma.workspace.findUniqueOrThrow({
					where: { slug: workspaceSlug },
					include: { workspaceRoles: true },
				});

				// Assuming "View" is a standard role that exists in every workspace
				const viewerRole = workspace.workspaceRoles.find((role) => role.name === 'Viewer');

				if (!viewerRole) {
					throw new Error('Viewer role not found in workspace');
				}

				// Create workspace user role
				await ctx.prisma.workspaceUserRole.create({
					data: {
						id: generateId(15),
						workspaceId: workspace.id,
						userId: userTarget.id,
						workspaceRoleId: viewerRole.id,
					},
				});

				return { success: true };
			} catch (error) {
				console.error('inviteByEmail error:', error);
				throw new Error(`Error inviting user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}),

	// Create a new workspace
	create: protectedProcedure.input(workspaceSchema).mutation(async ({ ctx, input }) => {
		try {
			const user = await ctx.prisma.user.findUniqueOrThrow({
				where: { id: ctx.user?.id! },
			});

			const workspace = await generateWorkspaceByUser(user, input as any);

			return workspace;
		} catch (error) {
			console.error('create error', error);
			throw new Error('Failed to create workspace');
		}
	}),

	// Update a workspace
	update: protectedProcedure
		.input(
			workspaceSchema.extend({
				id: z.string(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;
			try {
				const updatedWorkspace = await ctx.prisma.workspace.update({
					where: { id },
					data,
				});

				return updatedWorkspace;
			} catch (error) {
				console.error('update error', error);
				throw new Error('Failed to update workspace');
			}
		}),

	// Delete a workspace
	remove: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			try {
				await ctx.prisma.workspace.delete({
					where: { id: input.id },
				});

				return { success: true, message: 'Workspace deleted successfully' };
			} catch (error) {
				console.error('delete error', error);
				throw new Error('Failed to delete workspace');
			}
		}),
});
