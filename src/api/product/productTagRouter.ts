import { z } from "zod";

import { getPagination } from "@/api/helper";
import { createTRPCRouter, protectedProcedure } from "@/api/trpc";
import { generateId } from "lucia";

export const productTagRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const tags = await ctx.prisma.tag.create({
        data: {
          id: generateId(15),
          ...input,
        },
      });
      return tags;
    }),

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

      const where = {} as any;

      if (name) {
        where.name = {
          contains: name,
          mode: "insensitive",
        };
      }

      const [list, totalCount] = await Promise.all([
        ctx.prisma.tag.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: {
            name: "asc",
          },
        }),
        ctx.prisma.tag.count({ where }),
      ]);

      return {
        list,
        pagination: getPagination(page, totalCount, pageSize),
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, ...rest } = input;
      const tags = await ctx.prisma.tag.update({
        where: { id: input.name },
        data: {
          ...rest,
        },
      });
      return tags;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.tag.delete({
        where: { id: input.id },
      });
      return { success: true, message: "Tag deleted successfully" };
    }),
});
