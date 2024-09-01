import { makeSlug } from "diginext-utils/dist/Slug";
import { z } from "zod";

import { getPagination } from "@/api/helper";
import { createTRPCRouter, protectedProcedure } from "@/api/trpc";

export const variantRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().optional(),
        pageSize: z.number().optional(),
        name: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { page = 1, pageSize = 10, name } = input;
      const skip = (page - 1) * pageSize;

      const where = {
        // lemonsqueezyVariants: {
        // 	some: {},
        // },
      } as any;

      if (name) {
        const slug = makeSlug(name);
        where.slug = {
          contains: slug,
          mode: "insensitive",
        };
      }

      const [list, totalCount] = await Promise.all([
        ctx.prisma.lemonsqueezyVariant.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            lemonsqueezyProduct: true,
          },
        }),
        ctx.prisma.lemonsqueezyVariant.count({ where }),
      ]);

      return {
        list,
        pagination: getPagination(page, totalCount, pageSize),
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const lemonsqueezyVariant = await ctx.prisma.lemonsqueezyVariant.update({
        where: { id: input.id },
        data: {
          ...rest,
        },
      });
      return lemonsqueezyVariant;
    }),

  getDetail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const lemonsqueezyVariant =
        await ctx.prisma.lemonsqueezyVariant.findUniqueOrThrow({
          where: {
            id: input.id,
          },
          include: {
            lemonsqueezyProduct: true,
          },
        });
      return lemonsqueezyVariant;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.lemonsqueezyVariant.delete({
        where: { id: input.id },
      });
      return { success: true, message: "Bill deleted successfully" };
    }),
});
